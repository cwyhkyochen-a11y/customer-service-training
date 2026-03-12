'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MindmapTree } from '@/components/mindmap-tree';
import { getDocumentMindmap } from '@/lib/api';
import { toast } from 'sonner';
import { ArrowLeft, Loader2 } from 'lucide-react';
import type { MindmapNode } from '@/lib/api';

export default function MindmapPage() {
  const params = useParams();
  const router = useRouter();
  const [mindmap, setMindmap] = useState<MindmapNode | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMindmap();
  }, []);

  const loadMindmap = async () => {
    const id = Number(params.id);
    const res = await getDocumentMindmap(id);
    if (res.success && res.data) {
      // The API returns the mindmap JSON directly
      setMindmap(res.data as any);
    } else {
      toast.error(res.error || '加载思维导图失败');
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

  if (!mindmap) {
    return (
      <div className="p-4 md:p-6">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          返回
        </Button>
        <div className="text-center py-16 text-muted-foreground text-sm">
          暂无思维导图数据
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen md:h-auto">
      <div className="flex items-center gap-3 px-4 md:px-6 h-14 border-b bg-white shrink-0">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-sm font-semibold">知识结构思维导图</h1>
        </div>
      </div>
      <ScrollArea className="flex-1 p-2 md:p-4">
        <MindmapTree data={mindmap} />
      </ScrollArea>
    </div>
  );
}
