'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, ClipboardList } from 'lucide-react';
import { getRecords } from '@/lib/api-client';
import type { PracticeRecord } from '@cs-training/shared';

const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  in_progress: { label: '进行中', variant: 'outline' },
  completed: { label: '已完成', variant: 'default' },
  failed: { label: '失败', variant: 'destructive' },
  quit: { label: '已退出', variant: 'secondary' },
};

export default function RecordsPage() {
  const router = useRouter();
  const [records, setRecords] = useState<PracticeRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [type, setType] = useState<'teaching' | 'customer'>('teaching');
  const [loading, setLoading] = useState(true);
  const pageSize = 10;

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    const res = await getRecords({ page, page_size: pageSize, type });
    if (res.success && res.data) {
      setRecords(res.data.items);
      setTotal(res.data.total);
    }
    setLoading(false);
  }, [page, type]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">练习记录</h1>

      <Tabs value={type} onValueChange={(v) => { setType(v as 'teaching' | 'customer'); setPage(1); }}>
        <TabsList>
          <TabsTrigger value="teaching">教学记录</TabsTrigger>
          <TabsTrigger value="customer">对练记录</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>用户</TableHead>
                <TableHead>{type === 'teaching' ? '课程' : '虚拟顾客'}</TableHead>
                <TableHead>关联文档</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    <ClipboardList className="mx-auto mb-2 h-8 w-8" />
                    暂无记录
                  </TableCell>
                </TableRow>
              ) : (
                records.map((r) => {
                  const status = statusMap[r.status] || statusMap.in_progress;
                  return (
                    <TableRow
                      key={r.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/records/${r.id}`)}
                    >
                      <TableCell className="font-medium">{r.username || '-'}</TableCell>
                      <TableCell>
                        {type === 'teaching' ? (r.course_name || '-') : (r.customer_name || '-')}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{r.document_name || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(r.created_at).toLocaleString('zh-CN')}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-sm text-muted-foreground">共 {total} 条</p>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  上一页
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                  下一页
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
