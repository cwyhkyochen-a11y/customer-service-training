import { NextRequest } from 'next/server';
import { db } from '@cs-training/database';
import { courses, documents, knowledgePoints } from '@cs-training/database';
import { eq, count, sql } from 'drizzle-orm';
import { requireAuth, isErrorResponse, success, error, parsePagination } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, 'admin');
  if (isErrorResponse(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const { page, page_size, offset } = parsePagination(searchParams);

  const [totalResult] = db.select({ count: count() }).from(courses).all();

  const items = db
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
    .limit(page_size)
    .offset(offset)
    .all();

  // Attach knowledge point counts
  const result = items.map((item) => {
    const [kpCount] = db
      .select({ count: count() })
      .from(knowledgePoints)
      .where(eq(knowledgePoints.course_id, item.id))
      .all();
    return { ...item, knowledge_point_count: kpCount.count };
  });

  return success({ items: result, total: totalResult.count, page, page_size });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, 'admin');
  if (isErrorResponse(auth)) return auth;

  try {
    const body = await request.json();
    const { document_id, name, description } = body;

    if (!document_id || !name) {
      return error('document_id 和 name 不能为空');
    }

    const doc = db.select().from(documents).where(eq(documents.id, document_id)).get();
    if (!doc) return error('文档不存在');

    const result = db
      .insert(courses)
      .values({ document_id, name, description: description || null })
      .returning()
      .get();

    return success(result, '创建成功');
  } catch (e: any) {
    return error(e.message || '创建失败', 500);
  }
}
