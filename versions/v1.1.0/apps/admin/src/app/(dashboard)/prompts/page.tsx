'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, RotateCcw, ChevronDown, ChevronRight, Info } from 'lucide-react';
import { toast } from 'sonner';
import { getPrompts, updatePrompt, resetPrompt } from '@/lib/api-client';
import type { PromptConfig } from '@/lib/api-client';

export default function PromptsPage() {
  const [prompts, setPrompts] = useState<PromptConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const fetchPrompts = useCallback(async () => {
    setLoading(true);
    const res = await getPrompts();
    if (res.success && res.data) {
      setPrompts(res.data);
      const vals: Record<string, string> = {};
      res.data.forEach(p => { vals[p.scene_id] = p.prompt_template; });
      setEditValues(vals);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchPrompts(); }, [fetchPrompts]);

  const handleSave = async (p: PromptConfig) => {
    const template = editValues[p.scene_id]?.trim();
    if (!template) { toast.error('提示词内容不能为空'); return; }
    setSaving(p.scene_id);
    const res = await updatePrompt({ scene_id: p.scene_id, prompt_template: template });
    if (res.success) {
      toast.success('保存成功');
      fetchPrompts();
    } else {
      toast.error(res.error || '保存失败');
    }
    setSaving(null);
  };

  const handleReset = async (p: PromptConfig) => {
    if (!confirm(`确定将「${p.scene_name}」的提示词重置为默认？`)) return;
    setSaving(p.scene_id);
    const res = await resetPrompt(p.scene_id);
    if (res.success) {
      toast.success('已重置为默认');
      setEditValues(prev => ({ ...prev, [p.scene_id]: '' }));
      fetchPrompts();
    } else {
      toast.error(res.error || '重置失败');
    }
    setSaving(null);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">提示词管理</h1>
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">提示词管理</h1>
          <p className="text-sm text-muted-foreground mt-1">配置各场景的 LLM 提示词模板，支持 {'{{变量}}'} 占位符</p>
        </div>
      </div>

      <div className="space-y-3">
        {prompts.map((p) => {
          const isExpanded = expandedId === p.scene_id;
          const hasChanges = editValues[p.scene_id] !== p.prompt_template;

          return (
            <Card key={p.scene_id}>
              <div
                className="flex items-center justify-between px-5 py-3.5 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : p.scene_id)}
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{p.scene_name}</span>
                      <Badge variant="outline" className="text-xs font-mono">{p.scene_id}</Badge>
                      {p.has_custom ? (
                        <Badge className="bg-green-100 text-green-700 text-xs">已自定义</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">默认</Badge>
                      )}
                    </div>
                    {p.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>
                    )}
                  </div>
                </div>
                {p.updated_at && (
                  <span className="text-xs text-muted-foreground">
                    更新于 {new Date(p.updated_at).toLocaleString('zh-CN')}
                  </span>
                )}
              </div>

              {isExpanded && (
                <CardContent className="pt-0 pb-4 px-5">
                  <div className="space-y-3">
                    <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
                      <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      <span>使用 {'{{变量名}}'} 作为占位符，系统会在调用时自动替换。留空表示使用系统内置默认提示词。</span>
                    </div>
                    <textarea
                      value={editValues[p.scene_id] || ''}
                      onChange={(e) => setEditValues(prev => ({ ...prev, [p.scene_id]: e.target.value }))}
                      placeholder="留空使用系统默认提示词..."
                      className="w-full min-h-[240px] p-3 text-sm font-mono border rounded-lg bg-background resize-y focus:outline-none focus:ring-2 focus:ring-primary/30"
                      spellCheck={false}
                    />
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-muted-foreground">
                        {editValues[p.scene_id]?.length || 0} 字符
                        {hasChanges && <span className="ml-2 text-amber-600">· 有未保存的修改</span>}
                      </div>
                      <div className="flex gap-2">
                        {p.has_custom && (
                          <Button variant="outline" size="sm" onClick={() => handleReset(p)} disabled={saving === p.scene_id}>
                            <RotateCcw className="mr-2 h-3.5 w-3.5" />
                            重置为默认
                          </Button>
                        )}
                        <Button size="sm" onClick={() => handleSave(p)} disabled={saving === p.scene_id || !editValues[p.scene_id]?.trim()}>
                          {saving === p.scene_id ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-2 h-3.5 w-3.5" />}
                          保存
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
