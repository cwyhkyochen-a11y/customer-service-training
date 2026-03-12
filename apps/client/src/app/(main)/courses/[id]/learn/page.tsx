'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ProgressBar } from '@/components/progress-bar';
import { startTeaching, sendTeachingMessage, quitTeaching } from '@/lib/api';
import type { TeachingAnswerResponse } from '@/lib/api';
import { toast } from 'sonner';
import {
  ArrowLeft, LogOut, Loader2, PartyPopper, Send,
  CheckCircle2, XCircle, Lightbulb, ChevronRight, BookOpen,
} from 'lucide-react';

interface QuizCard {
  kpTitle: string;
  question: string;
  hint?: string;
  answer?: string;
  result?: {
    correct: boolean;
    score: number;
    comment: string;
    correctAnswer: string;
  };
}

export default function LearnPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = Number(params.id);

  const [recordId, setRecordId] = useState<number | null>(null);
  const [courseName, setCourseName] = useState('');
  const [cards, setCards] = useState<QuizCard[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [allMastered, setAllMastered] = useState(false);
  const [progress, setProgress] = useState({ total: 0, mastered: 0 });
  const [showHint, setShowHint] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [cards, loading]);

  const init = async () => {
    const res = await startTeaching(courseId);
    if (res.success && res.data) {
      if (res.data.all_mastered) {
        setAllMastered(true);
        setProgress(res.data.progress);
      } else {
        setRecordId(res.data.record_id);
        setCourseName(res.data.course_name);
        setProgress(res.data.progress);
        setCards([{
          kpTitle: res.data.knowledge_point.title,
          question: res.data.question,
          hint: res.data.hint,
        }]);
      }
    } else {
      toast.error(res.error || '开始教学失败');
      router.back();
    }
    setInitializing(false);
  };

  const handleSubmit = async () => {
    if (!recordId || !currentAnswer.trim() || loading) return;

    const answer = currentAnswer.trim();
    setCurrentAnswer('');
    setShowHint(false);

    // Mark current card with answer
    setCards(prev => {
      const updated = [...prev];
      updated[updated.length - 1] = { ...updated[updated.length - 1], answer };
      return updated;
    });

    setLoading(true);
    const res = await sendTeachingMessage(courseId, recordId, answer);

    if (res.success && res.data) {
      const data = res.data;
      setProgress(data.progress);

      // Update current card with result
      setCards(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          result: {
            correct: data.correct,
            score: data.score,
            comment: data.comment,
            correctAnswer: data.correct_answer,
          },
        };

        // Add next question card if available
        if (data.next_question) {
          updated.push({
            kpTitle: data.next_kp_title || '',
            question: data.next_question,
            hint: data.next_hint,
          });
        }

        return updated;
      });

      if (data.all_mastered) {
        setAllMastered(true);
      }
    } else {
      toast.error(res.error || '提交失败');
      // Revert answer
      setCards(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { ...updated[updated.length - 1], answer: undefined };
        return updated;
      });
      setCurrentAnswer(answer);
    }
    setLoading(false);
  };

  const handleQuit = async () => {
    if (recordId) {
      await quitTeaching(courseId, recordId);
    }
    router.push('/courses');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (initializing) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">正在准备题目...</p>
        </div>
      </div>
    );
  }

  const currentCard = cards[cards.length - 1];
  const isAnswered = !!currentCard?.result;

  return (
    <div className="flex flex-col h-screen bg-gray-50/50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-14 border-b bg-white shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" onClick={handleQuit}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold truncate">{courseName || 'AI教学'}</h1>
            <p className="text-xs text-muted-foreground">
              进度 {progress.mastered}/{progress.total}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleQuit}>
          <LogOut className="h-3.5 w-3.5 mr-1" />
          退出
        </Button>
      </div>

      {/* Progress bar */}
      <div className="px-4 py-2 bg-white border-b">
        <ProgressBar value={progress.mastered} max={progress.total} />
      </div>

      {/* Cards area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {cards.map((card, idx) => (
          <div key={idx} className="space-y-3">
            {/* Question card */}
            <Card className="border-l-4 border-l-primary">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium text-primary">{card.kpTitle}</span>
                  <span className="text-xs text-muted-foreground ml-auto">第 {idx + 1} 题</span>
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{card.question}</p>
              </CardContent>
            </Card>

            {/* User answer (if submitted) */}
            {card.answer && (
              <div className="ml-8">
                <div className="bg-primary/5 rounded-lg px-4 py-3 text-sm">
                  <p className="text-xs text-muted-foreground mb-1">我的回答</p>
                  <p className="whitespace-pre-wrap">{card.answer}</p>
                </div>
              </div>
            )}

            {/* Result card */}
            {card.result && (
              <Card className={`border-l-4 ${card.result.correct ? 'border-l-green-500' : 'border-l-amber-500'}`}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    {card.result.correct ? (
                      <>
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        <span className="font-medium text-green-700">回答正确</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-5 w-5 text-amber-500" />
                        <span className="font-medium text-amber-700">需要改进</span>
                      </>
                    )}
                    <span className="ml-auto text-sm font-medium">
                      {card.result.score}/10 分
                    </span>
                  </div>

                  <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {card.result.comment}
                  </div>

                  {card.result.correctAnswer && (
                    <div className="bg-green-50 rounded-lg px-3 py-2.5">
                      <p className="text-xs font-medium text-green-700 mb-1">✅ 参考答案</p>
                      <p className="text-sm text-green-800 whitespace-pre-wrap leading-relaxed">
                        {card.result.correctAnswer}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        ))}

        {/* All mastered celebration */}
        {allMastered && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-6 text-center">
              <PartyPopper className="h-10 w-10 text-green-500 mx-auto mb-3" />
              <h3 className="font-semibold text-green-800 mb-1">恭喜！全部通过 🎉</h3>
              <p className="text-sm text-green-600">
                你已掌握本课程全部 {progress.total} 个知识点
              </p>
              <Button className="mt-4" onClick={() => router.push('/courses')}>
                返回课程列表
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Loading indicator */}
        {loading && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mr-2" />
            <span className="text-sm text-muted-foreground">AI 正在评判...</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      {!allMastered && (
        <div className="border-t bg-white px-4 py-3 shrink-0">
          {currentCard && !isAnswered && currentCard.hint && (
            <button
              onClick={() => setShowHint(!showHint)}
              className="flex items-center gap-1 text-xs text-amber-600 mb-2 hover:text-amber-700"
            >
              <Lightbulb className="h-3 w-3" />
              {showHint ? currentCard.hint : '查看提示'}
            </button>
          )}
          <div className="flex gap-2">
            <Textarea
              value={currentAnswer}
              onChange={(e) => setCurrentAnswer(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isAnswered ? '等待下一题...' : '输入你的回答...'}
              disabled={loading || isAnswered}
              className="min-h-[44px] max-h-[120px] resize-none text-sm"
              rows={2}
            />
            <Button
              onClick={handleSubmit}
              disabled={!currentAnswer.trim() || loading || isAnswered}
              size="icon"
              className="shrink-0 h-[44px] w-[44px]"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
