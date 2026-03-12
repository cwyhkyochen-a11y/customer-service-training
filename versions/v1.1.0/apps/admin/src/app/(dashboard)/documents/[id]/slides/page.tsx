'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { getSlides, generateSlides, updateSlide, deleteSlides } from '@/lib/api-client';
import { toast } from 'sonner';
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2, RefreshCw, Pencil, Check, X, Code, Eye, Trash2 } from 'lucide-react';

interface Slide {
  id: number;
  page_number: number;
  title: string;
  html_content: string;
}

export default function SlidesPage() {
  const params = useParams();
  const router = useRouter();
  const docId = Number(params.id);

  const [slides, setSlides] = useState<Slide[]>([]);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editHtml, setEditHtml] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState<'code' | 'preview'>('code');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { loadSlides(); }, []);

  useEffect(() => {
    if (editing) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        setCurrent(c => Math.max(0, c - 1));
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
        setCurrent(c => Math.min(slides.length - 1, c + 1));
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [slides.length, editing]);

  const loadSlides = async () => {
    setLoading(true);
    const res = await getSlides(docId);
    if (res.success && res.data) {
      setSlides(res.data);
    }
    setLoading(false);
  };

  const handleRegenerate = async () => {
    if (!confirm('重新生成将覆盖所有现有PPT内容，确定继续？')) return;
    setRegenerating(true);
    setEditing(false);
    toast.info('正在重新生成PPT，请稍候...');
    const res = await generateSlides(docId);
    if (res.success) {
      toast.success(res.message || 'PPT重新生成成功');
      setCurrent(0);
      await loadSlides();
    } else {
      toast.error(res.error || '生成失败');
    }
    setRegenerating(false);
  };

  const startEdit = () => {
    const slide = slides[current];
    if (!slide) return;
    setEditHtml(slide.html_content);
    setEditTitle(slide.title);
    setEditing(true);
    setEditMode('code');
  };

  const cancelEdit = () => {
    setEditing(false);
    setEditHtml('');
    setEditTitle('');
  };

  const handleDeleteAll = async () => {
    if (!confirm('确定删除所有PPT数据？此操作不可恢复。')) return;
    const res = await deleteSlides(docId);
    if (res.success) {
      toast.success('PPT数据已删除');
      setSlides([]);
      setCurrent(0);
      setEditing(false);
    } else {
      toast.error(res.error || '删除失败');
    }
  };

  const saveEdit = async () => {
    const slide = slides[current];
    if (!slide) return;
    setSaving(true);
    const res = await updateSlide(docId, slide.id, {
      title: editTitle,
      html_content: editHtml,
    });
    if (res.success && res.data) {
      const updated = [...slides];
      updated[current] = { ...updated[current], title: res.data.title, html_content: res.data.html_content };
      setSlides(updated);
      setEditing(false);
      toast.success('保存成功');
    } else {
      toast.error(res.error || '保存失败');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (slides.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-semibold">PPT课件</h1>
        </div>
        <div className="text-center py-16 text-muted-foreground">
          <p className="mb-4">暂无PPT内容，请先生成</p>
          <Button onClick={handleRegenerate} disabled={regenerating}>
            {regenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            生成PPT
          </Button>
        </div>
      </div>
    );
  }

  const slide = slides[current];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-semibold">PPT课件</h1>
          <span className="text-sm text-muted-foreground">
            {current + 1} / {slides.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {!editing ? (
            <>
              <Button variant="outline" size="sm" onClick={startEdit}>
                <Pencil className="mr-2 h-4 w-4" />
                编辑此页
              </Button>
              <Button variant="outline" size="sm" onClick={handleRegenerate} disabled={regenerating}>
                {regenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                全部重新生成
              </Button>
              <Button variant="outline" size="sm" onClick={handleDeleteAll} className="text-destructive hover:text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                删除PPT
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => setEditMode(editMode === 'code' ? 'preview' : 'code')}>
                {editMode === 'code' ? <Eye className="mr-2 h-4 w-4" /> : <Code className="mr-2 h-4 w-4" />}
                {editMode === 'code' ? '预览' : '代码'}
              </Button>
              <Button variant="default" size="sm" onClick={saveEdit} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                保存
              </Button>
              <Button variant="ghost" size="sm" onClick={cancelEdit}>
                <X className="mr-2 h-4 w-4" />
                取消
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Edit title */}
      {editing && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground shrink-0">标题：</span>
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="flex-1 px-3 py-1.5 text-sm border rounded-md bg-background"
          />
        </div>
      )}

      {/* Main content area */}
      <div className="flex items-start gap-4">
        <Button
          variant="ghost"
          size="icon"
          disabled={current <= 0 || editing}
          onClick={() => setCurrent(c => c - 1)}
          className="shrink-0 mt-[calc(28vh)]"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        {editing ? (
          <div className="flex-1 flex gap-4" style={{ minHeight: '56vh' }}>
            {editMode === 'code' ? (
              <textarea
                ref={textareaRef}
                value={editHtml}
                onChange={(e) => setEditHtml(e.target.value)}
                className="flex-1 font-mono text-xs p-4 border rounded-xl bg-slate-50 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                style={{ minHeight: '56vh' }}
                spellCheck={false}
              />
            ) : (
              <div className="flex-1 aspect-[16/9] bg-white rounded-xl shadow-lg border overflow-auto">
                <div
                  className="w-full h-full"
                  dangerouslySetInnerHTML={{ __html: editHtml }}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 aspect-[16/9] bg-white rounded-xl shadow-lg border overflow-hidden">
            <div
              className="w-full h-full overflow-auto"
              dangerouslySetInnerHTML={{ __html: slide.html_content }}
            />
          </div>
        )}

        <Button
          variant="ghost"
          size="icon"
          disabled={current >= slides.length - 1 || editing}
          onClick={() => setCurrent(c => c + 1)}
          className="shrink-0 mt-[calc(28vh)]"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Slide title */}
      {!editing && slide.title && (
        <p className="text-center text-sm text-muted-foreground">{slide.title}</p>
      )}

      {/* Thumbnail strip */}
      <div className="flex gap-2 overflow-x-auto pb-2 px-1">
        {slides.map((s, i) => (
          <button
            key={s.id}
            onClick={() => { if (!editing) setCurrent(i); }}
            className={`shrink-0 w-24 h-14 rounded border-2 overflow-hidden text-[4px] leading-tight transition-all ${
              i === current
                ? 'border-primary shadow-md'
                : editing
                  ? 'border-transparent opacity-50 cursor-not-allowed'
                  : 'border-transparent hover:border-muted-foreground/30'
            }`}
          >
            <div
              className="w-full h-full bg-white overflow-hidden pointer-events-none"
              style={{ transform: 'scale(0.15)', transformOrigin: 'top left', width: '666%', height: '666%' }}
              dangerouslySetInnerHTML={{ __html: s.html_content }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
