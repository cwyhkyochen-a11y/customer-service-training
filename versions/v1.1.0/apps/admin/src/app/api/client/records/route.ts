import { NextRequest } from 'next/server';
import { db } from '@cs-training/database';
import { practiceRecords, courses, virtualCustomers, documents } from '@cs-training/database';
import { eq, desc } from 'drizzle-orm';
import { requireAuth, isErrorResponse, success, error, parsePagination } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, 'client');
  if (isErrorResponse(auth)) return auth;

  const userId = auth.user.id;
  const searchParams = request.nextUrl.searchParams;
  const { page, page_size, offset } = parsePagination(searchParams);
  const type = searchParams.get('type'); // 'teaching' | 'customer'

  try {
    let query = db.select().from(practiceRecords).where(eq(practiceRecords.user_id, userId));

    const allRecords = db
      .select()
      .from(practiceRecords)
      .where(eq(practiceRecords.user_id, userId))
      .all();

    const filtered = type ? allRecords.filter(r => r.type === type) : allRecords;
    const total = filtered.length;
    const paged = filtered
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(offset, offset + page_size);

    // Enrich with names
    const enriched = paged.map(record => {
      const doc = db.select().from(documents).where(eq(documents.id, record.document_id)).get();
      let courseName = null;
      let customerName = null;

      if (record.course_id) {
        const course = db.select().from(courses).where(eq(courses.id, record.course_id)).get();
        courseName = course?.name || null;
      }
      if (record.customer_id) {
        const customer = db.select().from(virtualCustomers).where(eq(virtualCustomers.id, record.customer_id)).get();
        customerName = customer?.name || null;
      }

      return {
        ...record,
        chat_history: undefined, // Don't send full history in list
        document_name: doc?.name || null,
        course_name: courseName,
        customer_name: customerName,
      };
    });

    return success({
      items: enriched,
      total,
      page,
      page_size,
    });
  } catch (e: any) {
    return error(e.message || '获取记录失败', 500);
  }
}
