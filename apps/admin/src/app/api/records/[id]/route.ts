import { NextRequest } from 'next/server';
import { db } from '@cs-training/database';
import { practiceRecords, users, courses, virtualCustomers, documents } from '@cs-training/database';
import { eq } from 'drizzle-orm';
import { requireAuth, isErrorResponse, success, error } from '@/lib/api-utils';

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await requireAuth(request, 'admin');
  if (isErrorResponse(auth)) return auth;

  const { id } = await params;
  const recordId = parseInt(id, 10);

  const record = db
    .select({
      id: practiceRecords.id,
      user_id: practiceRecords.user_id,
      type: practiceRecords.type,
      course_id: practiceRecords.course_id,
      customer_id: practiceRecords.customer_id,
      document_id: practiceRecords.document_id,
      chat_history: practiceRecords.chat_history,
      status: practiceRecords.status,
      result_summary: practiceRecords.result_summary,
      created_at: practiceRecords.created_at,
      updated_at: practiceRecords.updated_at,
      username: users.username,
      document_name: documents.name,
    })
    .from(practiceRecords)
    .leftJoin(users, eq(practiceRecords.user_id, users.id))
    .leftJoin(documents, eq(practiceRecords.document_id, documents.id))
    .where(eq(practiceRecords.id, recordId))
    .get();

  if (!record) return error('记录不存在', 404);

  // Get course/customer names
  let course_name = null;
  let customer_name = null;
  if (record.course_id) {
    const c = db.select({ name: courses.name }).from(courses).where(eq(courses.id, record.course_id)).get();
    course_name = c?.name || null;
  }
  if (record.customer_id) {
    const c = db.select({ name: virtualCustomers.name }).from(virtualCustomers).where(eq(virtualCustomers.id, record.customer_id)).get();
    customer_name = c?.name || null;
  }

  return success({
    ...record,
    chat_history: JSON.parse(record.chat_history),
    result_summary: record.result_summary ? JSON.parse(record.result_summary) : null,
    course_name,
    customer_name,
  });
}
