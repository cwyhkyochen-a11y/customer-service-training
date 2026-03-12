import { NextRequest } from 'next/server';
import { db } from '@cs-training/database';
import {
  practiceRecords, courses, knowledgePoints, userKnowledgeProgress,
  documents, userCustomerResults, virtualCustomers
} from '@cs-training/database';
import { eq, and, sql } from 'drizzle-orm';
import { requireAuth, isErrorResponse, success, error } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, 'client');
  if (isErrorResponse(auth)) return auth;

  const userId = auth.user.id;

  try {
    // 练习记录总数
    const allRecords = db
      .select()
      .from(practiceRecords)
      .where(eq(practiceRecords.user_id, userId))
      .all();

    const teachingCount = allRecords.filter(r => r.type === 'teaching').length;
    const customerCount = allRecords.filter(r => r.type === 'customer').length;

    // 今天练习了几次
    const today = new Date().toISOString().slice(0, 10);
    const todayCount = allRecords.filter(r => r.created_at?.startsWith(today)).length;

    // 知识点掌握情况
    const allDocs = db.select().from(documents).where(eq(documents.status, 'done')).all();
    let totalKP = 0;
    let masteredKP = 0;
    for (const doc of allDocs) {
      const kps = db.select().from(knowledgePoints).where(eq(knowledgePoints.document_id, doc.id)).all();
      totalKP += kps.length;
      for (const kp of kps) {
        const progress = db.select().from(userKnowledgeProgress).where(
          and(
            eq(userKnowledgeProgress.user_id, userId),
            eq(userKnowledgeProgress.knowledge_point_id, kp.id),
            eq(userKnowledgeProgress.mastered, true)
          )
        ).get();
        if (progress) masteredKP++;
      }
    }

    // 虚拟顾客对练成功率
    const allResults = db
      .select()
      .from(userCustomerResults)
      .where(eq(userCustomerResults.user_id, userId))
      .all();
    const customerSuccess = allResults.filter(r => r.resolved === 1).length;

    // 最近一次练习
    const lastRecord = allRecords.length > 0
      ? allRecords.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
      : null;

    let lastDocName = null;
    if (lastRecord) {
      const doc = db.select().from(documents).where(eq(documents.id, lastRecord.document_id)).get();
      lastDocName = doc?.name || null;
    }

    return success({
      total_records: allRecords.length,
      teaching_count: teachingCount,
      customer_count: customerCount,
      today_count: todayCount,
      knowledge_total: totalKP,
      knowledge_mastered: masteredKP,
      customer_success: customerSuccess,
      customer_total: allResults.length,
      document_count: allDocs.length,
      last_record: lastRecord ? {
        type: lastRecord.type,
        created_at: lastRecord.created_at,
        document_name: lastDocName,
      } : null,
    });
  } catch (e: any) {
    return error(e.message || '获取统计失败', 500);
  }
}
