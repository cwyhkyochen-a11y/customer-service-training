'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getDocuments } from '@/lib/api';
import { toast } from 'sonner';
import { FileText, Network, Loader2, Presentation } from 'lucide-react';
import type { Document } from '@/lib/api';

const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: '待处理', variant: 'secondary' },
  processing: { label: '处理中', variant: 'outline' },
  done: { label: '已完成', variant: 'default' },
  failed: { label: '失败', variant: 'destructive' },
};

export default function DocumentsPage() {
  const router = useRouter();
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDocs();
  }, []);

  const loadDocs = async () => {
    const res = await getDocuments({ page_size: 100 });
    if (res.success && res.data) {
      setDocs(res.data.items);
    } else {
      toast.error(res.error || '加载文档失败');
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-800">文档学习</h1>
        <p className="text-sm text-muted-foreground mt-1">选择文档查看知识结构和PPT课件</p>
      </div>

      {docs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <FileText className="h-12 w-12 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground mt-3">暂无文档</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {docs.map((doc) => {
            const status = statusMap[doc.status] || statusMap.pending;
            const isDone = doc.status === 'done';
            return (
              <Card
                key={doc.id}
                className={`rounded-xl border shadow-sm transition-all duration-200 ${
                  isDone
                    ? 'cursor-pointer hover:shadow-md hover:border-primary/20'
                    : 'opacity-50'
                }`}
                onClick={() => {
                  if (isDone) router.push(`/documents/${doc.id}/mindmap`);
                  else toast.info('文档尚未处理完成');
                }}
              >
                <CardContent className="flex items-start gap-4 p-5">
                  <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm text-slate-800 truncate">{doc.name}</p>
                      <Badge variant={status.variant} className="shrink-0 text-[11px]">
                        {status.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      {doc.file_type.toUpperCase()} · {new Date(doc.created_at).toLocaleDateString('zh-CN')}
                    </p>
                    {isDone && (
                      <div className="flex items-center gap-4 mt-3">
                        <button
                          className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
                          onClick={(e) => { e.stopPropagation(); router.push(`/documents/${doc.id}/mindmap`); }}
                        >
                          <Network className="h-3.5 w-3.5" />
                          思维导图
                        </button>
                        <button
                          className="flex items-center gap-1.5 text-xs text-purple-600 hover:text-purple-700 font-medium transition-colors"
                          onClick={(e) => { e.stopPropagation(); router.push(`/documents/${doc.id}/slides`); }}
                        >
                          <Presentation className="h-3.5 w-3.5" />
                          PPT课件
                        </button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
