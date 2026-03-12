'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  FileText,
  GraduationCap,
  Users,
  ClipboardList,
  UserCircle,
  MessageCircle,
  Home,
} from 'lucide-react';

const navItems = [
  { href: '/', label: '首页', icon: Home, exact: true },
  { href: '/documents', label: '文档学习', icon: FileText },
  { href: '/courses', label: 'AI教学', icon: GraduationCap },
  { href: '/customers', label: '虚拟顾客', icon: Users },
  { href: '/ai-assist', label: 'AI辅助', icon: MessageCircle },
  { href: '/records', label: '练习记录', icon: ClipboardList },
  { href: '/profile', label: '我的档案', icon: UserCircle },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 border-r bg-white/80 backdrop-blur-sm h-screen sticky top-0 shrink-0">
        <div className="flex items-center gap-2.5 px-5 h-14 border-b">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
            <GraduationCap className="h-4 w-4 text-white" />
          </div>
          <span className="font-semibold text-sm text-slate-800">容易学</span>
        </div>
        <nav className="flex-1 py-3 px-3 space-y-0.5">
          {navItems.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200',
                  active
                    ? 'bg-indigo-50 text-indigo-600 font-medium'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                )}
              >
                <item.icon className="h-[18px] w-[18px] shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-5 py-3 border-t">
          <p className="text-[10px] text-muted-foreground/50">容易学 · 话术辅助系统</p>
        </div>
      </aside>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-t safe-area-bottom">
        <div className="flex items-center justify-around h-14 max-w-lg mx-auto">
          {navItems.filter(i => !i.exact).slice(0, 5).map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] transition-colors',
                  active ? 'text-indigo-600' : 'text-slate-400'
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
