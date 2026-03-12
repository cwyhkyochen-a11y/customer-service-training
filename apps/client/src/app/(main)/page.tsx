'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import {
  FileText, GraduationCap, Users, MessageCircle, ClipboardList, UserCircle,
  ArrowRight, Sparkles,
} from 'lucide-react';

const features = [
  {
    href: '/documents',
    icon: FileText,
    color: 'bg-blue-50 text-blue-600',
    title: '文档学习',
    desc: '查看话术文档的知识结构和PPT课件',
  },
  {
    href: '/courses',
    icon: GraduationCap,
    color: 'bg-violet-50 text-violet-600',
    title: 'AI教学',
    desc: 'AI出题考核，逐个掌握知识点',
  },
  {
    href: '/customers',
    icon: Users,
    color: 'bg-rose-50 text-rose-600',
    title: '虚拟顾客',
    desc: '和AI模拟顾客对练，提升应变能力',
  },
  {
    href: '/ai-assist',
    icon: MessageCircle,
    color: 'bg-indigo-50 text-indigo-600',
    title: 'AI辅助对话',
    desc: '输入用户消息，AI帮你拟定专业回复',
  },
  {
    href: '/records',
    icon: ClipboardList,
    color: 'bg-slate-100 text-slate-600',
    title: '练习记录',
    desc: '查看教学和对练的历史记录',
  },
  {
    href: '/profile',
    icon: UserCircle,
    color: 'bg-emerald-50 text-emerald-600',
    title: '我的档案',
    desc: '按文档维度查看学习进度',
  },
];

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-200/50">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-slate-800">欢迎使用容易学</h1>
          <p className="text-sm text-muted-foreground">选择下方功能开始学习</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {features.map((f) => (
          <Card
            key={f.href}
            className="cursor-pointer rounded-xl border shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-200 group"
            onClick={() => router.push(f.href)}
          >
            <CardContent className="flex items-start gap-4 p-5">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${f.color}`}>
                <f.icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-800">{f.title}</p>
                  <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-200" />
                </div>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{f.desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
