'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { getDocument, regenerateMindmap } from '@/lib/api-client';
import { MindmapTree } from '@/components/mindmap-tree';
import type { Document } from '@cs-training/shared';

export default function MindmapPage() {
  const params = useParams();
  const router = useRouter();
  const [doc, setDoc] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);

  const fetchDoc = useCallback(() => {
    const id = Number(params.id);
    if (!id) return;
    getDocument(id).then((res) => {
      if (res.success && res.data) setDoc(res.data);
      setLoading(false);
    });
  }, [params.id]);

  useEffect(() => { fetchDoc(); }, [fetchDoc]);

  // Poll while processing
  useEffect(() => {
    if (!doc || doc.status !== 'processing') return;
    const timer = setInterval(() => {
      const id = Number(params.id);
      if (!id) return;
      getDocument(id).then((res) => {
        if (res.success && res.data) {
          setDoc(res.data);
          if (res.data.status !== 'processing') {
            setRegenerating(false);
            if (res.data.status === 'done') toast.success('思维导图生成完成');
            else if (res.data.status === 'failed') toast.error('生成失败');
          }
        }
      });
    }, 3000);
    return () => clearInterval(timer);
  }, [doc?.status, params.id]);

  async function handleRegenerate() {
    const id = Number(params.id);
    if (!id) return;
    setRegenerating(true);
    const res = await regenerateMindmap(id);
    if (res.success) {
      toast.info('正在重新生成思维导图...');
      setDoc((prev) => prev ? { ...prev, status: 'processing' } : prev);
    } else {
      toast.error(res.error || '操作失败');
      setRegenerating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => router.push('/documents')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回
        </Button>
        <p className="text-center text-muted-foreground">文档不存在</p>
      </div>
    );
  }

  const isProcessing = doc.status === 'processing';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push('/documents')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-semibold">{doc.name} - 思维导图</h1>
        </div>
        <Button
          variant="outline"
          onClick={handleRegenerate}
          disabled={regenerating || isProcessing}
        >
          {(regenerating || isProcessing) ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          重新生成
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isProcessing ? (
            <div className="flex h-64 items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>正在生成思维导图...</span>
            </div>
          ) : doc.mindmap_json ? (
            <MindmapTree
              data={typeof doc.mindmap_json === 'string' ? JSON.parse(doc.mindmap_json) : doc.mindmap_json}
              className="min-h-[400px]"
            />
          ) : (
            <div className="flex h-64 items-center justify-center text-muted-foreground">
              暂无思维导图数据
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
