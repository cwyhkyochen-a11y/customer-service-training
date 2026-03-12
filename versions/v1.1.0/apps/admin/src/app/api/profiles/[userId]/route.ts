import { NextRequest } from 'next/server';
import { db } from '@cs-training/database';
import {
  users, documents, knowledgePoints, userKnowledgeProgress,
  practiceRecords, userCustomerResults,
} from '@cs-training/database';
import { eq, and, count, sql } from 'drizzle-orm';
import { requireAuth, isErrorResponse, success, error } from '@/lib/api-utils';
import type { DocumentMastery } from '@cs-training/shared';

type Params = { params: Promise<{ userId: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await requireAuth(request, 'admin');
  if (isErrorResponse(auth)) return auth;

  const { userId: userIdStr } = await params;
  const userId = parseInt(userIdStr, 10);

  const user = db.select().from(users).where(eq(users.id, userId)).get();
  if (!user) return error('用户不存在', 404);

  // Get all documents
  const docs = db.select().from(documents).all();

  const documentMasteries: DocumentMastery[] = docs.map((doc) => {
    // Total knowledge points for this document
    const [kpTotal] = db
      .select({ count: count() })
      .from(knowledgePoints)
      .where(eq(knowledgePoints.document_id, doc.id))
      .all();

    // Mastered knowledge points
    const masteredKps = db
      .select({ count: count() })
      .from(userKnowledgeProgress)
      .innerJoin(knowledgePoints, eq(userKnowledgeProgress.knowledge_point_id, knowledgePoints.id))
      .where(
        and(
          eq(userKnowledgeProgress.user_id, userId),
          eq(userKnowledgeProgress.mastered, true),
          eq(knowledgePoints.document_id, doc.id)
        )
      )
      .all();

    // Total practice records for this document
    const [practiceTotal] = db
      .select({ count: count() })
      .from(practiceRecords)
      .where(
        and(
          eq(practiceRecords.user_id, userId),
          eq(practiceRecords.document_id, doc.id)
        )
      )
      .all();

    // Successful practices (customer resolved)
    const [practiceSuccess] = db
      .select({ count: count() })
      .from(userCustomerResults)
      .where(
        and(
          eq(userCustomerResults.user_id, userId),
          eq(userCustomerResults.resolved, 1)
        )
      )
      .all();

    return {
      document_id: doc.id,
      document_name: doc.name,
      knowledge_points_total: kpTotal.count,
      knowledge_points_mastered: masteredKps[0]?.count || 0,
      practice_total: practiceTotal.count,
      practice_success: practiceSuccess.count,
    };
  });

  return success({
    user_id: user.id,
    username: user.username,
    documents: documentMasteries,
  });
}
