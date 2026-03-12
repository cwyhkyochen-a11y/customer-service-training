'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ArrowLeft, Loader2, FileText, CheckCircle2, XCircle } from 'lucide-react';
import { getProfile } from '@/lib/api-client';
import type { UserProfile, DocumentMastery } from '@cs-training/shared';

function ProgressBar({ value, max, className }: { value: number; max: number; className?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span>{value}/{max}</span>
        <span className="font-medium">{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function ProfileDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userId = Number(params.userId);
    if (!userId) return;
    getProfile(userId).then((res) => {
      if (res.success && res.data) setProfile(res.data);
      setLoading(false);
    });
  }, [params.userId]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => router.push('/profiles')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回
        </Button>
        <p className="text-center text-muted-foreground">档案不存在</p>
      </div>
    );
  }

  const totalKp = profile.documents.reduce((s, d) => s + d.knowledge_points_total, 0);
  const masteredKp = profile.documents.reduce((s, d) => s + d.knowledge_points_mastered, 0);
  const totalPractice = profile.documents.reduce((s, d) => s + d.practice_total, 0);
  const successPractice = profile.documents.reduce((s, d) => s + d.practice_success, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/profiles')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-semibold">客服档案</h1>
      </div>

      {/* User overview */}
      <Card>
        <CardContent className="flex items-center gap-4 pt-6">
          <Avatar className="h-14 w-14">
            <AvatarFallback className="text-lg">{profile.username.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h2 className="text-xl font-semibold">{profile.username}</h2>
            <p className="text-sm text-muted-foreground">
              涉及 {profile.documents.length} 个文档
            </p>
          </div>
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <p className="text-2xl font-semibold">{masteredKp}/{totalKp}</p>
              <p className="text-xs text-muted-foreground">知识点掌握</p>
            </div>
            <div>
              <p className="text-2xl font-semibold">{successPractice}/{totalPractice}</p>
              <p className="text-xs text-muted-foreground">练习成功</p>
            </div>
            <div>
              <p className="text-2xl font-semibold">
                {totalKp > 0 ? Math.round((masteredKp / totalKp) * 100) : 0}%
              </p>
              <p className="text-xs text-muted-foreground">总掌握度</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Per-document mastery */}
      <h2 className="text-lg font-semibold">按文档维度</h2>
      {profile.documents.length === 0 ? (
        <Card>
          <CardContent className="flex h-32 items-center justify-center text-muted-foreground">
            暂无学习数据
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {profile.documents.map((doc) => (
            <Card key={doc.document_id}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base">{doc.document_name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      <span>知识点掌握</span>
                    </div>
                    <ProgressBar value={doc.knowledge_points_mastered} max={doc.knowledge_points_total} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-blue-500" />
                      <span>练习成功率</span>
                    </div>
                    <ProgressBar value={doc.practice_success} max={doc.practice_total} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
