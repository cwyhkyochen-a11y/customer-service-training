'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { ProgressBar } from '@/components/progress-bar';
import { getCourses } from '@/lib/api';
import { toast } from 'sonner';
import { GraduationCap, Loader2, BookOpen, CheckCircle2 } from 'lucide-react';
import type { Course } from '@/lib/api';

interface CourseWithProgress extends Course {
  mastered_count?: number;
}

export default function CoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<CourseWithProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    const res = await getCourses({ page_size: 100 });
    if (res.success && res.data) {
      setCourses(res.data.items as CourseWithProgress[]);
    } else {
      toast.error(res.error || '加载课程失败');
    }
    setLoading(false);
  };

  const grouped = courses.reduce<Record<string, CourseWithProgress[]>>((acc, c) => {
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
        <h1 className="text-xl font-semibold text-slate-800">AI教学课程</h1>
        <p className="text-sm text-muted-foreground mt-1">选择课程开始AI互动教学</p>
      </div>

      {courses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <GraduationCap className="h-12 w-12 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground mt-3">暂无课程</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([docName, items]) => (
            <div key={docName}>
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-medium text-slate-600">{docName}</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {items.map((course) => {
                  const total = course.knowledge_point_count || 0;
                  const mastered = course.mastered_count || 0;
                  const allDone = mastered === total && total > 0;
                  return (
                    <Card
                      key={course.id}
                      className="cursor-pointer rounded-xl border shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-200"
                      onClick={() => router.push(`/courses/${course.id}/learn`)}
                    >
                      <CardContent className="p-5">
                        <div className="flex items-start gap-4">
                          <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${allDone ? 'bg-emerald-50' : 'bg-violet-50'}`}>
                            {allDone
                              ? <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                              : <GraduationCap className="h-5 w-5 text-violet-600" />
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-slate-800 truncate">{course.name}</p>
                            {course.description && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{course.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="mt-4">
                          <ProgressBar value={mastered} max={total} size="sm" />
                        </div>
                        {allDone && (
                          <p className="text-xs text-emerald-600 mt-2 font-medium">✓ 已全部掌握</p>
                        )}
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
