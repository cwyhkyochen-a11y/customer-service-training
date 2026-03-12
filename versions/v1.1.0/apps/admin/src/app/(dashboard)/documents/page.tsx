'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Upload, MoreHorizontal, Trash2, Eye, Loader2, FileText, Presentation } from 'lucide-react';
import { toast } from 'sonner';
import { getDocuments, uploadDocument, deleteDocument, getModels, generateSlides, deleteSlides } from '@/lib/api-client';
import type { Document } from '@cs-training/shared';

interface DocWithSlides extends Document {
  slide_count?: number;
}

const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: '待处理', variant: 'secondary' },
  processing: { label: '处理中', variant: 'outline' },
  done: { label: '已完成', variant: 'default' },
  failed: { label: '失败', variant: 'destructive' },
};

export default function DocumentsPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [docs, setDocs] = useState<DocWithSlides[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [generatingPPT, setGeneratingPPT] = useState<number | null>(null);
  const pageSize = 10;

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    const res = await getDocuments({ page, page_size: pageSize });
    if (res.success && res.data) {
      setDocs(res.data.items);
      setTotal(res.data.total);
    }
    setLoading(false);
  }, [page]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  async function handleUploadClick() {
    // Check if default model exists
    const modelsRes = await getModels();
    if (modelsRes.success && modelsRes.data) {
      const models = modelsRes.data.items || [];
      const hasDefault = models.some((m) => m.is_default);
      if (!hasDefault) {
        toast.error('请先在模型管理中设置默认模型');
        return;
      }
    }
    fileRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadDocument(file);
      if (res.success) {
        toast.success('上传成功，正在处理...');
        fetchDocs();
      } else {
        toast.error(res.error || '上传失败');
      }
    } catch {
      toast.error('上传失败');
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function handleDelete(doc: Document) {
    if (!confirm(`确定删除文档 "${doc.name}" 吗？`)) return;
    const res = await deleteDocument(doc.id);
    if (res.success) { toast.success('删除成功'); fetchDocs(); }
    else toast.error(res.error || '删除失败');
  }

  async function handleGeneratePPT(doc: DocWithSlides) {
    const hasSlides = (doc.slide_count || 0) > 0;
    if (hasSlides && !confirm('将删除现有PPT并重新生成，确定继续？')) return;
    setGeneratingPPT(doc.id);
    toast.info('正在生成PPT，请稍候...');
    const res = await generateSlides(doc.id);
    if (res.success) {
      toast.success(res.message || `PPT生成成功，共 ${res.data?.count} 页`);
      fetchDocs();
      router.push(`/documents/${doc.id}/slides`);
    } else {
      toast.error(res.error || 'PPT生成失败');
    }
    setGeneratingPPT(null);
  }

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">文档管理</h1>
        <div>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.doc,.docx"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button onClick={handleUploadClick} disabled={uploading}>
            {uploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            上传文档
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>文件名</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>上传时间</TableHead>
                <TableHead className="w-16">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : docs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    <FileText className="mx-auto mb-2 h-8 w-8" />
                    暂无文档
                  </TableCell>
                </TableRow>
              ) : (
                docs.map((doc) => {
                  const status = statusMap[doc.status] || statusMap.pending;
                  return (
                    <TableRow
                      key={doc.id}
                      className={doc.status === 'done' ? 'cursor-pointer hover:bg-muted/50' : ''}
                      onClick={() => {
                        if (doc.status === 'done') router.push(`/documents/${doc.id}/mindmap`);
                      }}
                    >
                      <TableCell className="font-medium">{doc.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{doc.file_type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(doc.created_at).toLocaleString('zh-CN')}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {doc.status === 'done' && (
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/documents/${doc.id}/mindmap`); }}>
                                <Eye className="mr-2 h-4 w-4" />
                                查看思维导图
                              </DropdownMenuItem>
                            )}
                            {doc.status === 'done' && (
                              <DropdownMenuItem
                                onClick={(e) => { e.stopPropagation(); handleGeneratePPT(doc); }}
                                disabled={generatingPPT === doc.id}
                              >
                                {generatingPPT === doc.id ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <Presentation className="mr-2 h-4 w-4" />
                                )}
                                {(doc.slide_count || 0) > 0 ? '重新生成PPT' : '生成PPT'}
                              </DropdownMenuItem>
                            )}
                            {doc.status === 'done' && (doc.slide_count || 0) > 0 && (
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/documents/${doc.id}/slides`); }}>
                                <Presentation className="mr-2 h-4 w-4" />
                                查看PPT
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); handleDelete(doc); }}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              删除
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
