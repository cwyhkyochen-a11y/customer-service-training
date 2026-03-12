'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, MoreHorizontal, Pencil, Trash2, Eye, Loader2, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { getCourses, createCourse, updateCourse, deleteCourse, getDocuments } from '@/lib/api-client';
import type { Course, Document } from '@cs-training/shared';

export default function CoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [docs, setDocs] = useState<Document[]>([]);
  const [form, setForm] = useState({ document_id: '', name: '', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const pageSize = 10;

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    const res = await getCourses({ page, page_size: pageSize });
    if (res.success && res.data) {
      setCourses(res.data.items);
      setTotal(res.data.total);
    }
    setLoading(false);
  }, [page]);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);

  async function loadDocs() {
    const res = await getDocuments({ page: 1, page_size: 100 });
    if (res.success && res.data) setDocs(res.data.items.filter((d) => d.status === 'done'));
  }

  function openCreate() {
    setEditingCourse(null);
    setForm({ document_id: '', name: '', description: '' });
    loadDocs();
    setDialogOpen(true);
  }

  function openEdit(course: Course) {
    setEditingCourse(course);
    setForm({
      document_id: course.document_id.toString(),
      name: course.name,
      description: course.description || '',
    });
    loadDocs();
    setDialogOpen(true);
  }

  async function handleSubmit() {
    if (!form.name.trim()) { toast.error('请输入课程名称'); return; }
    if (!form.document_id) { toast.error('请选择关联文档'); return; }

    setSubmitting(true);
    try {
      const input = {
        document_id: Number(form.document_id),
        name: form.name,
        description: form.description || undefined,
      };
      if (editingCourse) {
        const res = await updateCourse(editingCourse.id, input);
        if (res.success) { toast.success('更新成功'); setDialogOpen(false); fetchCourses(); }
        else toast.error(res.error || '更新失败');
      } else {
        const res = await createCourse(input);
        if (res.success) { toast.success('创建成功'); setDialogOpen(false); fetchCourses(); }
        else toast.error(res.error || '创建失败');
      }
    } catch { toast.error('操作失败'); }
    setSubmitting(false);
  }

  async function handleDelete(course: Course) {
    if (!confirm(`确定删除课程 "${course.name}" 吗？`)) return;
    const res = await deleteCourse(course.id);
    if (res.success) { toast.success('删除成功'); fetchCourses(); }
    else toast.error(res.error || '删除失败');
  }

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">AI教学管理</h1>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          创建课程
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>课程名称</TableHead>
                <TableHead>关联文档</TableHead>
                <TableHead>知识点数量</TableHead>
                <TableHead>创建时间</TableHead>
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
              ) : courses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    <BookOpen className="mx-auto mb-2 h-8 w-8" />
                    暂无课程
                  </TableCell>
                </TableRow>
              ) : (
                courses.map((course) => (
                  <TableRow
                    key={course.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/courses/${course.id}`)}
                  >
                    <TableCell className="font-medium">{course.name}</TableCell>
                    <TableCell className="text-muted-foreground">{course.document_name || '-'}</TableCell>
                    <TableCell>{course.knowledge_point_count ?? 0}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(course.created_at).toLocaleString('zh-CN')}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/courses/${course.id}`)}>
                            <Eye className="mr-2 h-4 w-4" />
                            查看详情
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { openEdit(course); }}>
                            <Pencil className="mr-2 h-4 w-4" />
                            编辑
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(course)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            删除
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCourse ? '编辑课程' : '创建课程'}</DialogTitle>
            <DialogDescription>
              {editingCourse ? '修改课程信息' : '创建新的AI教学课程'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>课程名称</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="请输入课程名称"
              />
            </div>
            <div className="space-y-2">
              <Label>关联文档</Label>
              <Select
                value={form.document_id}
                onValueChange={(v) => setForm({ ...form, document_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择文档" />
                </SelectTrigger>
                <SelectContent>
                  {docs.map((d) => (
                    <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>描述（可选）</Label>
              <Textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="课程描述"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingCourse ? '保存' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
