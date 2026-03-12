'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, MoreHorizontal, Pencil, Trash2, Star, Loader2, Cpu } from 'lucide-react';
import { toast } from 'sonner';
import { getModels, createModel, updateModel, deleteModel, setDefaultModel } from '@/lib/api-client';
import type { ModelConfig, ModelProvider } from '@cs-training/shared';

function maskKey(key: string) {
  if (key.length <= 8) return '****';
  return key.slice(0, 4) + '****' + key.slice(-4);
}

export default function ModelsPage() {
  const [models, setModels] = useState<ModelConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<ModelConfig | null>(null);
  const [form, setForm] = useState({
    provider: 'kimi' as ModelProvider,
    model_name: '',
    api_key: '',
    base_url: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchModels = useCallback(async () => {
    setLoading(true);
    const res = await getModels();
    if (res.success && res.data) {
      setModels(res.data.items || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchModels(); }, [fetchModels]);

  function openCreate() {
    setEditingModel(null);
    setForm({ provider: 'kimi', model_name: '', api_key: '', base_url: '' });
    setDialogOpen(true);
  }

  function openEdit(model: ModelConfig) {
    setEditingModel(model);
    setForm({
      provider: model.provider,
      model_name: model.model_name,
      api_key: '',
      base_url: model.base_url,
    });
    setDialogOpen(true);
  }

  async function handleSubmit() {
    if (!form.model_name.trim()) { toast.error('请输入模型名称'); return; }
    if (!editingModel && !form.api_key.trim()) { toast.error('请输入API Key'); return; }
    if (!form.base_url.trim()) { toast.error('请输入Base URL'); return; }

    setSubmitting(true);
    try {
      if (editingModel) {
        const input: Record<string, string> = {
          provider: form.provider,
          model_name: form.model_name,
          base_url: form.base_url,
        };
        if (form.api_key) input.api_key = form.api_key;
        const res = await updateModel(editingModel.id, input);
        if (res.success) { toast.success('更新成功'); setDialogOpen(false); fetchModels(); }
        else toast.error(res.error || '更新失败');
      } else {
        const res = await createModel(form);
        if (res.success) { toast.success('添加成功'); setDialogOpen(false); fetchModels(); }
        else toast.error(res.error || '添加失败');
      }
    } catch { toast.error('操作失败'); }
    setSubmitting(false);
  }

  async function handleSetDefault(id: number) {
    const res = await setDefaultModel(id);
    if (res.success) { toast.success('已设为默认'); fetchModels(); }
    else toast.error(res.error || '操作失败');
  }

  async function handleDelete(model: ModelConfig) {
    if (!confirm(`确定删除模型 "${model.model_name}" 吗？`)) return;
    const res = await deleteModel(model.id);
    if (res.success) { toast.success('删除成功'); fetchModels(); }
    else toast.error(res.error || '删除失败');
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">模型管理</h1>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          添加模型
        </Button>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : models.length === 0 ? (
        <Card>
          <CardContent className="flex h-64 flex-col items-center justify-center text-muted-foreground">
            <Cpu className="mb-3 h-12 w-12" />
            <p>暂未配置模型</p>
            <p className="text-sm">点击"添加模型"开始配置</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {models.map((model) => (
            <Card key={model.id} className="relative">
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div className="space-y-1">
                  <CardTitle className="text-base">{model.model_name}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{model.provider}</Badge>
                    {model.is_default && (
                      <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                        <Star className="mr-1 h-3 w-3" />
                        默认
                      </Badge>
                    )}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {!model.is_default && (
                      <DropdownMenuItem onClick={() => handleSetDefault(model.id)}>
                        <Star className="mr-2 h-4 w-4" />
                        设为默认
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => openEdit(model)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      编辑
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(model)}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      删除
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>API Key: <code className="rounded bg-muted px-1">{maskKey(model.api_key)}</code></p>
                  <p>Base URL: <span className="truncate">{model.base_url}</span></p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingModel ? '编辑模型' : '添加模型'}</DialogTitle>
            <DialogDescription>
              {editingModel ? '修改模型配置，API Key留空则不修改' : '配置新的AI模型'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Provider</Label>
              <Select
                value={form.provider}
                onValueChange={(v) => setForm({ ...form, provider: v as ModelProvider })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kimi">Kimi</SelectItem>
                  <SelectItem value="minimax">MiniMax</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>模型名称</Label>
              <Input
                value={form.model_name}
                onChange={(e) => setForm({ ...form, model_name: e.target.value })}
                placeholder="例如: moonshot-v1-8k"
              />
            </div>
            <div className="space-y-2">
              <Label>{editingModel ? 'API Key（留空不修改）' : 'API Key'}</Label>
              <Input
                type="password"
                value={form.api_key}
                onChange={(e) => setForm({ ...form, api_key: e.target.value })}
                placeholder={editingModel ? '留空则不修改' : '请输入API Key'}
              />
            </div>
            <div className="space-y-2">
              <Label>Base URL</Label>
              <Input
                value={form.base_url}
                onChange={(e) => setForm({ ...form, base_url: e.target.value })}
                placeholder="例如: https://api.moonshot.cn/v1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingModel ? '保存' : '添加'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
