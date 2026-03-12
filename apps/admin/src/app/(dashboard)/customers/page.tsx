'use client';

import { useEffect, useState, useCallback } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Plus, Sparkles, MoreHorizontal, Pencil, Trash2, Loader2, UserCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
  getCustomers, createCustomer, generateCustomer, updateCustomer, deleteCustomer,
  getDocuments,
  getDocument,
} from '@/lib/api-client';
import { NodeSelector } from '@/components/node-selector';
import type { VirtualCustomer, Document, MindmapNode } from '@cs-training/shared';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<VirtualCustomer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const pageSize = 10;

  // Manual create dialog
  const [manualOpen, setManualOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<VirtualCustomer | null>(null);
  const [docs, setDocs] = useState<Document[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null);
  const [mindmap, setMindmap] = useState<MindmapNode | null>(null);
  const [selectedPaths, setSelectedPaths] = useState<string[][]>([]);
  const [manualForm, setManualForm] = useState({
    name: '', age: '', gender: '' as '' | 'male' | 'female',
    demand: '', mood: '', persona_prompt: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // AI generate dialog
  const [genOpen, setGenOpen] = useState(false);
  const [genDocId, setGenDocId] = useState<number | null>(null);
  const [genMindmap, setGenMindmap] = useState<MindmapNode | null>(null);
  const [genPaths, setGenPaths] = useState<string[][]>([]);
  const [genPrompt, setGenPrompt] = useState('');
  const [genSceneType, setGenSceneType] = useState<'pre_sale' | 'after_sale'>('after_sale');
  const [generating, setGenerating] = useState(false);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    const res = await getCustomers({ page, page_size: pageSize });
    if (res.success && res.data) {
      setCustomers(res.data.items);
      setTotal(res.data.total);
    }
    setLoading(false);
  }, [page]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  async function loadDocs() {
    const res = await getDocuments({ page: 1, page_size: 100 });
    if (res.success && res.data) setDocs(res.data.items.filter((d) => d.status === 'done'));
  }

  async function loadMindmap(docId: number, setter: (m: MindmapNode | null) => void) {
    const res = await getDocument(docId);
    if (res.success && res.data?.mindmap_json) {
      const data = typeof res.data.mindmap_json === 'string'
        ? JSON.parse(res.data.mindmap_json) : res.data.mindmap_json;
      setter(data);
    } else {
      setter(null);
    }
  }

  function openManualCreate() {
    setEditingCustomer(null);
    setManualForm({ name: '', age: '', gender: '', demand: '', mood: '', persona_prompt: '' });
    setSelectedDocId(null);
    setMindmap(null);
    setSelectedPaths([]);
    loadDocs();
    setManualOpen(true);
  }

  function openEdit(c: VirtualCustomer) {
    setEditingCustomer(c);
    setManualForm({
      name: c.name,
      age: c.age?.toString() || '',
      gender: c.gender || '',
      demand: c.demand,
      mood: c.mood,
      persona_prompt: c.persona_prompt,
    });
    setSelectedDocId(c.document_id);
    setSelectedPaths(Array.isArray(c.node_path?.[0]) ? (c.node_path as unknown as string[][]) : [c.node_path]);
    loadDocs();
    loadMindmap(c.document_id, setMindmap);
    setManualOpen(true);
  }

  async function handleManualSubmit() {
    if (!manualForm.name.trim()) { toast.error('请输入姓名'); return; }
    if (!selectedDocId) { toast.error('请选择关联文档'); return; }
    if (selectedPaths.length === 0) { toast.error('请选择节点'); return; }
    if (!manualForm.demand.trim()) { toast.error('请输入诉求'); return; }
    if (!manualForm.mood.trim()) { toast.error('请输入心情'); return; }
    if (!manualForm.persona_prompt.trim()) { toast.error('请输入人设提示词'); return; }

    setSubmitting(true);
    try {
      const input = {
        document_id: selectedDocId,
        node_path: selectedPaths as any,
        name: manualForm.name,
        age: manualForm.age ? Number(manualForm.age) : undefined,
        gender: manualForm.gender || undefined,
        demand: manualForm.demand,
        mood: manualForm.mood,
        persona_prompt: manualForm.persona_prompt,
      };
      if (editingCustomer) {
        const res = await updateCustomer(editingCustomer.id, input);
        if (res.success) { toast.success('更新成功'); setManualOpen(false); fetchCustomers(); }
        else toast.error(res.error || '更新失败');
      } else {
        const res = await createCustomer(input as any);
        if (res.success) { toast.success('创建成功'); setManualOpen(false); fetchCustomers(); }
        else toast.error(res.error || '创建失败');
      }
    } catch { toast.error('操作失败'); }
    setSubmitting(false);
  }

  function openGenerate() {
    setGenDocId(null);
    setGenMindmap(null);
    setGenPaths([]);
    setGenPrompt('');
    setGenSceneType('after_sale');
    loadDocs();
    setGenOpen(true);
  }

  async function handleGenerate() {
    if (!genDocId) { toast.error('请选择文档'); return; }
    if (genPaths.length === 0) { toast.error('请选择节点'); return; }
    if (!genPrompt.trim()) { toast.error('请输入提示词'); return; }

    setGenerating(true);
    try {
      const res = await generateCustomer({
        document_id: genDocId,
        node_path: genPaths as any,
        prompt: genPrompt,
        scene_type: genSceneType,
      } as any);
      if (res.success) {
        toast.success('生成成功');
        setGenOpen(false);
        fetchCustomers();
      } else {
        toast.error(res.error || '生成失败');
      }
    } catch { toast.error('生成失败'); }
    setGenerating(false);
  }

  async function handleDelete(c: VirtualCustomer) {
    if (!confirm(`确定删除虚拟顾客 "${c.name}" 吗？`)) return;
    const res = await deleteCustomer(c.id);
    if (res.success) { toast.success('删除成功'); fetchCustomers(); }
    else toast.error(res.error || '删除失败');
  }

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">虚拟顾客管理</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={openGenerate}>
            <Sparkles className="mr-2 h-4 w-4" />
            AI生成
          </Button>
          <Button onClick={openManualCreate}>
            <Plus className="mr-2 h-4 w-4" />
            手动添加
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>姓名</TableHead>
                <TableHead>关联文档</TableHead>
                <TableHead>年龄</TableHead>
                <TableHead>性别</TableHead>
                <TableHead>问题</TableHead>
                <TableHead>心情</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead className="w-16">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                    <UserCircle className="mx-auto mb-2 h-8 w-8" />
                    暂无虚拟顾客
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-muted-foreground">{c.document_name || '-'}</TableCell>
                    <TableCell>{c.age || '-'}</TableCell>
                    <TableCell>
                      {c.gender ? (
                        <Badge variant="outline">{c.gender === 'male' ? '男' : '女'}</Badge>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="max-w-32 truncate">{(c as any).question || c.demand}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{c.mood}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(c.created_at).toLocaleString('zh-CN')}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(c)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            编辑
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(c)}>
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

      {/* Manual Create/Edit Dialog */}
      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCustomer ? '编辑虚拟顾客' : '手动添加虚拟顾客'}</DialogTitle>
            <DialogDescription>填写虚拟顾客的详细信息</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>姓名</Label>
                <Input
                  value={manualForm.name}
                  onChange={(e) => setManualForm({ ...manualForm, name: e.target.value })}
                  placeholder="顾客姓名"
                />
              </div>
              <div className="space-y-2">
                <Label>年龄</Label>
                <Input
                  type="number"
                  value={manualForm.age}
                  onChange={(e) => setManualForm({ ...manualForm, age: e.target.value })}
                  placeholder="年龄"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>性别</Label>
              <Select
                value={manualForm.gender}
                onValueChange={(v) => setManualForm({ ...manualForm, gender: v as 'male' | 'female' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择性别" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">男</SelectItem>
                  <SelectItem value="female">女</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>关联文档</Label>
              <Select
                value={selectedDocId?.toString() || ''}
                onValueChange={(v) => {
                  const id = Number(v);
                  setSelectedDocId(id);
                  setSelectedPaths([]);
                  loadMindmap(id, setMindmap);
                }}
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
            {mindmap && (
              <div className="space-y-2">
                <Label>选择节点</Label>
                <NodeSelector data={mindmap} selectedPaths={selectedPaths} onSelect={setSelectedPaths} />
              </div>
            )}
            <div className="space-y-2">
              <Label>诉求</Label>
              <Input
                value={manualForm.demand}
                onChange={(e) => setManualForm({ ...manualForm, demand: e.target.value })}
                placeholder="顾客的诉求"
              />
            </div>
            <div className="space-y-2">
              <Label>心情</Label>
              <Input
                value={manualForm.mood}
                onChange={(e) => setManualForm({ ...manualForm, mood: e.target.value })}
                placeholder="例如：焦虑、愤怒、平静"
              />
            </div>
            <div className="space-y-2">
              <Label>人设提示词</Label>
              <Textarea
                rows={3}
                value={manualForm.persona_prompt}
                onChange={(e) => setManualForm({ ...manualForm, persona_prompt: e.target.value })}
                placeholder="描述虚拟顾客的人设和行为特征"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManualOpen(false)}>取消</Button>
            <Button onClick={handleManualSubmit} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingCustomer ? '保存' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Generate Dialog */}
      <Dialog open={genOpen} onOpenChange={setGenOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>AI生成虚拟顾客</DialogTitle>
            <DialogDescription>选择文档和节点，AI将自动生成虚拟顾客</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>选择文档</Label>
              <Select
                value={genDocId?.toString() || ''}
                onValueChange={(v) => {
                  const id = Number(v);
                  setGenDocId(id);
                  setGenPaths([]);
                  loadMindmap(id, setGenMindmap);
                }}
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
            {genMindmap && (
              <div className="space-y-2">
                <Label>选择节点</Label>
                <NodeSelector data={genMindmap} selectedPaths={genPaths} onSelect={setGenPaths} />
              </div>
            )}
            <div className="space-y-2">
              <Label>提示词</Label>
              <Textarea
                rows={3}
                value={genPrompt}
                onChange={(e) => setGenPrompt(e.target.value)}
                placeholder="描述你想要生成的虚拟顾客特征..."
              />
            </div>
            <div className="space-y-2">
              <Label>对话场景</Label>
              <Select value={genSceneType} onValueChange={(v) => setGenSceneType(v as 'pre_sale' | 'after_sale')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="after_sale">售后服务</SelectItem>
                  <SelectItem value="pre_sale">售前咨询</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
