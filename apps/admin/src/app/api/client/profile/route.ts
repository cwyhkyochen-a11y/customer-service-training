import { NextRequest } from 'next/server';
import { db } from '@cs-training/database';
import {
  documents, courses, knowledgePoints, userKnowledgeProgress,
  virtualCustomers, userCustomerResults, practiceRecords
} from '@cs-training/database';
import { eq, and, sql } from 'drizzle-orm';
import { requireAuth, isErrorResponse, success, error } from '@/lib/api-utils';
import type { DocumentMastery } from '@cs-training/shared';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, 'client');
  if (isErrorResponse(auth)) return auth;

  const userId = auth.user.id;

  try {
    const allDocs = db.select().from(documents).where(eq(documents.status, 'done')).all();

    const documentMasteries: DocumentMastery[] = allDocs.map(doc => {
      // Get all knowledge points for this document
      const kps = db
        .select()
        .from(knowledgePoints)
        .where(eq(knowledgePoints.document_id, doc.id))
        .all();

      const kpTotal = kps.length;

      // Get mastered count
      let kpMastered = 0;
      for (const kp of kps) {
        const progress = db
          .select()
          .from(userKnowledgeProgress)
          .where(
            and(
              eq(userKnowledgeProgress.user_id, userId),
              eq(userKnowledgeProgress.knowledge_point_id, kp.id),
              eq(userKnowledgeProgress.mastered, true)
            )
          )
          .get();
        if (progress) kpMastered++;
      }

      // Get practice stats for this document
      const allResults = db
        .select()
        .from(userCustomerResults)
        .innerJoin(virtualCustomers, eq(userCustomerResults.customer_id, virtualCustomers.id))
        .where(
          and(
            eq(userCustomerResults.user_id, userId),
            eq(virtualCustomers.document_id, doc.id)
          )
        )
        .all();

      const practiceTotal = allResults.length;
      const practiceSuccess = allResults.filter(r => r.user_customer_results.resolved === 1).length;

      return {
        document_id: doc.id,
        document_name: doc.name,
        knowledge_points_total: kpTotal,
        knowledge_points_mastered: kpMastered,
        practice_total: practiceTotal,
        practice_success: practiceSuccess,
      };
    });

    return success({
      user_id: userId,
      username: auth.user.username,
      documents: documentMasteries,
    });
  } catch (e: any) {
    return error(e.message || '获取档案失败', 500);
  }
}
