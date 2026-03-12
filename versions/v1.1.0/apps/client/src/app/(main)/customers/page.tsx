'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getCustomers } from '@/lib/api';
import { toast } from 'sonner';
import { Users, Loader2, MessageCircle, ArrowRight } from 'lucide-react';
import type { VirtualCustomer } from '@/lib/api';

const moodEmoji: Record<string, string> = {
  '开心': '😊', '高兴': '😊', '焦虑': '😰', '紧张': '😰',
  '愤怒': '😠', '生气': '😠', '平静': '😐', '冷静': '😐',
  '失望': '😞', '沮丧': '😞', '着急': '😰', '不满': '😠',
  '困惑': '🤔', '担忧': '😟',
};

function getMoodEmoji(mood: string): string {
  for (const [key, emoji] of Object.entries(moodEmoji)) {
    if (mood.includes(key)) return emoji;
  }
  return '😐';
}

const avatarColors = [
  'bg-blue-100 text-blue-700', 'bg-violet-100 text-violet-700',
  'bg-rose-100 text-rose-700', 'bg-amber-100 text-amber-700',
  'bg-emerald-100 text-emerald-700', 'bg-cyan-100 text-cyan-700',
  'bg-pink-100 text-pink-700',
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<VirtualCustomer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    const res = await getCustomers({ page_size: 100 });
    if (res.success && res.data) {
      setCustomers(res.data.items);
    } else {
      toast.error(res.error || '加载虚拟顾客失败');
    }
    setLoading(false);
  };

  const grouped = customers.reduce<Record<string, VirtualCustomer[]>>((acc, c) => {
    const key = c.document_name || `文档 ${c.document_id}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(c);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-800">虚拟顾客</h1>
        <p className="text-sm text-muted-foreground mt-1">选择顾客开始对练，提升话术能力</p>
      </div>

      {customers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Users className="h-12 w-12 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground mt-3">暂无虚拟顾客</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([docName, items]) => (
            <div key={docName}>
              <div className="flex items-center gap-2 mb-3">
                <MessageCircle className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-medium text-slate-600">{docName}</h2>
                <Badge variant="secondary" className="text-[11px]">{items.length}位</Badge>
              </div>
              <div className="space-y-2">
                {items.map((customer) => {
                  const emoji = getMoodEmoji(customer.mood);
                  const avatarColor = getAvatarColor(customer.name);
                  return (
                    <Card
                      key={customer.id}
                      className="cursor-pointer rounded-xl border shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-200 group"
                      onClick={() => router.push(`/customers/${customer.id}/practice`)}
                    >
                      <CardContent className="flex items-center gap-4 p-4">
                        <Avatar className="h-11 w-11 shrink-0 rounded-xl">
                          <AvatarFallback className={`rounded-xl text-sm font-medium ${avatarColor}`}>
                            {customer.name.slice(0, 1)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm text-slate-800">{customer.name}</span>
                            <span className="text-base" title={customer.mood}>{emoji}</span>
                            {customer.age && (
                              <span className="text-xs text-muted-foreground">{customer.age}岁</span>
                            )}
                            <Badge variant="outline" className={`text-[11px] px-1.5 py-0 ${
                              customer.scene_type === 'pre_sale'
                                ? 'border-blue-200 text-blue-600 bg-blue-50'
                                : 'border-orange-200 text-orange-600 bg-orange-50'
                            }`}>
                              {customer.scene_type === 'pre_sale' ? '售前' : '售后'}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                            {(customer as any).question || customer.demand}
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-200 shrink-0" />
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
