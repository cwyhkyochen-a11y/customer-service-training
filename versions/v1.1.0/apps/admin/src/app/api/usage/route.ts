import { NextRequest } from 'next/server';
import { db } from '@cs-training/database';
import { llmUsageLogs, users } from '@cs-training/database';
import { sql, and, gte, lte, eq, count, sum } from 'drizzle-orm';
import { requireAuth, isErrorResponse, success, parsePagination } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, 'admin');
  if (isErrorResponse(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const { page, page_size, offset } = parsePagination(searchParams);
  const startDate = searchParams.get('start_date');
  const endDate = searchParams.get('end_date');
  const scene = searchParams.get('scene');
  const status = searchParams.get('status');
  const modelName = searchParams.get('model_name');
  const view = searchParams.get('view');

  const conditions = [];
  if (startDate) conditions.push(gte(llmUsageLogs.created_at, startDate));
  if (endDate) conditions.push(lte(llmUsageLogs.created_at, endDate + ' 23:59:59'));
  if (scene) conditions.push(eq(llmUsageLogs.scene, scene));
  if (status) conditions.push(eq(llmUsageLogs.status, status as 'success' | 'failed'));
  if (modelName) conditions.push(eq(llmUsageLogs.model_name, modelName));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  // 获取所有用过的模型名（用于前端筛选下拉）
  if (view === 'models') {
    const rows = db.selectDistinct({ model_name: llmUsageLogs.model_name })
      .from(llmUsageLogs).all();
    return success(rows.map(r => r.model_name));
  }

  if (view === 'summary') {
    const [result] = db.select({
      total_calls: count(),
      success_calls: sum(sql`CASE WHEN ${llmUsageLogs.status} = 'success' THEN 1 ELSE 0 END`),
      failed_calls: sum(sql`CASE WHEN ${llmUsageLogs.status} = 'failed' THEN 1 ELSE 0 END`),
      total_prompt_tokens: sum(llmUsageLogs.prompt_tokens),
      total_completion_tokens: sum(llmUsageLogs.completion_tokens),
      total_tokens: sum(llmUsageLogs.total_tokens),
      total_cost: sum(llmUsageLogs.cost),
      avg_duration: sql<number>`AVG(${llmUsageLogs.duration_ms})`,
    }).from(llmUsageLogs).where(where).all();

    return success({
      total_calls: result.total_calls || 0,
      success_calls: Number(result.success_calls) || 0,
      failed_calls: Number(result.failed_calls) || 0,
      total_prompt_tokens: Number(result.total_prompt_tokens) || 0,
      total_completion_tokens: Number(result.total_completion_tokens) || 0,
      total_tokens: Number(result.total_tokens) || 0,
      total_cost: Number(result.total_cost) || 0,
      avg_duration: Math.round(Number(result.avg_duration) || 0),
    });
  }

  if (view === 'by_scene') {
    const rows = db.select({
      scene: llmUsageLogs.scene,
      total_calls: count(),
      success_calls: sum(sql`CASE WHEN ${llmUsageLogs.status} = 'success' THEN 1 ELSE 0 END`),
      failed_calls: sum(sql`CASE WHEN ${llmUsageLogs.status} = 'failed' THEN 1 ELSE 0 END`),
      total_tokens: sum(llmUsageLogs.total_tokens),
      total_cost: sum(llmUsageLogs.cost),
      avg_duration: sql<number>`AVG(${llmUsageLogs.duration_ms})`,
    }).from(llmUsageLogs).where(where)
      .groupBy(llmUsageLogs.scene).all();

    return success(rows.map(r => ({
      scene: r.scene,
      total_calls: r.total_calls,
      success_calls: Number(r.success_calls) || 0,
      failed_calls: Number(r.failed_calls) || 0,
      total_tokens: Number(r.total_tokens) || 0,
      total_cost: Number(r.total_cost) || 0,
      avg_duration: Math.round(Number(r.avg_duration) || 0),
    })));
  }

  if (view === 'by_day') {
    const rows = db.select({
      date: sql<string>`DATE(${llmUsageLogs.created_at})`.as('date'),
      total_calls: count(),
      success_calls: sum(sql`CASE WHEN ${llmUsageLogs.status} = 'success' THEN 1 ELSE 0 END`),
      failed_calls: sum(sql`CASE WHEN ${llmUsageLogs.status} = 'failed' THEN 1 ELSE 0 END`),
      total_tokens: sum(llmUsageLogs.total_tokens),
      total_cost: sum(llmUsageLogs.cost),
    }).from(llmUsageLogs).where(where)
      .groupBy(sql`DATE(${llmUsageLogs.created_at})`)
      .orderBy(sql`DATE(${llmUsageLogs.created_at}) DESC`).all();

    return success(rows.map(r => ({
      date: r.date,
      total_calls: r.total_calls,
      success_calls: Number(r.success_calls) || 0,
      failed_calls: Number(r.failed_calls) || 0,
      total_tokens: Number(r.total_tokens) || 0,
      total_cost: Number(r.total_cost) || 0,
    })));
  }

  // Default: list view — LEFT JOIN users to get username
  const [totalResult] = db.select({ count: count() }).from(llmUsageLogs).where(where).all();
  const items = db.select({
    id: llmUsageLogs.id,
    scene: llmUsageLogs.scene,
    model_name: llmUsageLogs.model_name,
    provider: llmUsageLogs.provider,
    status: llmUsageLogs.status,
    prompt_tokens: llmUsageLogs.prompt_tokens,
    completion_tokens: llmUsageLogs.completion_tokens,
    total_tokens: llmUsageLogs.total_tokens,
    cost: llmUsageLogs.cost,
    duration_ms: llmUsageLogs.duration_ms,
    error_message: llmUsageLogs.error_message,
    user_id: llmUsageLogs.user_id,
    username: users.username,
    document_id: llmUsageLogs.document_id,
    created_at: llmUsageLogs.created_at,
  }).from(llmUsageLogs)
    .leftJoin(users, eq(llmUsageLogs.user_id, users.id))
    .where(where)
    .orderBy(sql`${llmUsageLogs.created_at} DESC`)
    .limit(page_size)
    .offset(offset)
    .all();

  return success({ items, total: totalResult.count, page, page_size });
}
