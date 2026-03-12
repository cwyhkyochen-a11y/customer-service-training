import { NextRequest } from 'next/server';
import { db } from '@cs-training/database';
import { courses, knowledgePoints, practiceRecords, userKnowledgeProgress } from '@cs-training/database';
import { eq, and } from 'drizzle-orm';
import { requireAuth, isErrorResponse, success, error } from '@/lib/api-utils';
import { callAI } from '@/lib/ai';

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireAuth(request, 'client');
  if (isErrorResponse(auth)) return auth;

  const { id } = await params;
  const courseId = parseInt(id, 10);
  const userId = auth.user.id;

  const course = db.select().from(courses).where(eq(courses.id, courseId)).get();
  if (!course) return error('课程不存在', 404);

  const kps = db
    .select()
    .from(knowledgePoints)
    .where(eq(knowledgePoints.course_id, courseId))
    .all();

  if (kps.length === 0) return error('该课程没有知识点');

  // Find unmastered knowledge points
  const unmasteredKps = [];
  for (const kp of kps) {
    const progress = db
      .select()
      .from(userKnowledgeProgress)
      .where(
        and(
          eq(userKnowledgeProgress.user_id, userId),
          eq(userKnowledgeProgress.knowledge_point_id, kp.id),
          eq(userKnowledgeProgress.mastered, true)
        )
      )
      .get();
    if (!progress) unmasteredKps.push(kp);
  }

  if (unmasteredKps.length === 0) {
    return success({
      all_mastered: true,
      total: kps.length,
      mastered: kps.length,
    }, '已掌握全部知识点');
  }

  const targetKp = unmasteredKps[0];

  // Generate first question via AI
  const questionPrompt = `你是一个客服培训考官。根据以下知识点内容，出一道考核题目。

知识点标题：${targetKp.title}
知识点内容：${targetKp.content}

要求：
1. 题目应该考核客服是否掌握了该知识点的核心话术或技巧
2. 可以是场景模拟题（给出顾客场景，让客服回答应该怎么说）
3. 题目要具体、明确，不要太笼统
4. 只返回JSON，格式：{"question": "题目内容", "hint": "简短提示（可选）"}`;

  let question = '';
  let hint = '';
  try {
    const result = await callAI([{ role: 'user', content: questionPrompt }], { temperature: 0.7, maxTokens: 1000, scene: 'teaching_start' });
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      question = parsed.question || '';
      hint = parsed.hint || '';
    }
  } catch {}
  if (!question) {
    question = `请说明你对"${targetKp.title}"这个知识点的理解，并给出相应的客服话术示例。`;
  }

  // Create practice record with question info
  const systemMessage = `你是一个客服培训考官。你正在考核课程"${course.name}"的知识点。

当前知识点：${targetKp.title}
知识点内容：${targetKp.content}

你的出题：${question}

评判标准：根据知识点内容判断客服的回答是否正确。`;

  const chatHistory = [
    { role: 'system', content: systemMessage, timestamp: new Date().toISOString() },
  ];

  const record = db
    .insert(practiceRecords)
    .values({
      user_id: userId,
      type: 'teaching',
      course_id: courseId,
      document_id: course.document_id,
      chat_history: JSON.stringify(chatHistory),
      status: 'in_progress',
    })
    .returning()
    .get();

  return success({
    record_id: record.id,
    course_name: course.name,
    knowledge_point: {
      id: targetKp.id,
      title: targetKp.title,
    },
    question,
    hint,
    progress: {
      total: kps.length,
      mastered: kps.length - unmasteredKps.length,
    },
  }, '教学已开始');
}
