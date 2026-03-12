'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import {
  Users, Cpu, FileText, UserCircle, BookOpen, ClipboardList,
  FolderOpen, BarChart3, MessageSquareText, ArrowRight, Settings2,
} from 'lucide-react';

const sections = [
  {
    title: '系统配置',
    desc: '先完成基础配置，再开始使用',
    items: [
      { href: '/accounts', icon: Users, color: 'bg-blue-50 text-blue-600', title: '账号管理', desc: '创建和管理管理员、客服账号' },
      { href: '/models', icon: Cpu, color: 'bg-amber-50 text-amber-600', title: '模型管理', desc: '配置AI模型的API地址和密钥' },
      { href: '/prompts', icon: MessageSquareText, color: 'bg-indigo-50 text-indigo-600', title: '提示词管理', desc: '自定义各场景的AI提示词模板' },
    ],
  },
  {
    title: '内容管理',
    desc: '上传文档后生成教学内容',
    items: [
      { href: '/documents', icon: FileText, color: 'bg-emerald-50 text-emerald-600', title: '文档管理', desc: '上传话术文档，自动生成思维导图和PPT' },
      { href: '/customers', icon: UserCircle, color: 'bg-rose-50 text-rose-600', title: '虚拟顾客', desc: '管理AI生成的虚拟顾客角色' },
      { href: '/courses', icon: BookOpen, color: 'bg-violet-50 text-violet-600', title: 'AI教学', desc: '管理教学课程和知识点' },
    ],
  },
  {
    title: '数据查看',
    desc: '查看客服学习情况和系统用量',
    items: [
      { href: '/records', icon: ClipboardList, color: 'bg-slate-100 text-slate-600', title: '练习记录', desc: '查看所有客服的练习和对练记录' },
      { href: '/profiles', icon: FolderOpen, color: 'bg-cyan-50 text-cyan-600', title: '客服档案', desc: '按人查看学习进度和掌握情况' },
      { href: '/usage', icon: BarChart3, color: 'bg-purple-50 text-purple-600', title: '用量统计', desc: 'AI调用次数、Token消耗和费用' },
    ],
  },
];

export default function DashboardHomePage() {
  const router = useRouter();

  return (
    <div className="max-w-5xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-200/50">
          <Settings2 className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">容易学 · 运营后台</h1>
          <p className="text-sm text-muted-foreground">管理话术文档、AI教学内容和客服学习数据</p>
        </div>
      </div>

      {/* 使用流程提示 */}
      <Card className="rounded-xl border shadow-sm mb-8 bg-gradient-to-r from-indigo-50/80 to-purple-50/50 border-indigo-100">
        <CardContent className="p-5">
          <p className="text-sm font-medium text-indigo-700 mb-2">快速上手</p>
          <div className="flex items-center gap-2 text-xs text-indigo-600/80 flex-wrap">
            <span className="bg-white/80 px-2.5 py-1 rounded-lg border border-indigo-100">① 配置AI模型</span>
            <ArrowRight className="h-3 w-3 text-indigo-300" />
            <span className="bg-white/80 px-2.5 py-1 rounded-lg border border-indigo-100">② 上传话术文档</span>
            <ArrowRight className="h-3 w-3 text-indigo-300" />
            <span className="bg-white/80 px-2.5 py-1 rounded-lg border border-indigo-100">③ 生成虚拟顾客和课程</span>
            <ArrowRight className="h-3 w-3 text-indigo-300" />
            <span className="bg-white/80 px-2.5 py-1 rounded-lg border border-indigo-100">④ 客服登录学习</span>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-8">
        {sections.map((section) => (
          <div key={section.title}>
            <div className="mb-3">
              <h2 className="text-sm font-medium text-slate-700">{section.title}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{section.desc}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {section.items.map((item) => (
                <Card
                  key={item.href}
                  className="cursor-pointer rounded-xl border shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-200 group"
                  onClick={() => router.push(item.href)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${item.color}`}>
                        <item.icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-slate-800">{item.title}</p>
                          <ArrowRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-200" />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
