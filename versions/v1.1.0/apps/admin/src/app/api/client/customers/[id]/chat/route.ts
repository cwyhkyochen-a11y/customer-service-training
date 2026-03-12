import { NextRequest } from 'next/server';
import { db } from '@cs-training/database';
import { practiceRecords, virtualCustomers, documents, userCustomerResults } from '@cs-training/database';
import { eq, and } from 'drizzle-orm';
import { requireAuth, isErrorResponse, success, error } from '@/lib/api-utils';
import { callAI } from '@/lib/ai';
import type { ChatMessage } from '@cs-training/shared';

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireAuth(request, 'client');
  if (isErrorResponse(auth)) return auth;

  const { id } = await params;
  const customerId = parseInt(id, 10);
  const userId = auth.user.id;

  try {
    const body = await request.json();
    const { record_id, message } = body;

    if (!record_id || !message) {
      return error('record_id 和 message 不能为空');
    }

    const record = db
      .select()
      .from(practiceRecords)
      .where(
        and(
          eq(practiceRecords.id, record_id),
          eq(practiceRecords.user_id, userId),
          eq(practiceRecords.type, 'customer'),
          eq(practiceRecords.status, 'in_progress')
        )
      )
      .get();

    if (!record) return error('练习记录不存在或已结束', 404);

    const chatHistory: ChatMessage[] = JSON.parse(record.chat_history);

    // Check 200 round limit
    const userMessages = chatHistory.filter(m => m.role === 'user').length;
    if (userMessages >= 200) {
      db.update(practiceRecords)
        .set({ status: 'completed', updated_at: new Date().toISOString() })
        .where(eq(practiceRecords.id, record_id))
        .run();
      return success({ message: '对话已达到200轮上限', finished: true, status: 'completed' });
    }

    // Get customer and document info
    const customer = db.select().from(virtualCustomers).where(eq(virtualCustomers.id, customerId)).get();
    const doc = customer ? db.select().from(documents).where(eq(documents.id, customer.document_id)).get() : null;

    // Add user message
    chatHistory.push({
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    });

    // Build AI messages for customer response
    const aiMessages = chatHistory.map(m => ({
      role: m.role as 'system' | 'user' | 'assistant',
      content: m.content,
    }));

    // Build feedback prompt
    const docContent = doc?.mindmap_json ? JSON.stringify(JSON.parse(doc.mindmap_json)) : '';
    const feedbackPrompt = `你是一个客服话术评价专家。请根据以下文档内容，评价客服的回复是否符合话术要求。

文档知识结构：
${docContent.slice(0, 3000)}

顾客诉求：${customer?.demand || ''}
客服回复：${message}

请简要评价：
1. 客服话术是否与要求一致
2. 如果不一致，正确的用词应该是什么
3. 一句话总结

只返回评价内容，不要JSON格式。`;

    // Run both AI calls in parallel
    const [customerResponse, feedback] = await Promise.all([
      callAI(aiMessages, { scene: 'customer_chat' }),
      callAI([{ role: 'user', content: feedbackPrompt }], { temperature: 0.3, maxTokens: 500, scene: 'customer_feedback' })
        .catch(() => '话术评价暂时不可用'),
    ]);

    // Check if conversation should end
    const resolved = customerResponse.includes('[RESOLVED]');
    const failed = customerResponse.includes('[FAILED]');
    const cleanResponse = customerResponse.replace(/\[RESOLVED\]/g, '').replace(/\[FAILED\]/g, '').trim();

    chatHistory.push({
      role: 'assistant',
      content: cleanResponse,
      feedback,
      timestamp: new Date().toISOString(),
    });

    let newStatus = 'in_progress';
    if (resolved) newStatus = 'completed';
    if (failed) newStatus = 'failed';

    db.update(practiceRecords)
      .set({
        chat_history: JSON.stringify(chatHistory),
        status: newStatus as any,
        result_summary: (resolved || failed) ? JSON.stringify({ resolved, failed }) : undefined,
        updated_at: new Date().toISOString(),
      })
      .where(eq(practiceRecords.id, record_id))
      .run();

    // Update customer result if finished
    if (resolved || failed) {
      db.insert(userCustomerResults)
        .values({
          user_id: userId,
          customer_id: customerId,
          practice_record_id: record_id,
          resolved: resolved ? 1 : 2,
        })
        .run();
    }

    return success({
      message: cleanResponse,
      feedback,
      finished: resolved || failed,
      status: newStatus,
    });
  } catch (e: any) {
    console.error('Chat error:', e);
    return error(e.message || '对话失败', 500);
  }
}
