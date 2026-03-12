import { NextRequest } from 'next/server';
import { db } from '@cs-training/database';
import { virtualCustomers, documents } from '@cs-training/database';
import { eq, count } from 'drizzle-orm';
import { requireAuth, isErrorResponse, success, error, parsePagination } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, 'admin');
  if (isErrorResponse(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const { page, page_size, offset } = parsePagination(searchParams);

  const [totalResult] = db.select({ count: count() }).from(virtualCustomers).all();

  const items = db
    .select({
      id: virtualCustomers.id,
      document_id: virtualCustomers.document_id,
      node_path: virtualCustomers.node_path,
      name: virtualCustomers.name,
      age: virtualCustomers.age,
      gender: virtualCustomers.gender,
      demand: virtualCustomers.demand,
      mood: virtualCustomers.mood,
      persona_prompt: virtualCustomers.persona_prompt,
      created_at: virtualCustomers.created_at,
      updated_at: virtualCustomers.updated_at,
      document_name: documents.name,
    })
    .from(virtualCustomers)
    .leftJoin(documents, eq(virtualCustomers.document_id, documents.id))
    .limit(page_size)
    .offset(offset)
    .all()
    .map((item) => ({
      ...item,
      node_path: JSON.parse(item.node_path),
    }));

  return success({ items, total: totalResult.count, page, page_size });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, 'admin');
  if (isErrorResponse(auth)) return auth;

  try {
    const body = await request.json();
    const { document_id, node_path, name, age, gender, demand, mood, persona_prompt } = body;

    if (!document_id || !node_path || !name || !demand || !mood || !persona_prompt) {
      return error('必填字段不能为空');
    }

    const doc = db.select().from(documents).where(eq(documents.id, document_id)).get();
    if (!doc) return error('文档不存在');

    const result = db
      .insert(virtualCustomers)
      .values({
        document_id,
        node_path: JSON.stringify(node_path),
        name,
        age,
        gender,
        demand,
        mood,
        persona_prompt,
      })
      .returning()
      .get();

    return success({ ...result, node_path: JSON.parse(result.node_path) }, '创建成功');
  } catch (e: any) {
    return error(e.message || '创建失败', 500);
  }
}
