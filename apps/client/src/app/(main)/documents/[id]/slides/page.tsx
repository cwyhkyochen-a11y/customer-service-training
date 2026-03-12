'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { getDocumentSlides } from '@/lib/api';
import type { Slide } from '@/lib/api';
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2, Presentation } from 'lucide-react';

export default function SlidesPage() {
  const params = useParams();
  const router = useRouter();
  const docId = Number(params.id);

  const [slides, setSlides] = useState<Slide[]>([]);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSlides();
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        setCurrent(c => Math.max(0, c - 1));
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
        setCurrent(c => Math.min(slides.length - 1, c + 1));
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [slides.length]);

  const loadSlides = async () => {
    const res = await getDocumentSlides(docId);
    if (res.success && res.data) {
      setSlides(res.data);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (slides.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-muted-foreground">
        <Presentation className="h-10 w-10 mb-3 opacity-40" />
        <p className="text-sm">暂无PPT课件</p>
        <p className="text-xs mt-1">请联系管理员生成</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => router.back()}>
          返回
        </Button>
      </div>
    );
  }

  const slide = slides[current];

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-12 bg-white border-b shrink-0">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium">PPT课件</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {current + 1} / {slides.length}
        </span>
      </div>

      {/* Slide viewer */}
      <div className="flex-1 flex items-center justify-center p-4 min-h-0">
        <div className="relative w-full max-w-3xl aspect-[16/9]">
          {/* Navigation buttons */}
          <button
            onClick={() => setCurrent(c => Math.max(0, c - 1))}
            disabled={current <= 0}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full mr-2 p-2 rounded-full hover:bg-white/80 disabled:opacity-20 z-10"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="w-full h-full bg-white rounded-xl shadow-lg border overflow-auto">
            <div
              className="w-full h-full"
              dangerouslySetInnerHTML={{ __html: slide.html_content }}
            />
          </div>

          <button
            onClick={() => setCurrent(c => Math.min(slides.length - 1, c + 1))}
            disabled={current >= slides.length - 1}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full ml-2 p-2 rounded-full hover:bg-white/80 disabled:opacity-20 z-10"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Bottom bar with dots */}
      <div className="flex items-center justify-center gap-1.5 py-3 bg-white border-t shrink-0">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`w-2 h-2 rounded-full transition-all ${
              i === current ? 'bg-primary w-6' : 'bg-muted-foreground/20 hover:bg-muted-foreground/40'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
