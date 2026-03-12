import { NextRequest } from 'next/server';
import { db } from '@cs-training/database';
import { documents, modelConfigs } from '@cs-training/database';
import { eq } from 'drizzle-orm';
import { requireAuth, isErrorResponse, success, error } from '@/lib/api-utils';
import { parseFile } from '@/lib/file-parser';
import { generateMindmap } from '@/lib/ai';
import fs from 'fs';
import path from 'path';

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.resolve(process.cwd(), '../../uploads');
const ALLOWED_EXTENSIONS = ['.xlsx', '.xls', '.doc', '.docx'];

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, 'admin');
  if (isErrorResponse(auth)) return auth;

  try {
    // Check default model exists
    const defaultModel = db
      .select()
      .from(modelConfigs)
      .where(eq(modelConfigs.is_default, true))
      .get();
    if (!defaultModel) {
      return error('请先配置默认模型');
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) return error('请上传文件');

    const ext = path.extname(file.name).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return error('只支持 .xlsx, .xls, .doc, .docx 格式');
    }

    // Ensure upload dir exists
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });

    // Save file
    const timestamp = Date.now();
    const safeName = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9._\u4e00-\u9fff-]/g, '_')}`;
    const filePath = path.join(UPLOAD_DIR, safeName);
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    const fileType = ['.xlsx', '.xls'].includes(ext) ? 'excel' : 'doc';

    // Create document record
    const doc = db
      .insert(documents)
      .values({
        name: file.name,
        file_path: filePath,
        file_type: fileType,
        status: 'processing',
      })
      .returning()
      .get();

    // Async: parse file and generate mindmap
    (async () => {
      try {
        const text = await parseFile(filePath, fileType as 'excel' | 'doc');
        const mindmap = await generateMindmap(text);

        db.update(documents)
          .set({
            mindmap_json: JSON.stringify(mindmap),
            status: 'done',
            updated_at: new Date().toISOString(),
          })
          .where(eq(documents.id, doc.id))
          .run();
      } catch (e: any) {
        db.update(documents)
          .set({
            status: 'failed',
            updated_at: new Date().toISOString(),
          })
          .where(eq(documents.id, doc.id))
          .run();
        console.error('Mindmap generation failed:', e);
      }
    })();

    return success(
      {
        id: doc.id,
        name: doc.name,
        file_type: doc.file_type,
        status: doc.status,
        created_at: doc.created_at,
      },
      '上传成功，正在生成思维导图'
    );
  } catch (e: any) {
    return error(e.message || '上传失败', 500);
  }
}
