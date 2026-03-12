import { NextRequest } from 'next/server';
import { db } from '@cs-training/database';
import { practiceRecords, userKnowledgeProgress, knowledgePoints, courses } from '@cs-training/database';
import { eq, and } from 'drizzle-orm';
import { requireAuth, isErrorResponse, success, error } from '@/lib/api-utils';
import { callAI } from '@/lib/ai';
import type { ChatMessage } from '@cs-training/shared';

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireAuth(request, 'client');
  if (isErrorResponse(auth)) return auth;

  const { id } = await params;
  const courseId = parseInt(id, 10);
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
          eq(practiceRecords.type, 'teaching'),
          eq(practiceRecords.status, 'in_progress')
        )
      )
      .get();

    if (!record) return error('练习记录不存在或已结束', 404);

    const chatHistory: ChatMessage[] = JSON.parse(record.chat_history);

    // Add user answer
    chatHistory.push({
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    });

    // Build evaluation prompt
    const systemMsg = chatHistory[0]?.content || '';
    const evaluatePrompt = `${systemMsg}

客服的回答：${message}

请评判客服的回答，返回JSON格式（只返回JSON）：
{
  "correct": true或false,
  "score": 1-10的评分,
  "comment": "点评内容，说明回答的优缺点",
  "correct_answer": "正确/标准的回答应该是什么（参考知识点内容给出标准话术）"
}`;

    const result = await callAI(
      [{ role: 'user', content: evaluatePrompt }],
      { temperature: 0.3, maxTokens: 1500, scene: 'teaching_chat' }
    );

    let correct = false;
    let score = 5;
    let comment = '评价暂时不可用';
    let correctAnswer = '';

    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        correct = !!parsed.correct;
        score = parsed.score || 5;
        comment = parsed.comment || '';
        correctAnswer = parsed.correct_answer || '';
      }
    } catch {
      comment = result;
    }

    // Consider mastered if score >= 7
    const mastered = correct || score >= 7;

    chatHistory.push({
      role: 'assistant',
      content: JSON.stringify({ correct, score, comment, correctAnswer }),
      timestamp: new Date().toISOString(),
    });

    // Update record
    db.update(practiceRecords)
      .set({
        chat_history: JSON.stringify(chatHistory),
        updated_at: new Date().toISOString(),
      })
      .where(eq(practiceRecords.id, record_id))
      .run();

    // If mastered, update progress
    if (mastered && record.course_id) {
      const kps = db
        .select()
        .from(knowledgePoints)
        .where(eq(knowledgePoints.course_id, record.course_id))
        .all();

      for (const kp of kps) {
        const existing = db
          .select()
          .from(userKnowledgeProgress)
          .where(
            and(
              eq(userKnowledgeProgress.user_id, userId),
              eq(userKnowledgeProgress.knowledge_point_id, kp.id)
            )
          )
          .get();

        if (!existing) {
          db.insert(userKnowledgeProgress)
            .values({
              user_id: userId,
              knowledge_point_id: kp.id,
              course_id: record.course_id,
              mastered: true,
              mastered_at: new Date().toISOString(),
            })
            .run();
          break;
        } else if (!existing.mastered) {
          db.update(userKnowledgeProgress)
            .set({
              mastered: true,
              mastered_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .where(eq(userKnowledgeProgress.id, existing.id))
            .run();
          break;
        }
      }
    }

    // Generate next question if mastered
    let nextQuestion = '';
    let nextHint = '';
    let nextKpTitle = '';
    let allMastered = false;

    if (mastered && record.course_id) {
      // Check remaining unmastered
      const allKps = db
        .select()
        .from(knowledgePoints)
        .where(eq(knowledgePoints.course_id, record.course_id))
        .all();

      const unmasteredKps = [];
      for (const kp of allKps) {
        const prog = db
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
        if (!prog) unmasteredKps.push(kp);
      }

      if (unmasteredKps.length === 0) {
        allMastered = true;
        // Mark record completed
        db.update(practiceRecords)
          .set({ status: 'completed', updated_at: new Date().toISOString() })
          .where(eq(practiceRecords.id, record_id))
          .run();
      } else {
        const nextKp = unmasteredKps[0];
        nextKpTitle = nextKp.title;

        try {
          const qPrompt = `你是一个客服培训考官。根据以下知识点内容，出一道考核题目。

知识点标题：${nextKp.title}
知识点内容：${nextKp.content}

要求：
1. 题目应该考核客服是否掌握了该知识点的核心话术或技巧
2. 可以是场景模拟题
3. 题目要具体、明确
4. 只返回JSON：{"question": "题目内容", "hint": "简短提示"}`;

          const qResult = await callAI([{ role: 'user', content: qPrompt }], { temperature: 0.7, maxTokens: 1000, scene: 'teaching_chat' });
          const qMatch = qResult.match(/\{[\s\S]*\}/);
          if (qMatch) {
            const qParsed = JSON.parse(qMatch[0]);
            nextQuestion = qParsed.question || '';
            nextHint = qParsed.hint || '';
          }
        } catch {}

        if (!nextQuestion) {
          nextQuestion = `请说明你对"${nextKp.title}"的理解，并给出相应的客服话术示例。`;
        }

        // Update system message for next question
        const course = db.select().from(courses).where(eq(courses.id, record.course_id)).get();
        const newSystemMessage = `你是一个客服培训考官。你正在考核课程"${course?.name || ''}"的知识点。

当前知识点：${nextKp.title}
知识点内容：${nextKp.content}

你的出题：${nextQuestion}

评判标准：根据知识点内容判断客服的回答是否正确。`;

        chatHistory[0] = { role: 'system', content: newSystemMessage, timestamp: new Date().toISOString() };
        db.update(practiceRecords)
          .set({ chat_history: JSON.stringify(chatHistory), updated_at: new Date().toISOString() })
          .where(eq(practiceRecords.id, record_id))
          .run();
      }
    }

    // Count progress
    const allKps = record.course_id
      ? db.select().from(knowledgePoints).where(eq(knowledgePoints.course_id, record.course_id)).all()
      : [];
    let masteredCount = 0;
    for (const kp of allKps) {
      const prog = db
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
      if (prog) masteredCount++;
    }

    return success({
      correct,
      score,
      comment,
      correct_answer: correctAnswer,
      mastered,
      all_mastered: allMastered,
      next_question: nextQuestion || undefined,
      next_hint: nextHint || undefined,
      next_kp_title: nextKpTitle || undefined,
      progress: {
        total: allKps.length,
        mastered: masteredCount,
      },
    });
  } catch (e: any) {
    console.error('Teaching chat error:', e);
    return error(e.message || '评判失败', 500);
  }
}
