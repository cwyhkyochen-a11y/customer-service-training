import { NextRequest } from 'next/server';
import { db } from '@cs-training/database';
import { documents } from '@cs-training/database';
import { eq } from 'drizzle-orm';
import { requireAuth, isErrorResponse, success, error } from '@/lib/api-utils';

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await requireAuth(request, 'client');
  if (isErrorResponse(auth)) return auth;

  const { id } = await params;
  const doc = db.select().from(documents).where(eq(documents.id, parseInt(id, 10))).get();
  if (!doc) return error('文档不存在', 404);
  if (!doc.mindmap_json) return error('思维导图尚未生成', 404);

  return success(JSON.parse(doc.mindmap_json));
}
