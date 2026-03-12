import { NextRequest } from 'next/server';
import { db } from '@cs-training/database';
import { practiceRecords, users, courses, virtualCustomers, documents } from '@cs-training/database';
import { eq, count, and } from 'drizzle-orm';
import { requireAuth, isErrorResponse, success, parsePagination } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, 'admin');
  if (isErrorResponse(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const { page, page_size, offset } = parsePagination(searchParams);
  const type = searchParams.get('type');
  const userId = searchParams.get('user_id');

  const conditions = [];
  if (type) conditions.push(eq(practiceRecords.type, type as 'teaching' | 'customer'));
  if (userId) conditions.push(eq(practiceRecords.user_id, parseInt(userId, 10)));

  const where = conditions.length ? and(...conditions) : undefined;

  const [totalResult] = db.select({ count: count() }).from(practiceRecords).where(where).all();

  const items = db
    .select({
      id: practiceRecords.id,
      user_id: practiceRecords.user_id,
      type: practiceRecords.type,
      course_id: practiceRecords.course_id,
      customer_id: practiceRecords.customer_id,
      document_id: practiceRecords.document_id,
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
    .where(where)
    .limit(page_size)
    .offset(offset)
    .all()
    .map((r) => ({
      ...r,
      result_summary: r.result_summary ? JSON.parse(r.result_summary) : null,
    }));

  return success({ items, total: totalResult.count, page, page_size });
}
