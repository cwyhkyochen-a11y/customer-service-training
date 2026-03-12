import { NextRequest } from 'next/server';
import { db } from '@cs-training/database';
import { documents } from '@cs-training/database';
import { eq } from 'drizzle-orm';
import { requireAuth, isErrorResponse, success, error } from '@/lib/api-utils';
import { parseFile } from '@/lib/file-parser';
import { generateMindmap } from '@/lib/ai';

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await requireAuth(request, 'admin');
  if (isErrorResponse(auth)) return auth;

  const { id } = await params;
  const doc = db.select().from(documents).where(eq(documents.id, parseInt(id, 10))).get();
  if (!doc) return error('文档不存在', 404);

  if (!doc.mindmap_json) {
    return error('思维导图尚未生成', 404);
  }

  return success(JSON.parse(doc.mindmap_json));
}

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireAuth(request, 'admin');
  if (isErrorResponse(auth)) return auth;

  const { id } = await params;
  const docId = parseInt(id, 10);
  const doc = db.select().from(documents).where(eq(documents.id, docId)).get();
  if (!doc) return error('文档不存在', 404);

  // Set status to processing
  db.update(documents)
    .set({ status: 'processing', updated_at: new Date().toISOString() })
    .where(eq(documents.id, docId))
    .run();

  // Async regenerate
  (async () => {
    try {
      const text = await parseFile(doc.file_path, doc.file_type as 'excel' | 'doc');
      const mindmap = await generateMindmap(text);
      db.update(documents)
        .set({
          mindmap_json: JSON.stringify(mindmap),
          status: 'done',
          updated_at: new Date().toISOString(),
        })
        .where(eq(documents.id, docId))
        .run();
    } catch (e: any) {
      db.update(documents)
        .set({ status: 'failed', updated_at: new Date().toISOString() })
        .where(eq(documents.id, docId))
        .run();
      console.error('Mindmap regeneration failed:', e);
    }
  })();

  return success(null, '正在重新生成思维导图');
}
