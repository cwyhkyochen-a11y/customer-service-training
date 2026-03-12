import { NextRequest } from 'next/server';
import { db } from '@cs-training/database';
import { documents } from '@cs-training/database';
import { eq, count } from 'drizzle-orm';
import { requireAuth, isErrorResponse, success, parsePagination } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, 'client');
  if (isErrorResponse(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const { page, page_size, offset } = parsePagination(searchParams);

  const [totalResult] = db
    .select({ count: count() })
    .from(documents)
    .where(eq(documents.status, 'done'))
    .all();

  const items = db
    .select({
      id: documents.id,
      name: documents.name,
      file_type: documents.file_type,
      status: documents.status,
      created_at: documents.created_at,
    })
    .from(documents)
    .where(eq(documents.status, 'done'))
    .limit(page_size)
    .offset(offset)
    .all();

  return success({ items, total: totalResult.count, page, page_size });
}
