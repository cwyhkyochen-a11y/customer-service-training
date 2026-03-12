import { NextRequest } from 'next/server';
import { db } from '@cs-training/database';
import { courses, documents, knowledgePoints, userKnowledgeProgress } from '@cs-training/database';
import { eq, count, and } from 'drizzle-orm';
import { requireAuth, isErrorResponse, success, parsePagination } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, 'client');
  if (isErrorResponse(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const { page, page_size, offset } = parsePagination(searchParams);
  const userId = auth.user.id;

  const [totalResult] = db.select({ count: count() }).from(courses).all();

  const items = db
    .select({
      id: courses.id,
      document_id: courses.document_id,
      name: courses.name,
      description: courses.description,
      created_at: courses.created_at,
      document_name: documents.name,
    })
    .from(courses)
    .leftJoin(documents, eq(courses.document_id, documents.id))
    .limit(page_size)
    .offset(offset)
    .all();

  // Attach progress for current user
  const result = items.map((item) => {
    const [kpTotal] = db
      .select({ count: count() })
      .from(knowledgePoints)
      .where(eq(knowledgePoints.course_id, item.id))
      .all();

    const [kpMastered] = db
      .select({ count: count() })
      .from(userKnowledgeProgress)
      .where(
        and(
          eq(userKnowledgeProgress.user_id, userId),
          eq(userKnowledgeProgress.course_id, item.id),
          eq(userKnowledgeProgress.mastered, true)
        )
      )
      .all();

    return {
      ...item,
      knowledge_point_count: kpTotal.count,
      mastered_count: kpMastered.count,
    };
  });

  return success({ items: result, total: totalResult.count, page, page_size });
}
