'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ProgressBar } from '@/components/progress-bar';
import { getMyProfile } from '@/lib/api';
import { toast } from 'sonner';
import { UserCircle, Loader2, FileText, BookOpen, Users, Trophy } from 'lucide-react';
import type { UserProfile, DocumentMastery } from '@/lib/api';

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const res = await getMyProfile();
    if (res.success && res.data) {
      setProfile(res.data);
    } else {
      toast.error(res.error || '加载档案失败');
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <UserCircle className="h-12 w-12 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground mt-3">暂无档案数据</p>
      </div>
    );
  }

  // 汇总统计
  const totalKP = profile.documents.reduce((s, d) => s + d.knowledge_points_total, 0);
  const masteredKP = profile.documents.reduce((s, d) => s + d.knowledge_points_mastered, 0);
  const totalPractice = profile.documents.reduce((s, d) => s + d.practice_total, 0);
  const successPractice = profile.documents.reduce((s, d) => s + d.practice_success, 0);

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-800">我的档案</h1>
        <p className="text-sm text-muted-foreground mt-1">{profile.username} · 学习进度总览</p>
      </div>

      {/* 汇总卡片 */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card className="rounded-xl border shadow-sm">
          <CardContent className="p-4 text-center">
            <div className="h-9 w-9 rounded-xl bg-violet-50 flex items-center justify-center mx-auto mb-2">
              <BookOpen className="h-4 w-4 text-violet-600" />
            </div>
            <p className="text-lg font-bold text-slate-800">{masteredKP}<span className="text-sm font-normal text-muted-foreground">/{totalKP}</span></p>
            <p className="text-xs text-muted-foreground mt-0.5">知识点掌握</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border shadow-sm">
          <CardContent className="p-4 text-center">
            <div className="h-9 w-9 rounded-xl bg-rose-50 flex items-center justify-center mx-auto mb-2">
              <Users className="h-4 w-4 text-rose-600" />
            </div>
            <p className="text-lg font-bold text-slate-800">{successPractice}<span className="text-sm font-normal text-muted-foreground">/{totalPractice}</span></p>
            <p className="text-xs text-muted-foreground mt-0.5">对练通过</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border shadow-sm">
          <CardContent className="p-4 text-center">
            <div className="h-9 w-9 rounded-xl bg-emerald-50 flex items-center justify-center mx-auto mb-2">
              <Trophy className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="text-lg font-bold text-slate-800">{profile.documents.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">学习文档</p>
          </CardContent>
        </Card>
      </div>

      {/* 按文档的进度 */}
      {profile.documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <FileText className="h-12 w-12 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground mt-3">暂无学习数据</p>
        </div>
      ) : (
        <div className="space-y-3">
          {profile.documents.map((doc: DocumentMastery) => (
            <Card key={doc.document_id} className="rounded-xl border shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                    <FileText className="h-4 w-4 text-blue-600" />
                  </div>
                  <h2 className="text-sm font-medium text-slate-800">{doc.document_name}</h2>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 w-20 shrink-0">
                      <BookOpen className="h-3.5 w-3.5 text-violet-500" />
                      <span className="text-xs text-muted-foreground">知识点</span>
                    </div>
                    <ProgressBar
                      value={doc.knowledge_points_mastered}
                      max={doc.knowledge_points_total}
                      className="flex-1"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 w-20 shrink-0">
                      <Users className="h-3.5 w-3.5 text-rose-500" />
                      <span className="text-xs text-muted-foreground">对练</span>
                    </div>
                    <ProgressBar
                      value={doc.practice_success}
                      max={doc.practice_total}
                      className="flex-1"
                    />
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
