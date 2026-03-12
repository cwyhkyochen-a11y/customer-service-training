import { NextRequest } from 'next/server';
import { db } from '@cs-training/database';
import { virtualCustomers, documents } from '@cs-training/database';
import { eq } from 'drizzle-orm';
import { requireAuth, isErrorResponse, success, error } from '@/lib/api-utils';
import { generateCustomer } from '@/lib/ai';
import { parseFile } from '@/lib/file-parser';

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, 'admin');
  if (isErrorResponse(auth)) return auth;

  try {
    const body = await request.json();
    const { document_id, node_path, prompt, scene_type } = body;

    if (!document_id || !node_path || !prompt) {
      return error('document_id, node_path, prompt 不能为空');
    }

    const validSceneType = scene_type === 'pre_sale' ? 'pre_sale' : 'after_sale';

    const doc = db.select().from(documents).where(eq(documents.id, document_id)).get();
    if (!doc) return error('文档不存在');

    // Get node content from mindmap
    let nodeContent = '';
    if (doc.mindmap_json) {
      const mindmap = JSON.parse(doc.mindmap_json);
      nodeContent = extractNodeContent(mindmap, node_path as string[]);
    }
    if (!nodeContent) {
      // Fallback: parse file
      nodeContent = await parseFile(doc.file_path, doc.file_type as 'excel' | 'doc');
      nodeContent = nodeContent.slice(0, 5000);
    }

    const customer = await generateCustomer(nodeContent, prompt, validSceneType);

    const result = db
      .insert(virtualCustomers)
      .values({
        document_id,
        node_path: JSON.stringify(node_path),
        prompt,
        name: customer.name,
        age: customer.age,
        gender: customer.gender,
        demand: customer.demand,
        question: customer.question || '',
        scene_type: validSceneType,
        virtual_product: customer.virtual_product || null,
        virtual_order: customer.virtual_order || null,
        mood: customer.mood,
        persona_prompt: customer.persona_prompt,
      })
      .returning()
      .get();

    return success({ ...result, node_path: JSON.parse(result.node_path) }, '生成成功');
  } catch (e: any) {
    return error(e.message || '生成失败', 500);
  }
}

function extractNodeContent(node: any, path: string[]): string {
  if (!node || path.length === 0) {
    return collectLabels(node);
  }

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
