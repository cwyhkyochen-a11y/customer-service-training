import { NextRequest } from 'next/server';
import { db } from '@cs-training/database';
import { documents } from '@cs-training/database';
import { inArray } from 'drizzle-orm';
import { requireAuth, isErrorResponse, success, error } from '@/lib/api-utils';
import { callAI } from '@/lib/ai';

interface MindmapNode {
  id: string;
  label: string;
  content?: string;
  children?: MindmapNode[];
}

function flattenMindmap(node: MindmapNode, depth = 0): string {
  const indent = '  '.repeat(depth);
  let text = `${indent}${node.label}`;
  if (node.content) text += `：${node.content}`;
  text += '\n';
  if (node.children) {
    for (const child of node.children) {
      text += flattenMindmap(child, depth + 1);
    }
  }
  return text;
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, 'client');
  if (isErrorResponse(auth)) return auth;

  const body = await request.json();
  const { document_ids, customer_message, context } = body;

  // 兼容旧的 document_id 单选
  const docIds: number[] = Array.isArray(document_ids) ? document_ids : (body.document_id ? [body.document_id] : []);

  if (docIds.length === 0) return error('请选择参考文档');
  if (docIds.length > 5) return error('最多选择5个文档');
  if (!customer_message?.trim()) return error('请输入用户消息');

  // 获取所有选中文档
  const docs = db.select().from(documents).where(inArray(documents.id, docIds)).all();
  if (docs.length === 0) return error('文档不存在', 404);

  // 合并知识
  let knowledgeText = '';
  const docNames: string[] = [];
  for (const doc of docs) {
    if (!doc.mindmap_json) continue;
    try {
      const mindmap = JSON.parse(doc.mindmap_json) as MindmapNode;
      knowledgeText += `\n### 文档：${doc.name}\n${flattenMindmap(mindmap)}\n`;
      docNames.push(doc.name);
    } catch {}
  }

  if (!knowledgeText.trim()) return error('所选文档尚未生成知识结构', 400);

  const systemPrompt = `你是一位专业的客服话术顾问。根据以下话术知识库，帮助客服人员拟定一个专业、温暖、符合话术规范的回复。

## 话术知识库（参考文档：${docNames.join('、')}）
${knowledgeText}

## 要求
1. 回复必须参考知识库中的话术规范和要点
2. 语气要亲切自然，像真人客服一样有温度
3. 回复要有针对性，直接解决用户的问题或诉求
4. 如果知识库中有相关的标准话术，优先参考使用
5. 回复长度适中，不要过长也不要过短
6. 直接给出回复内容，不需要解释或分析过程`;

  let userPrompt = `## 用户消息\n${customer_message.trim()}`;
  if (context?.trim()) {
    userPrompt = `## 沟通背景\n${context.trim()}\n\n${userPrompt}`;
  }
  userPrompt += '\n\n请根据话术知识库，拟定一个合适的客服回复：';

  const messages: Array<{ role: 'system' | 'user'; content: string }> = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  const reply = await callAI(messages, {
    scene: 'ai_assist',
    userId: auth.user.id,
    documentId: docIds[0],
    temperature: 0.7,
    maxTokens: 2048,
  });

  return success({ reply });
}
