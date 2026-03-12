'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2, Activity, Zap, Clock, DollarSign, CheckCircle } from 'lucide-react';
import { getUsageSummary, getUsageByScene, getUsageByDay, getUsageLogs, getUsageModels } from '@/lib/api-client';

const SCENE_LABELS: Record<string, string> = {
  mindmap: '思维导图生成',
  customer_generate: '虚拟客户生成',
  customer_chat: '客户对话',
  customer_feedback: '话术评价',
  teaching_start: 'AI教学出题',
  teaching_chat: 'AI教学评分',
  slides: 'PPT生成',
  knowledge_generate: '知识点生成',
  ai_assist: 'AI辅助对话',
  unknown: '其他',
};

function formatTokens(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(2) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

function formatCost(li: number): string {
  if (li === 0) return '¥0';
  if (li < 1000) return `¥${(li / 1000).toFixed(3)}`;
  return `¥${(li / 1000).toFixed(2)}`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return ms + 'ms';
  return (ms / 1000).toFixed(1) + 's';
}

function getDateRange(period: string): { start: string; end: string } {
  const now = new Date();
  const end = now.toISOString().slice(0, 10);
  let start = end;
  if (period === '7d') {
    const d = new Date(now); d.setDate(d.getDate() - 6); start = d.toISOString().slice(0, 10);
  } else if (period === '30d') {
    const d = new Date(now); d.setDate(d.getDate() - 29); start = d.toISOString().slice(0, 10);
  } else if (period === 'all') {
    start = '2020-01-01';
  }
  return { start, end };
}

export default function UsagePage() {
  const [period, setPeriod] = useState('30d');
  const [sceneFilter, setSceneFilter] = useState('all');
  const [modelFilter, setModelFilter] = useState('all');
  const [tab, setTab] = useState<'overview' | 'scenes' | 'daily' | 'logs'>('overview');
  const [loading, setLoading] = useState(true);
  const [modelOptions, setModelOptions] = useState<string[]>([]);

  const [summary, setSummary] = useState<{
    total_calls: number; success_calls: number; failed_calls: number;
    total_prompt_tokens: number; total_completion_tokens: number; total_tokens: number;
    total_cost: number; avg_duration: number;
  } | null>(null);

  const [byScene, setByScene] = useState<Array<{
    scene: string; total_calls: number; success_calls: number; failed_calls: number;
    total_tokens: number; total_cost: number; avg_duration: number;
  }>>([]);

  const [byDay, setByDay] = useState<Array<{
    date: string; total_calls: number; success_calls: number; failed_calls: number;
    total_tokens: number; total_cost: number;
  }>>([]);

  const [logs, setLogs] = useState<Array<Record<string, unknown>>>([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsPage, setLogsPage] = useState(1);

  const dateRange = getDateRange(period);

  // 加载模型列表
  useEffect(() => {
    getUsageModels().then(res => {
      if (res.success && res.data) setModelOptions(res.data);
    });
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = {
      start_date: dateRange.start,
      end_date: dateRange.end,
      ...(sceneFilter !== 'all' ? { scene: sceneFilter } : {}),
      ...(modelFilter !== 'all' ? { model_name: modelFilter } : {}),
    };

    if (tab === 'overview' || tab === 'scenes') {
      const [sumRes, sceneRes] = await Promise.all([
        getUsageSummary(params),
        getUsageByScene({ start_date: dateRange.start, end_date: dateRange.end, ...(modelFilter !== 'all' ? { model_name: modelFilter } : {}) }),
      ]);
      if (sumRes.success && sumRes.data) setSummary(sumRes.data);
      if (sceneRes.success && sceneRes.data) setByScene(sceneRes.data);
    }

    if (tab === 'daily') {
      const res = await getUsageByDay({ start_date: dateRange.start, end_date: dateRange.end, ...(modelFilter !== 'all' ? { model_name: modelFilter } : {}) });
      if (res.success && res.data) setByDay(res.data);
    }

    if (tab === 'logs') {
      const res = await getUsageLogs({ ...params, page: logsPage, page_size: 20 });
      if (res.success && res.data) {
        setLogs(res.data.items);
        setLogsTotal(res.data.total);
      }
    }

    setLoading(false);
  }, [period, sceneFilter, modelFilter, tab, logsPage]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold">用量统计</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={period} onValueChange={(v) => { setPeriod(v); setLogsPage(1); }}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="today">今天</SelectItem>
              <SelectItem value="7d">近7天</SelectItem>
              <SelectItem value="30d">近30天</SelectItem>
              <SelectItem value="all">全部</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sceneFilter} onValueChange={(v) => { setSceneFilter(v); setLogsPage(1); }}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部场景</SelectItem>
              {Object.entries(SCENE_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={modelFilter} onValueChange={(v) => { setModelFilter(v); setLogsPage(1); }}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部模型</SelectItem>
              {modelOptions.map(m => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex gap-1 border-b">
        {([['overview', '总览'], ['scenes', '按场景'], ['daily', '按日期'], ['logs', '调用明细']] as const).map(([key, label]) => (
          <button key={key} onClick={() => { setTab(key); setLogsPage(1); }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {tab === 'overview' && summary && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card><CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-50"><Activity className="h-5 w-5 text-blue-600" /></div>
                    <div><p className="text-sm text-muted-foreground">总调用次数</p><p className="text-2xl font-bold">{summary.total_calls}</p></div>
                  </div>
                </CardContent></Card>
                <Card><CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-50"><CheckCircle className="h-5 w-5 text-green-600" /></div>
                    <div><p className="text-sm text-muted-foreground">成功 / 失败</p>
                      <p className="text-2xl font-bold"><span className="text-green-600">{summary.success_calls}</span><span className="text-muted-foreground mx-1">/</span><span className="text-red-500">{summary.failed_calls}</span></p>
                    </div>
                  </div>
                </CardContent></Card>
                <Card><CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-50"><Zap className="h-5 w-5 text-purple-600" /></div>
                    <div><p className="text-sm text-muted-foreground">总Token消耗</p><p className="text-2xl font-bold">{formatTokens(summary.total_tokens)}</p></div>
                  </div>
                </CardContent></Card>
                <Card><CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-50"><DollarSign className="h-5 w-5 text-amber-600" /></div>
                    <div><p className="text-sm text-muted-foreground">预估费用</p><p className="text-2xl font-bold">{formatCost(summary.total_cost)}</p></div>
                  </div>
                </CardContent></Card>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground mb-1">输入Token</p><p className="text-lg font-semibold">{formatTokens(summary.total_prompt_tokens)}</p></CardContent></Card>
                <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground mb-1">输出Token</p><p className="text-lg font-semibold">{formatTokens(summary.total_completion_tokens)}</p></CardContent></Card>
                <Card><CardContent className="pt-6"><div className="flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" /><p className="text-sm text-muted-foreground">平均响应时间</p></div><p className="text-lg font-semibold mt-1">{formatDuration(summary.avg_duration)}</p></CardContent></Card>
              </div>
              {byScene.length > 0 && (
                <Card><CardHeader><CardTitle className="text-base">场景分布</CardTitle></CardHeader><CardContent>
                  <div className="space-y-3">
                    {byScene.map((s) => {
                      const pct = summary.total_calls > 0 ? Math.round(s.total_calls / summary.total_calls * 100) : 0;
                      return (
                        <div key={s.scene} className="flex items-center gap-3">
                          <span className="text-sm w-28 shrink-0">{SCENE_LABELS[s.scene] || s.scene}</span>
                          <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all" style={{ width: `${Math.max(pct, 2)}%` }} />
                          </div>
                          <span className="text-sm text-muted-foreground w-20 text-right">{s.total_calls}次 ({pct}%)</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent></Card>
              )}
            </div>
          )}

          {tab === 'scenes' && (
            <Card><CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>场景</TableHead><TableHead className="text-right">调用次数</TableHead><TableHead className="text-right">成功</TableHead><TableHead className="text-right">失败</TableHead><TableHead className="text-right">Token消耗</TableHead><TableHead className="text-right">预估费用</TableHead><TableHead className="text-right">平均耗时</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {byScene.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="h-32 text-center text-muted-foreground">暂无数据</TableCell></TableRow>
                  ) : byScene.map((s) => (
                    <TableRow key={s.scene}>
                      <TableCell className="font-medium">{SCENE_LABELS[s.scene] || s.scene}</TableCell>
                      <TableCell className="text-right">{s.total_calls}</TableCell>
                      <TableCell className="text-right text-green-600">{s.success_calls}</TableCell>
                      <TableCell className="text-right text-red-500">{s.failed_calls}</TableCell>
                      <TableCell className="text-right">{formatTokens(s.total_tokens)}</TableCell>
                      <TableCell className="text-right">{formatCost(s.total_cost)}</TableCell>
                      <TableCell className="text-right">{formatDuration(s.avg_duration)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent></Card>
          )}

          {tab === 'daily' && (
            <Card><CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>日期</TableHead><TableHead className="text-right">调用次数</TableHead><TableHead className="text-right">成功</TableHead><TableHead className="text-right">失败</TableHead><TableHead className="text-right">Token消耗</TableHead><TableHead className="text-right">预估费用</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {byDay.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground">暂无数据</TableCell></TableRow>
                  ) : byDay.map((d) => (
                    <TableRow key={d.date}>
                      <TableCell className="font-medium">{d.date}</TableCell>
                      <TableCell className="text-right">{d.total_calls}</TableCell>
                      <TableCell className="text-right text-green-600">{d.success_calls}</TableCell>
                      <TableCell className="text-right text-red-500">{d.failed_calls}</TableCell>
                      <TableCell className="text-right">{formatTokens(d.total_tokens)}</TableCell>
                      <TableCell className="text-right">{formatCost(d.total_cost)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent></Card>
          )}

          {tab === 'logs' && (
            <Card><CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>时间</TableHead><TableHead>场景</TableHead><TableHead>模型</TableHead><TableHead>调用人</TableHead><TableHead>状态</TableHead><TableHead className="text-right">Token</TableHead><TableHead className="text-right">费用</TableHead><TableHead className="text-right">耗时</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {logs.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="h-32 text-center text-muted-foreground">暂无数据</TableCell></TableRow>
                  ) : logs.map((log) => (
                    <TableRow key={String(log.id)}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{new Date(String(log.created_at)).toLocaleString('zh-CN')}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{SCENE_LABELS[String(log.scene)] || String(log.scene)}</Badge></TableCell>
                      <TableCell className="text-xs">{String(log.model_name)}</TableCell>
                      <TableCell className="text-xs">{log.username ? String(log.username) : <span className="text-muted-foreground">系统</span>}</TableCell>
                      <TableCell>
                        {log.status === 'success'
                          ? <Badge variant="default" className="bg-green-100 text-green-700 text-xs">成功</Badge>
                          : <Badge variant="destructive" className="text-xs">失败</Badge>}
                      </TableCell>
                      <TableCell className="text-right text-xs">{formatTokens(Number(log.total_tokens) || 0)}</TableCell>
                      <TableCell className="text-right text-xs">{formatCost(Number(log.cost) || 0)}</TableCell>
                      <TableCell className="text-right text-xs">{formatDuration(Number(log.duration_ms) || 0)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {logsTotal > 20 && (
                <div className="flex items-center justify-between border-t px-4 py-3">
                  <p className="text-sm text-muted-foreground">共 {logsTotal} 条</p>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" disabled={logsPage <= 1} onClick={() => setLogsPage(p => p - 1)}>上一页</Button>
                    <Button variant="outline" size="sm" disabled={logsPage >= Math.ceil(logsTotal / 20)} onClick={() => setLogsPage(p => p + 1)}>下一页</Button>
                  </div>
                </div>
              )}
            </CardContent></Card>
          )}
        </>
      )}
    </div>
  );
}
