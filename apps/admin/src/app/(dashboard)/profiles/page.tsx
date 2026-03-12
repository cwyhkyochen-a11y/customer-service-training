'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, FolderOpen } from 'lucide-react';
import { getProfiles } from '@/lib/api-client';
import type { UserProfile } from '@cs-training/shared';

export default function ProfilesPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProfiles().then((res) => {
      if (res.success && res.data) {
        setProfiles(res.data.items || []);
      }
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">客服档案</h1>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">客服档案</h1>

      {profiles.length === 0 ? (
        <Card>
          <CardContent className="flex h-64 flex-col items-center justify-center text-muted-foreground">
            <FolderOpen className="mb-3 h-12 w-12" />
            <p>暂无客服档案</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {profiles.map((profile) => {
            const docs = profile.documents || [];
            const totalKp = docs.reduce((s: number, d: any) => s + (d.knowledge_points_total || 0), 0);
            const masteredKp = docs.reduce((s: number, d: any) => s + (d.knowledge_points_mastered || 0), 0);
            const totalPractice = docs.reduce((s: number, d: any) => s + (d.practice_total || 0), 0);
            const successPractice = docs.reduce((s: number, d: any) => s + (d.practice_success || 0), 0);
            const masteryRate = totalKp > 0 ? Math.round((masteredKp / totalKp) * 100) : 0;
            const userId = profile.user_id || profile.id;
            const username = profile.username || '未知';

            return (
              <Card
                key={userId}
                className="cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => router.push(`/profiles/${userId}`)}
              >
                <CardHeader className="flex flex-row items-center gap-3 pb-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>{username.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <CardTitle className="text-base">{username}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">知识掌握度</span>
                        <span className="font-medium">{masteryRate}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${masteryRate}%` }}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="rounded-lg bg-muted/50 p-2 text-center">
                        <p className="text-lg font-semibold">{masteredKp}/{totalKp}</p>
                        <p className="text-xs text-muted-foreground">知识点</p>
                      </div>
                      <div className="rounded-lg bg-muted/50 p-2 text-center">
                        <p className="text-lg font-semibold">{successPractice}/{totalPractice}</p>
                        <p className="text-xs text-muted-foreground">练习成功</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
