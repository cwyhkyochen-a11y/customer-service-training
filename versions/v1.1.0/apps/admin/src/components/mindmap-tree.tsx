'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight, ChevronDown, Circle } from 'lucide-react';
import type { MindmapNode } from '@cs-training/shared';

interface MindmapTreeProps {
  data: MindmapNode;
  className?: string;
}

function TreeNode({ node, depth = 0 }: { node: MindmapNode; depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const [showContent, setShowContent] = useState(false);
  const hasChildren = node.children && node.children.length > 0;

  const colors = [
    'border-blue-400 bg-blue-50 text-blue-800',
    'border-emerald-400 bg-emerald-50 text-emerald-800',
    'border-violet-400 bg-violet-50 text-violet-800',
    'border-amber-400 bg-amber-50 text-amber-800',
    'border-rose-400 bg-rose-50 text-rose-800',
    'border-cyan-400 bg-cyan-50 text-cyan-800',
  ];
  const colorClass = colors[depth % colors.length];

  return (
    <div className="relative">
      <div className="flex items-start gap-1">
        {hasChildren ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-1.5 shrink-0 rounded p-0.5 hover:bg-muted transition-colors"
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        ) : (
          <span className="mt-1.5 shrink-0 p-0.5">
            <Circle className="h-3 w-3 text-muted-foreground/50 ml-0.5" />
          </span>
        )}
        <div className="flex-1 min-w-0">
          <div
            className={cn(
              'inline-flex items-center rounded-md border px-3 py-1.5 text-sm font-medium my-0.5 cursor-pointer',
              colorClass
            )}
            onClick={() => node.content && setShowContent(!showContent)}
          >
            {node.label}
            {node.content && (
              <span className="ml-1.5 text-xs opacity-60">
                {showContent ? '▲' : '▼'}
              </span>
            )}
          </div>
          {showContent && node.content && (
            <div className="mt-1 mb-2 ml-1 rounded-md bg-muted/50 border border-border/50 px-3 py-2 text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">
              {node.content}
            </div>
          )}
        </div>
      </div>
      {hasChildren && expanded && (
        <div className="ml-3 border-l border-border pl-4 mt-0.5">
          {node.children!.map((child) => (
            <TreeNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function MindmapTree({ data, className }: MindmapTreeProps) {
  return (
    <div className={cn('p-4', className)}>
      <TreeNode node={data} depth={0} />
    </div>
  );
}
