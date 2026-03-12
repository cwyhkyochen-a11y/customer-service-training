'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, Copy, Check, FileText, X, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { getDocuments, aiAssist } from '@/lib/api';
import type { Document } from '@/lib/api';

const MAX_DOCS = 5;

export default function AiAssistPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<number[]>([]);
  const [customerMessage, setCustomerMessage] = useState('');
  const [context, setContext] = useState('');
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(false);
  const [docsLoading, setDocsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadDocs() {
      setDocsLoading(true);
      const res = await getDocuments({ page: 1, page_size: 100 });
      if (res.success && res.data) {
        const doneDocs = res.data.items.filter(d => d.status === 'done');
        setDocuments(doneDocs);
      }
      setDocsLoading(false);
    }
    loadDocs();
  }, []);

  function toggleDoc(docId: number) {
    setSelectedDocIds(prev => {
      if (prev.includes(docId)) return prev.filter(id => id !== docId);
      if (prev.length >= MAX_DOCS) { toast.error(`最多选择${MAX_DOCS}个文档`); return prev; }
      return [...prev, docId];
    });
  }

  async function handleSubmit() {
    if (selectedDocIds.length === 0) { toast.error('请先选择参考文档'); return; }
    if (!customerMessage.trim()) { toast.error('请输入用户消息'); return; }

    setLoading(true);
    setReply('');
    const res = await aiAssist({
      document_ids: selectedDocIds,
      customer_message: customerMessage.trim(),
      context: context.trim() || undefined,
    });

    if (res.success && res.data) {
      setReply(res.data.reply);
    } else {
      toast.error(res.error || 'AI 生成失败，请重试');
    }
    setLoading(false);
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(reply);
      setCopied(true);
      toast.success('已复制到剪贴板');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('复制失败');
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-24 md:pb-6">
      {/* 标题 */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">AI辅助对话</h1>
          <p className="text-xs text-muted-foreground">选择话术文档 → 输入用户消息 → AI 帮你拟回复</p>
        </div>
      </div>

      {/* 步骤1: 选择文档 */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Badge className="bg-indigo-100 text-indigo-700 text-xs font-medium">1</Badge>
              <span className="text-sm font-medium">选择参考文档</span>
            </div>
            <span className="text-xs text-muted-foreground">
              已选 {selectedDocIds.length}/{MAX_DOCS}
            </span>
          </div>

          {docsLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" /> 加载文档...
            </div>
          ) : documents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">暂无可用文档</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {documents.map(doc => {
                const selected = selectedDocIds.includes(doc.id);
                return (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => toggleDoc(doc.id)}
                    className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all text-sm ${
                      selected
                        ? 'border-indigo-300 bg-indigo-50 ring-1 ring-indigo-200'
                        : 'border-border hover:border-muted-foreground/30 hover:bg-muted/30'
                    }`}
                  >
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                      selected ? 'bg-indigo-500 text-white' : 'bg-muted text-muted-foreground'
                    }`}>
                      <FileText className="h-4 w-4" />
                    </div>
                    <span className="truncate flex-1">{doc.name}</span>
                    {selected && (
                      <X className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 步骤2: 沟通背景 */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center gap-2 mb-3">
            <Badge className="bg-indigo-100 text-indigo-700 text-xs font-medium">2</Badge>
            <span className="text-sm font-medium">沟通背景</span>
            <span className="text-xs text-muted-foreground">(选填)</span>
          </div>
          <Textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="简要描述当前沟通的背景，例如：客户之前咨询过退货流程，现在对处理时效不满意..."
            className="min-h-[72px] resize-y text-sm"
          />
        </CardContent>
      </Card>

      {/* 步骤3: 用户消息 */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center gap-2 mb-3">
            <Badge className="bg-indigo-100 text-indigo-700 text-xs font-medium">3</Badge>
            <span className="text-sm font-medium">用户消息</span>
          </div>
          <Textarea
            value={customerMessage}
            onChange={(e) => setCustomerMessage(e.target.value)}
            placeholder="粘贴或输入用户发来的消息..."
            className="min-h-[96px] resize-y text-sm"
          />
        </CardContent>
      </Card>

      {/* 发送按钮 */}
      <Button
        onClick={handleSubmit}
        disabled={loading || selectedDocIds.length === 0 || !customerMessage.trim()}
        className="w-full h-11 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            AI 正在生成回复...
          </>
        ) : (
          <>
            <Send className="mr-2 h-4 w-4" />
            生成回复
          </>
        )}
      </Button>

      {/* AI 回复 */}
      {reply && (
        <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50/50 to-purple-50/30">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-500" />
                <span className="text-sm font-medium text-indigo-700">AI 建议回复</span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleCopy} className="h-8 text-xs">
                {copied ? <Check className="mr-1.5 h-3.5 w-3.5 text-green-600" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />}
                {copied ? '已复制' : '复制'}
              </Button>
            </div>
            <div className="text-sm leading-relaxed whitespace-pre-wrap bg-white rounded-lg p-4 border border-indigo-100 shadow-sm">
              {reply}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
