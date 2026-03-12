'use client';

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight, ChevronDown, Check, Square, CheckSquare } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { MindmapNode } from '@cs-training/shared';

interface NodeSelectorProps {
  data: MindmapNode;
  selectedPaths: string[][];
  onSelect: (paths: string[][]) => void;
  className?: string;
}

function pathKey(path: string[]): string {
  return path.join('>>');
}

function SelectorNode({
  node,
  depth = 0,
  currentPath,
  selectedSet,
  onToggle,
}: {
  node: MindmapNode;
  depth?: number;
  currentPath: string[];
  selectedSet: Set<string>;
  onToggle: (path: string[]) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;
  const isLeaf = !hasChildren;
  const path = [...currentPath, node.id];
  const isSelected = selectedSet.has(pathKey(path));

  return (
    <div>
      <div
        className={cn(
          'flex items-start gap-1 rounded-md px-2 py-1.5 text-sm cursor-pointer transition-colors select-none',
          isSelected ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'
        )}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggle(path);
        }}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="shrink-0 p-0.5 mt-0.5"
          >
            {expanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>
        ) : (
          <span className="w-[18px] shrink-0" />
        )}
        {isSelected ? (
          <CheckSquare className="h-3.5 w-3.5 shrink-0 text-primary mt-0.5" />
        ) : (
          <Square className="h-3.5 w-3.5 shrink-0 text-muted-foreground mt-0.5" />
        )}
        <div className="flex-1 min-w-0">
          <span className="truncate block">{node.label}</span>
          {isLeaf && node.content && (
            <p className="mt-0.5 text-xs text-muted-foreground whitespace-pre-wrap line-clamp-4 font-normal">
              {node.content}
            </p>
          )}
        </div>
      </div>
      {hasChildren && expanded && (
        <div className="ml-4">
          {node.children!.map((child) => (
            <SelectorNode
              key={child.id}
              node={child}
              depth={depth + 1}
              currentPath={path}
              selectedSet={selectedSet}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function resolveLabel(data: MindmapNode, path: string[]): string {
  let current: MindmapNode | undefined = data;
  const labels: string[] = [];
  for (const id of path) {
    if (current?.id === id) {
      labels.push(current.label);
    } else {
      current = current?.children?.find((c) => c.id === id);
      if (current) labels.push(current.label);
    }
  }
  return labels.join(' > ');
}

export function NodeSelector({ data, selectedPaths, onSelect, className }: NodeSelectorProps) {
  const selectedSet = useMemo(() => {
    return new Set(selectedPaths.map(pathKey));
  }, [selectedPaths]);

  function handleToggle(path: string[]) {
    const key = pathKey(path);
    if (selectedSet.has(key)) {
      onSelect(selectedPaths.filter((p) => pathKey(p) !== key));
    } else {
      onSelect([...selectedPaths, path]);
    }
  }

  return (
    <div className={cn('space-y-2', className)}>
      {selectedPaths.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedPaths.map((p) => (
            <span
              key={pathKey(p)}
              className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs text-primary cursor-pointer hover:bg-primary/20"
              onClick={() => handleToggle(p)}
            >
              {resolveLabel(data, p)}
              <span className="text-primary/60">×</span>
            </span>
          ))}
        </div>
      )}
      <ScrollArea className="h-80 rounded-md border p-2">
        <SelectorNode
          node={data}
          currentPath={[]}
          selectedSet={selectedSet}
          onToggle={handleToggle}
        />
      </ScrollArea>
    </div>
  );
}
