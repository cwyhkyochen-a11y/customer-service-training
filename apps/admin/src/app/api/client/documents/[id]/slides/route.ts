import { NextRequest } from 'next/server';
import { db } from '@cs-training/database';
import { documentSlides } from '@cs-training/database';
import { eq } from 'drizzle-orm';
import { requireAuth, isErrorResponse, success } from '@/lib/api-utils';

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await requireAuth(request, 'client');
  if (isErrorResponse(auth)) return auth;

  const { id } = await params;
  const docId = parseInt(id, 10);

  const slides = db
    .select()
    .from(documentSlides)
    .where(eq(documentSlides.document_id, docId))
    .orderBy(documentSlides.page_number)
    .all();

  return success(slides);
}
