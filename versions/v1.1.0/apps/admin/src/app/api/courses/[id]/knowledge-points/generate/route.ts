import { NextRequest } from 'next/server';
import { db } from '@cs-training/database';
import { knowledgePoints, courses, documents } from '@cs-training/database';
import { eq } from 'drizzle-orm';
import { requireAuth, isErrorResponse, success, error } from '@/lib/api-utils';
import { generateKnowledgePoints } from '@/lib/ai';
import { parseFile } from '@/lib/file-parser';

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireAuth(request, 'admin');
  if (isErrorResponse(auth)) return auth;

  const { id } = await params;
  const courseId = parseInt(id, 10);

  try {
    const body = await request.json();
    const { document_id, node_path } = body;

    if (!document_id || !node_path) {
      return error('document_id 和 node_path 不能为空');
    }

    const course = db.select().from(courses).where(eq(courses.id, courseId)).get();
    if (!course) return error('课程不存在', 404);

    const doc = db.select().from(documents).where(eq(documents.id, document_id)).get();
    if (!doc) return error('文档不存在', 404);

    // Get node content
    let nodeContent = '';
    if (doc.mindmap_json) {
      const mindmap = JSON.parse(doc.mindmap_json);
      nodeContent = extractNodeContent(mindmap, node_path as string[]);
    }
    if (!nodeContent) {
      nodeContent = await parseFile(doc.file_path, doc.file_type as 'excel' | 'doc');
      nodeContent = nodeContent.slice(0, 8000);
    }

    const kps = await generateKnowledgePoints(nodeContent);

    const results = kps.map((kp) =>
      db
        .insert(knowledgePoints)
        .values({
          course_id: courseId,
          document_id: document_id,
          node_path: JSON.stringify(node_path),
          title: kp.title,
          content: kp.content,
        })
        .returning()
        .get()
    );

    return success(
      results.map((r) => ({ ...r, node_path: JSON.parse(r.node_path) })),
      `生成了 ${results.length} 个知识点`
    );
  } catch (e: any) {
    return error(e.message || '生成失败', 500);
  }
}

function extractNodeContent(node: any, path: string[]): string {
  if (!node || path.length === 0) return collectLabels(node);
  const [current, ...rest] = path;
  if (node.label === current || node.id === current) {
    if (rest.length === 0) return collectLabels(node);
    if (node.children) {
      for (const child of node.children) {
        const result = extractNodeContent(child, rest);
        if (result) return result;
      }
    }
  }
  if (node.children) {
    for (const child of node.children) {
      const result = extractNodeContent(child, path);
      if (result) return result;
    }
  }
  return '';
}

function collectLabels(node: any): string {
  if (!node) return '';
  let text = node.label || '';
  if (node.children) {
    for (const child of node.children) {
      text += '\n' + collectLabels(child);
    }
  }
  return text;
}
