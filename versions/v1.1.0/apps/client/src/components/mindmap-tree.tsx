'use client';

import { useState } from 'react';
import type { MindmapNode } from '@/lib/api';
import { cn } from '@/lib/utils';

interface MindmapTreeProps {
  data: MindmapNode;
  className?: string;
}

function TreeNode({ node, depth = 0 }: { node: MindmapNode; depth?: number }) {
  const [showContent, setShowContent] = useState(false);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="relative">
      <div className="flex items-start gap-2 py-1">
        {depth > 0 && (
          <div className="flex items-center shrink-0 pt-1.5">
            <div className="w-4 h-px bg-border" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div
            className={cn(
              'inline-flex items-center px-3 py-1.5 rounded-lg text-sm border transition-colors',
              depth === 0
                ? 'bg-primary text-primary-foreground border-primary font-medium'
                : depth === 1
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-white text-foreground border-muted hover:border-primary/30',
              node.content && 'cursor-pointer'
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
      {hasChildren && (
        <div className="ml-6 border-l border-border pl-0 space-y-0">
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
      <TreeNode node={data} />
    </div>
  );
}
