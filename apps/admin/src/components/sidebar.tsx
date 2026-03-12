'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Users, Cpu, FileText, UserCircle, BookOpen, ClipboardList,
  FolderOpen, LogOut, GraduationCap, BarChart3, MessageSquareText, Home,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { clearToken, logout } from '@/lib/api-client';
import { toast } from 'sonner';
import type { User } from '@cs-training/shared';

const navItems = [
  { href: '/', label: '首页', icon: Home, exact: true },
  { href: '/accounts', label: '账号管理', icon: Users },
  { href: '/models', label: '模型管理', icon: Cpu },
  { href: '/prompts', label: '提示词管理', icon: MessageSquareText },
  { href: '/documents', label: '文档管理', icon: FileText },
  { href: '/customers', label: '虚拟顾客', icon: UserCircle },
  { href: '/courses', label: 'AI教学', icon: BookOpen },
  { href: '/records', label: '练习记录', icon: ClipboardList },
  { href: '/profiles', label: '客服档案', icon: FolderOpen },
  { href: '/usage', label: '用量统计', icon: BarChart3 },
];

interface SidebarProps {
  user: User | null;
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await logout();
    clearToken();
    toast.success('已退出登录');
    router.push('/login');
  }

  return (
    <aside className="flex h-screen w-60 flex-col border-r bg-white/80 backdrop-blur-sm shrink-0">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 px-5 border-b">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 shadow-sm">
          <GraduationCap className="h-4 w-4 text-white" />
        </div>
        <span className="font-semibold text-sm text-slate-800">容易学-运营后台</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200',
                isActive
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

      {/* User */}
      <div className="border-t p-3">
        <div className="flex items-center gap-2.5 px-2">
          <Avatar className="h-8 w-8 rounded-lg">
            <AvatarFallback className="rounded-lg text-xs bg-slate-100 text-slate-600">
              {user?.username?.charAt(0)?.toUpperCase() || 'A'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium text-slate-700">{user?.username || '管理员'}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.role === 'admin' ? '管理员' : '客服'}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-slate-400 hover:text-slate-600" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
