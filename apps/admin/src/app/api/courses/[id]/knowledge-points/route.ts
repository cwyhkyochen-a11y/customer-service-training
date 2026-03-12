import { NextRequest } from 'next/server';
import { db } from '@cs-training/database';
import { knowledgePoints, courses } from '@cs-training/database';
import { eq, count } from 'drizzle-orm';
import { requireAuth, isErrorResponse, success, error, parsePagination } from '@/lib/api-utils';

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await requireAuth(request, 'admin');
  if (isErrorResponse(auth)) return auth;

  const { id } = await params;
  const courseId = parseInt(id, 10);

  const { searchParams } = new URL(request.url);
  const { page, page_size, offset } = parsePagination(searchParams);

  const [totalResult] = db
    .select({ count: count() })
    .from(knowledgePoints)
    .where(eq(knowledgePoints.course_id, courseId))
    .all();

  const items = db
    .select()
    .from(knowledgePoints)
    .where(eq(knowledgePoints.course_id, courseId))
    .limit(page_size)
    .offset(offset)
    .all()
    .map((kp) => ({ ...kp, node_path: JSON.parse(kp.node_path) }));

  return success({ items, total: totalResult.count, page, page_size });
}

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireAuth(request, 'admin');
  if (isErrorResponse(auth)) return auth;

  const { id } = await params;
  const courseId = parseInt(id, 10);

  try {
    const body = await request.json();
    const { node_path, title, content } = body;

    if (!node_path || !title || !content) {
      return error('node_path, title, content 不能为空');
    }

    const course = db.select().from(courses).where(eq(courses.id, courseId)).get();
    if (!course) return error('课程不存在', 404);

    const result = db
      .insert(knowledgePoints)
      .values({
        course_id: courseId,
        document_id: course.document_id,
        node_path: JSON.stringify(node_path),
        title,
        content,
      })
      .returning()
      .get();

    return success({ ...result, node_path: JSON.parse(result.node_path) }, '创建成功');
  } catch (e: any) {
    return error(e.message || '创建失败', 500);
  }
}
