'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import {
  FileText, GraduationCap, Users, MessageCircle, ClipboardList, UserCircle,
  ArrowRight, ChevronRight, BookOpen, Target, TrendingUp, Clock,
} from 'lucide-react';
import { getHomeStats, type HomeStats } from '@/lib/api';

const learningSteps = [
  { step: 1, icon: FileText, color: 'from-blue-500 to-cyan-500', title: '学文档', desc: '浏览话术文档，理解知识结构', href: '/documents' },
  { step: 2, icon: GraduationCap, color: 'from-violet-500 to-purple-500', title: 'AI 考试', desc: 'AI 出题，逐个攻克知识点', href: '/courses' },
  { step: 3, icon: Users, color: 'from-rose-500 to-pink-500', title: '对练实战', desc: '和虚拟顾客模拟真实场景', href: '/customers' },
  { step: 4, icon: MessageCircle, color: 'from-indigo-500 to-blue-500', title: 'AI 辅助', desc: '遇到难题，AI 帮你拟定回复', href: '/ai-assist' },
];

const quickLinks = [
  { icon: ClipboardList, label: '练习记录', href: '/records' },
  { icon: UserCircle, label: '我的档案', href: '/profile' },
];

export default function HomePage() {
  const router = useRouter();
  const [stats, setStats] = useState<HomeStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getHomeStats().then((res) => {
      if (res.success && res.data) setStats(res.data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="max-w-3xl pb-24 md:pb-6">
      {/* 顶部欢迎 */}
      <div className="flex items-center gap-3 mb-6">
        <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-200/50">
          <GraduationCap className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-slate-800">欢迎使用容易学</h1>
          <p className="text-sm text-muted-foreground">跟着下面的步骤开始练习吧</p>
        </div>
      </div>

      {/* 学习进度概览 */}
      {stats && !loading && (
        <div className="grid grid-cols-3 gap-3 mb-8">
          {/* 知识点 */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-600 p-4 shadow-lg shadow-indigo-500/20 group hover:shadow-xl hover:shadow-indigo-500/30 transition-all duration-300">
            <div className="absolute -right-3 -top-3 h-20 w-20 rounded-full bg-white/[0.08] blur-sm" />
            <div className="absolute -right-1 -bottom-1 h-12 w-12 rounded-full bg-white/[0.05]" />
            <div className="relative">
              <div className="flex items-center gap-1.5 mb-3">
                <Target className="h-3.5 w-3.5 text-indigo-200" />
                <span className="text-[11px] font-medium text-indigo-200">知识点</span>
              </div>
              <div className="flex items-end gap-0.5">
                <span className="text-3xl font-bold text-white tracking-tight leading-none">{stats.knowledge_mastered}</span>
                <span className="text-sm text-indigo-200 mb-0.5">/ {stats.knowledge_total}</span>
              </div>
              <div className="mt-3 h-1 w-full rounded-full bg-white/15 overflow-hidden">
                <div className="h-full rounded-full bg-white/80 transition-all duration-700" style={{ width: stats.knowledge_total > 0 ? `${Math.round((stats.knowledge_mastered / stats.knowledge_total) * 100)}%` : '0%' }} />
              </div>
            </div>
          </div>
          {/* 对练 */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-500 via-pink-500 to-fuchsia-500 p-4 shadow-lg shadow-rose-500/20 group hover:shadow-xl hover:shadow-rose-500/30 transition-all duration-300">
            <div className="absolute -right-3 -top-3 h-20 w-20 rounded-full bg-white/[0.08] blur-sm" />
            <div className="absolute -right-1 -bottom-1 h-12 w-12 rounded-full bg-white/[0.05]" />
            <div className="relative">
              <div className="flex items-center gap-1.5 mb-3">
                <TrendingUp className="h-3.5 w-3.5 text-rose-200" />
                <span className="text-[11px] font-medium text-rose-200">对练</span>
              </div>
              <div className="flex items-end gap-0.5">
                <span className="text-3xl font-bold text-white tracking-tight leading-none">{stats.customer_total}</span>
                {stats.customer_total > 0 && <span className="text-sm text-rose-200 mb-0.5">胜率 {Math.round((stats.customer_success / stats.customer_total) * 100)}%</span>}
              </div>
              <div className="mt-3 flex gap-1">
                {Array.from({ length: Math.min(stats.customer_total, 10) }).map((_, i) => (
                  <div key={i} className={`h-1.5 w-1.5 rounded-full ${i < stats.customer_success ? 'bg-white/80' : 'bg-white/20'}`} />
                ))}
                {stats.customer_total > 10 && <span className="text-[10px] text-rose-200 ml-0.5">+{stats.customer_total - 10}</span>}
              </div>
            </div>
          </div>
          {/* 今日 */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-orange-600 p-4 shadow-lg shadow-orange-500/20 group hover:shadow-xl hover:shadow-orange-500/30 transition-all duration-300">
            <div className="absolute -right-3 -top-3 h-20 w-20 rounded-full bg-white/[0.08] blur-sm" />
            <div className="absolute -right-1 -bottom-1 h-12 w-12 rounded-full bg-white/[0.05]" />
            <div className="relative">
              <div className="flex items-center gap-1.5 mb-3">
                <Clock className="h-3.5 w-3.5 text-amber-200" />
                <span className="text-[11px] font-medium text-amber-200">今日</span>
              </div>
              <div className="flex items-end gap-0.5">
                <span className="text-3xl font-bold text-white tracking-tight leading-none">{stats.today_count}</span>
                <span className="text-sm text-amber-200 mb-0.5">次练习</span>
              </div>
              <div className="mt-3 flex items-center gap-1">
                <div className={`h-1.5 w-1.5 rounded-full ${stats.today_count > 0 ? 'bg-white/80 animate-pulse' : 'bg-white/20'}`} />
                <span className="text-[10px] text-amber-200">{stats.today_count > 0 ? '今日活跃' : '还没有练习'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 学习路径 - 2x2 grid, no arrows */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="h-4 w-4 text-indigo-500" />
          <h2 className="text-sm font-semibold text-slate-800">学习路径</h2>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-4">
          {learningSteps.map((s) => (
            <div
              key={s.href}
              className="group cursor-pointer rounded-2xl p-5 relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              onClick={() => router.push(s.href)}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${s.color} opacity-[0.06] group-hover:opacity-[0.12] transition-opacity duration-300`} />
              <div className="absolute inset-0 rounded-2xl border border-slate-200/50 group-hover:border-slate-300/80 transition-all duration-300" />
              <div className="relative">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">Step {s.step}</span>
                  <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center shadow-md group-hover:shadow-lg group-hover:scale-110 transition-all duration-300`}>
                    <s.icon className="h-[18px] w-[18px] text-white" />
                  </div>
                </div>
                <h3 className="text-base font-bold text-slate-800">{s.title}</h3>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 text-center">
          <p className="text-[11px] text-muted-foreground/50">推荐按顺序学习 · 也可直接进入任意功能</p>
        </div>
      </div>

      {/* 快捷入口 */}
      <div className="grid grid-cols-2 gap-2.5">
        {quickLinks.map((link) => (
          <Card
            key={link.href}
            className="rounded-xl border shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-200 cursor-pointer group"
            onClick={() => router.push(link.href)}
          >
            <CardContent className="flex items-center gap-3 p-4">
              <link.icon className="h-4 w-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
              <span className="text-sm text-slate-600 group-hover:text-slate-800 transition-colors">{link.label}</span>
              <ChevronRight className="h-3 w-3 text-muted-foreground/30 ml-auto group-hover:text-primary transition-colors" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
