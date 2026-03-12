import { NextRequest } from 'next/server';
import { db } from '@cs-training/database';
import { knowledgePoints } from '@cs-training/database';
import { eq } from 'drizzle-orm';
import { requireAuth, isErrorResponse, success, error } from '@/lib/api-utils';

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  const auth = await requireAuth(request, 'admin');
  if (isErrorResponse(auth)) return auth;

  const { id } = await params;
  const kpId = parseInt(id, 10);

  try {
    const body = await request.json();
    const updates: Record<string, any> = {};

    if (body.title !== undefined) updates.title = body.title;
    if (body.content !== undefined) updates.content = body.content;
    if (body.node_path !== undefined) updates.node_path = JSON.stringify(body.node_path);

    if (Object.keys(updates).length === 0) return error('没有要更新的字段');
    updates.updated_at = new Date().toISOString();

    const result = db
      .update(knowledgePoints)
      .set(updates)
      .where(eq(knowledgePoints.id, kpId))
      .returning()
      .get();
    if (!result) return error('知识点不存在', 404);

    return success({ ...result, node_path: JSON.parse(result.node_path) }, '更新成功');
  } catch (e: any) {
    return error(e.message || '更新失败', 500);
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await requireAuth(request, 'admin');
  if (isErrorResponse(auth)) return auth;

  const { id } = await params;
  const kpId = parseInt(id, 10);

  const result = db.delete(knowledgePoints).where(eq(knowledgePoints.id, kpId)).returning().get();
  if (!result) return error('知识点不存在', 404);

  return success(null, '删除成功');
}
