'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft, Plus, Sparkles, MoreHorizontal, Pencil, Trash2, Loader2, BookOpen,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getCourse, getKnowledgePoints, createKnowledgePoint, generateKnowledgePoints,
  updateKnowledgePoint, deleteKnowledgePoint, getDocument,
} from '@/lib/api-client';
import { NodeSelector } from '@/components/node-selector';
import type { Course, KnowledgePoint, MindmapNode } from '@cs-training/shared';

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = Number(params.id);

  const [course, setCourse] = useState<Course | null>(null);
  const [kps, setKps] = useState<KnowledgePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [mindmap, setMindmap] = useState<MindmapNode | null>(null);

  // Manual add dialog
  const [manualOpen, setManualOpen] = useState(false);
  const [editingKp, setEditingKp] = useState<KnowledgePoint | null>(null);
  const [kpForm, setKpForm] = useState({ title: '', content: '' });
  const [kpPaths, setKpPaths] = useState<string[][]>([]);
  const [submitting, setSubmitting] = useState(false);

  // AI generate dialog
  const [genOpen, setGenOpen] = useState(false);
  const [genPaths, setGenPaths] = useState<string[][]>([]);
  const [generating, setGenerating] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [courseRes, kpRes] = await Promise.all([
      getCourse(courseId),
      getKnowledgePoints(courseId),
    ]);
    if (courseRes.success && courseRes.data) {
      setCourse(courseRes.data);
      // Load mindmap
      const docRes = await getDocument(courseRes.data.document_id);
      if (docRes.success && docRes.data?.mindmap_json) {
        const data = typeof docRes.data.mindmap_json === 'string'
          ? JSON.parse(docRes.data.mindmap_json) : docRes.data.mindmap_json;
        setMindmap(data);
      }
    }
    if (kpRes.success && kpRes.data) {
      setKps(kpRes.data.items || []);
    }
    setLoading(false);
  }, [courseId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function openManualAdd() {
    setEditingKp(null);
    setKpForm({ title: '', content: '' });
    setKpPaths([]);
    setManualOpen(true);
  }

  function openEditKp(kp: KnowledgePoint) {
    setEditingKp(kp);
    setKpForm({ title: kp.title, content: kp.content });
    setKpPaths(Array.isArray(kp.node_path?.[0]) ? (kp.node_path as unknown as string[][]) : [kp.node_path]);
    setManualOpen(true);
  }

  async function handleKpSubmit() {
    if (!kpForm.title.trim()) { toast.error('请输入标题'); return; }
    if (!kpForm.content.trim()) { toast.error('请输入内容'); return; }
    if (kpPaths.length === 0) { toast.error('请选择节点'); return; }

    setSubmitting(true);
    try {
      const input = { node_path: kpPaths as any, title: kpForm.title, content: kpForm.content };
      if (editingKp) {
        const res = await updateKnowledgePoint(courseId, editingKp.id, input);
        if (res.success) { toast.success('更新成功'); setManualOpen(false); fetchData(); }
        else toast.error(res.error || '更新失败');
      } else {
        const res = await createKnowledgePoint(courseId, input);
        if (res.success) { toast.success('添加成功'); setManualOpen(false); fetchData(); }
        else toast.error(res.error || '添加失败');
      }
    } catch { toast.error('操作失败'); }
    setSubmitting(false);
  }

  async function handleGenerate() {
    if (genPaths.length === 0) { toast.error('请选择节点'); return; }
    if (!course) return;

    setGenerating(true);
    try {
      const res = await generateKnowledgePoints(courseId, {
        document_id: course.document_id,
        node_path: genPaths as any,
      });
      if (res.success) {
        toast.success('生成成功');
        setGenOpen(false);
        fetchData();
      } else {
        toast.error(res.error || '生成失败');
      }
    } catch { toast.error('生成失败'); }
    setGenerating(false);
  }

  async function handleDeleteKp(kp: KnowledgePoint) {
    if (!confirm(`确定删除知识点 "${kp.title}" 吗？`)) return;
    const res = await deleteKnowledgePoint(courseId, kp.id);
    if (res.success) { toast.success('删除成功'); fetchData(); }
    else toast.error(res.error || '删除失败');
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => router.push('/courses')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回
        </Button>
        <p className="text-center text-muted-foreground">课程不存在</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/courses')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-semibold">{course.name}</h1>
      </div>

      {/* Course info card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">课程信息</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 text-sm sm:grid-cols-3">
            <div>
              <span className="text-muted-foreground">关联文档：</span>
              {course.document_name || '-'}
            </div>
            <div>
              <span className="text-muted-foreground">知识点数量：</span>
              {kps.length}
            </div>
            <div>
              <span className="text-muted-foreground">创建时间：</span>
              {new Date(course.created_at).toLocaleString('zh-CN')}
            </div>
          </div>
          {course.description && (
            <p className="mt-2 text-sm text-muted-foreground">{course.description}</p>
          )}
        </CardContent>
      </Card>

      {/* Knowledge points */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">知识点列表</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setGenPaths([]); setGenOpen(true); }}>
            <Sparkles className="mr-2 h-4 w-4" />
            AI生成
          </Button>
          <Button onClick={openManualAdd}>
            <Plus className="mr-2 h-4 w-4" />
            手动添加
          </Button>
        </div>
      </div>

      {kps.length === 0 ? (
        <Card>
          <CardContent className="flex h-40 flex-col items-center justify-center text-muted-foreground">
            <BookOpen className="mb-2 h-8 w-8" />
            <p>暂无知识点</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {kps.map((kp) => (
            <Card key={kp.id}>
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div className="space-y-1">
                  <CardTitle className="text-base">{kp.title}</CardTitle>
                  <div className="flex gap-1">
                    {kp.node_path.map((p, i) => (
                      <Badge key={i} variant="outline" className="text-xs">{p}</Badge>
                    ))}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEditKp(kp)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      编辑
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteKp(kp)}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      删除
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{kp.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Manual Add/Edit Dialog */}
      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingKp ? '编辑知识点' : '添加知识点'}</DialogTitle>
            <DialogDescription>填写知识点信息</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>标题</Label>
              <Input
                value={kpForm.title}
                onChange={(e) => setKpForm({ ...kpForm, title: e.target.value })}
                placeholder="知识点标题"
              />
            </div>
            {mindmap && (
              <div className="space-y-2">
                <Label>选择节点</Label>
                <NodeSelector data={mindmap} selectedPaths={kpPaths} onSelect={setKpPaths} />
              </div>
            )}
            <div className="space-y-2">
              <Label>内容</Label>
              <Textarea
                rows={5}
                value={kpForm.content}
                onChange={(e) => setKpForm({ ...kpForm, content: e.target.value })}
                placeholder="知识点内容"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManualOpen(false)}>取消</Button>
            <Button onClick={handleKpSubmit} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingKp ? '保存' : '添加'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Generate Dialog */}
      <Dialog open={genOpen} onOpenChange={setGenOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>AI生成知识点</DialogTitle>
            <DialogDescription>选择节点，AI将自动生成相关知识点</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {mindmap ? (
              <div className="space-y-2">
                <Label>选择节点</Label>
                <NodeSelector data={mindmap} selectedPaths={genPaths} onSelect={setGenPaths} />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">无法加载思维导图</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenOpen(false)}>取消</Button>
            <Button onClick={handleGenerate} disabled={generating}>
              {generating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              生成
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
