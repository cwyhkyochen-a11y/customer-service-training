'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Loader2, User, Bot } from 'lucide-react';
import { getRecord } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import type { PracticeRecord, ChatMessage } from '@cs-training/shared';

const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  in_progress: { label: '进行中', variant: 'outline' },
  completed: { label: '已完成', variant: 'default' },
  failed: { label: '失败', variant: 'destructive' },
  quit: { label: '已退出', variant: 'secondary' },
};

export default function RecordDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [record, setRecord] = useState<PracticeRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = Number(params.id);
    if (!id) return;
    getRecord(id).then((res) => {
      if (res.success && res.data) setRecord(res.data);
      setLoading(false);
    });
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!record) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => router.push('/records')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回
        </Button>
        <p className="text-center text-muted-foreground">记录不存在</p>
      </div>
    );
  }

  const status = statusMap[record.status] || statusMap.in_progress;
  const messages: ChatMessage[] = typeof record.chat_history === 'string'
    ? JSON.parse(record.chat_history) : record.chat_history;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/records')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-semibold">记录详情</h1>
      </div>

      {/* Summary card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">基本信息</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <span className="text-muted-foreground">用户：</span>
              {record.username || '-'}
            </div>
            <div>
              <span className="text-muted-foreground">类型：</span>
              <Badge variant="outline" className="ml-1">
                {record.type === 'teaching' ? '教学' : '对练'}
              </Badge>
            </div>
            <div>
              <span className="text-muted-foreground">
                {record.type === 'teaching' ? '课程：' : '虚拟顾客：'}
              </span>
              {record.type === 'teaching' ? (record.course_name || '-') : (record.customer_name || '-')}
            </div>
            <div>
              <span className="text-muted-foreground">状态：</span>
              <Badge variant={status.variant} className="ml-1">{status.label}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Result summary */}
      {record.result_summary && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">结果摘要</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap text-sm text-muted-foreground">
              {typeof record.result_summary === 'string'
                ? record.result_summary
                : JSON.stringify(record.result_summary, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Chat replay */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">对话回放</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            <div className="space-y-4 p-4">
              {messages.filter((m) => m.role !== 'system').map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex gap-3',
                    msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                  )}
                >
                  <div className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                    msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  )}>
                    {msg.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>
                  <div className={cn(
                    'max-w-[75%] space-y-1',
                    msg.role === 'user' ? 'items-end' : 'items-start'
                  )}>
                    <div className={cn(
                      'rounded-2xl px-4 py-2.5 text-sm',
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-tr-sm'
                        : 'bg-muted rounded-tl-sm'
                    )}>
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                    {msg.feedback && (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-800">
                        💡 {msg.feedback}
                      </div>
                    )}
                    {msg.timestamp && (
                      <p className={cn(
                        'text-xs text-muted-foreground',
                        msg.role === 'user' ? 'text-right' : 'text-left'
                      )}>
                        {new Date(msg.timestamp).toLocaleTimeString('zh-CN')}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              {messages.filter((m) => m.role !== 'system').length === 0 && (
                <p className="text-center text-muted-foreground py-8">暂无对话记录</p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
