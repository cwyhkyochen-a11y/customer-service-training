import { NextRequest } from 'next/server';
import { db } from '@cs-training/database';
import { documents, documentSlides } from '@cs-training/database';
import { count, eq, sql } from 'drizzle-orm';
import { requireAuth, isErrorResponse, success, parsePagination } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, 'admin');
  if (isErrorResponse(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const { page, page_size, offset } = parsePagination(searchParams);

  const [totalResult] = db.select({ count: count() }).from(documents).all();
  const items = db
    .select({
      id: documents.id,
      name: documents.name,
      file_type: documents.file_type,
      status: documents.status,
      created_at: documents.created_at,
      updated_at: documents.updated_at,
      slide_count: sql<number>`(SELECT COUNT(*) FROM document_slides WHERE document_slides.document_id = ${documents.id})`.as('slide_count'),
    })
    .from(documents)
    .limit(page_size)
    .offset(offset)
    .all();

  return success({ items, total: totalResult.count, page, page_size });
}
