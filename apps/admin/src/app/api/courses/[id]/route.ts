import { NextRequest } from 'next/server';
import { db } from '@cs-training/database';
import { courses, documents, knowledgePoints } from '@cs-training/database';
import { eq, count } from 'drizzle-orm';
import { requireAuth, isErrorResponse, success, error } from '@/lib/api-utils';

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await requireAuth(request, 'admin');
  if (isErrorResponse(auth)) return auth;

  const { id } = await params;
  const courseId = parseInt(id, 10);

  const course = db
    .select({
      id: courses.id,
      document_id: courses.document_id,
      name: courses.name,
      description: courses.description,
      created_at: courses.created_at,
      updated_at: courses.updated_at,
      document_name: documents.name,
    })
    .from(courses)
    .leftJoin(documents, eq(courses.document_id, documents.id))
    .where(eq(courses.id, courseId))
    .get();

  if (!course) return error('课程不存在', 404);

  const kps = db
    .select()
    .from(knowledgePoints)
    .where(eq(knowledgePoints.course_id, courseId))
    .all()
    .map((kp) => ({ ...kp, node_path: JSON.parse(kp.node_path) }));

  return success({ ...course, knowledge_points: kps });
}

export async function PUT(request: NextRequest, { params }: Params) {
  const auth = await requireAuth(request, 'admin');
  if (isErrorResponse(auth)) return auth;

  const { id } = await params;
  const courseId = parseInt(id, 10);

  try {
    const body = await request.json();
    const updates: Record<string, any> = {};

    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;

    if (Object.keys(updates).length === 0) return error('没有要更新的字段');
    updates.updated_at = new Date().toISOString();

    const result = db.update(courses).set(updates).where(eq(courses.id, courseId)).returning().get();
    if (!result) return error('课程不存在', 404);

    return success(result, '更新成功');
  } catch (e: any) {
    return error(e.message || '更新失败', 500);
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await requireAuth(request, 'admin');
  if (isErrorResponse(auth)) return auth;

  const { id } = await params;
  const courseId = parseInt(id, 10);

  const result = db.delete(courses).where(eq(courses.id, courseId)).returning().get();
  if (!result) return error('课程不存在', 404);

  return success(null, '删除成功');
}
