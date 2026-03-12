'use client';

import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getRecords } from '@/lib/api';
import { toast } from 'sonner';
import { ClipboardList, Loader2, GraduationCap, Users, Calendar, MessageSquare } from 'lucide-react';
import type { PracticeRecord } from '@/lib/api';

const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  in_progress: { label: '进行中', variant: 'outline' },
  completed: { label: '已完成', variant: 'default' },
  failed: { label: '未通过', variant: 'destructive' },
  quit: { label: '已退出', variant: 'secondary' },
};

export default function RecordsPage() {
  const [tab, setTab] = useState<'teaching' | 'customer'>('teaching');
  const [records, setRecords] = useState<PracticeRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecords(tab);
  }, [tab]);

  const loadRecords = async (type: string) => {
    setLoading(true);
    const res = await getRecords({ type, page_size: 50 });
    if (res.success && res.data) {
      setRecords(res.data.items);
    } else {
      toast.error(res.error || '加载记录失败');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-800">练习记录</h1>
        <p className="text-sm text-muted-foreground mt-1">查看你的学习和对练历史</p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as 'teaching' | 'customer')}>
        <TabsList className="mb-4 rounded-xl">
          <TabsTrigger value="teaching" className="gap-1.5 rounded-lg">
            <GraduationCap className="h-4 w-4" />
            教学记录
          </TabsTrigger>
          <TabsTrigger value="customer" className="gap-1.5 rounded-lg">
            <Users className="h-4 w-4" />
            对练记录
          </TabsTrigger>
        </TabsList>

        <TabsContent value={tab}>
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : records.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <ClipboardList className="h-12 w-12 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground mt-3">暂无记录</p>
            </div>
          ) : (
            <div className="space-y-2">
              {records.map((record) => {
                const status = statusMap[record.status] || statusMap.in_progress;
                const isTeaching = record.type === 'teaching';
                return (
                  <Card key={record.id} className="rounded-xl border shadow-sm hover:shadow-md transition-all duration-200">
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isTeaching ? 'bg-violet-50' : 'bg-rose-50'
                      }`}>
                        {isTeaching
                          ? <GraduationCap className="h-5 w-5 text-violet-600" />
                          : <Users className="h-5 w-5 text-rose-600" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-800 truncate">
                            {isTeaching
                              ? record.course_name || `课程 #${record.course_id}`
                              : record.customer_name || `顾客 #${record.customer_id}`}
                          </span>
                          <Badge variant={status.variant} className="text-[11px] shrink-0">
                            {status.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                          <span>{record.document_name}</span>
                          <span>·</span>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(record.created_at).toLocaleString('zh-CN', {
                              month: 'numeric',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                          <span>·</span>
                          <div className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            {record.chat_history?.length || 0}条
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
