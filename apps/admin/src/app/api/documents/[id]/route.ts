import { NextRequest } from 'next/server';
import { db } from '@cs-training/database';
import { documents } from '@cs-training/database';
import { eq } from 'drizzle-orm';
import { requireAuth, isErrorResponse, success, error } from '@/lib/api-utils';
import fs from 'fs';

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await requireAuth(request, 'admin');
  if (isErrorResponse(auth)) return auth;

  const { id } = await params;
  const doc = db.select().from(documents).where(eq(documents.id, parseInt(id, 10))).get();
  if (!doc) return error('文档不存在', 404);

  return success({
    ...doc,
    mindmap_json: doc.mindmap_json ? JSON.parse(doc.mindmap_json) : null,
  });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await requireAuth(request, 'admin');
  if (isErrorResponse(auth)) return auth;

  const { id } = await params;
  const docId = parseInt(id, 10);

  const doc = db.select().from(documents).where(eq(documents.id, docId)).get();
  if (!doc) return error('文档不存在', 404);

  // Delete file from disk
  try {
    if (fs.existsSync(doc.file_path)) {
      fs.unlinkSync(doc.file_path);
    }
  } catch { /* ignore */ }

  db.delete(documents).where(eq(documents.id, docId)).run();

  return success(null, '删除成功');
}
