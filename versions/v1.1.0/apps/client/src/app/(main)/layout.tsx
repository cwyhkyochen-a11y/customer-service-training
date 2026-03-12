'use client';

import { NavBar } from '@/components/nav-bar';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-50/60">
      <NavBar />
      <main className="flex-1 min-w-0 pb-20 md:pb-0">
        <div className="p-4 md:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
