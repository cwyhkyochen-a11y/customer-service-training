import { NextRequest } from 'next/server';
import { db } from '@cs-training/database';
import { virtualCustomers, documents, userCustomerResults } from '@cs-training/database';
import { eq, count, and } from 'drizzle-orm';
import { requireAuth, isErrorResponse, success, parsePagination } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, 'client');
  if (isErrorResponse(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const { page, page_size, offset } = parsePagination(searchParams);
  const userId = auth.user.id;

  const [totalResult] = db.select({ count: count() }).from(virtualCustomers).all();

  const items = db
    .select({
      id: virtualCustomers.id,
      document_id: virtualCustomers.document_id,
      name: virtualCustomers.name,
      age: virtualCustomers.age,
      gender: virtualCustomers.gender,
      question: virtualCustomers.question,
      scene_type: virtualCustomers.scene_type,
      mood: virtualCustomers.mood,
      created_at: virtualCustomers.created_at,
      document_name: documents.name,
    })
    .from(virtualCustomers)
    .leftJoin(documents, eq(virtualCustomers.document_id, documents.id))
    .limit(page_size)
    .offset(offset)
    .all();

  // Attach resolved status for current user
  const result = items.map((item) => {
    const customerResult = db
      .select()
      .from(userCustomerResults)
      .where(
        and(
          eq(userCustomerResults.user_id, userId),
          eq(userCustomerResults.customer_id, item.id)
        )
      )
      .get();

    return {
      ...item,
      resolved: customerResult?.resolved ?? null,
    };
  });

  return success({ items: result, total: totalResult.count, page, page_size });
}
