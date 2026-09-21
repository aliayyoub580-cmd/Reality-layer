'use client';

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { GraphNode } from '@/types';
import { cn } from '@/lib/utils';
import { Globe, FileText, ShoppingBag, Mail, Info, BookOpen, Scale } from 'lucide-react';

interface PageNodeProps {
  data: GraphNode & { selected?: boolean };
}

const typeIcons: Record<string, typeof Globe> = {
  homepage: Globe,
  page: FileText,
  'blog-post': BookOpen,
  product: ShoppingBag,
  contact: Mail,
  about: Info,
  legal: Scale,
};

function getStatusDot(healthScore: number | null): string {
  if (healthScore === null) return 'bg-neutral-300';
  if (healthScore >= 90) return 'bg-emerald-400';
  if (healthScore >= 70) return 'bg-amber-400';
  if (healthScore >= 50) return 'bg-orange-400';
  return 'bg-red-400';
}

function getHealthText(healthScore: number | null): string {
  if (healthScore === null) return 'text-neutral-400';
  if (healthScore >= 90) return 'text-emerald-600';
  if (healthScore >= 70) return 'text-amber-600';
  return 'text-red-600';
}

function PageNodeComponent({ data }: PageNodeProps) {
  const Icon = typeIcons[data.pageType] || FileText;
  const isError = data.status === 'CLIENT_ERROR' || data.status === 'SERVER_ERROR';

  return (
    <div
      className={cn(
        'group min-w-[180px] max-w-[240px] rounded-lg border bg-white px-3.5 py-3 shadow-sm transition-all',
        data.selected
          ? 'border-neutral-900 shadow-md ring-1 ring-neutral-900/10'
          : 'border-neutral-200 hover:border-neutral-300 hover:shadow-md',
        isError && 'border-red-200 bg-red-50/50'
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-neutral-300 !w-2 !h-2 !border-white !border-2" />

      {/* Header */}
      <div className="flex items-start gap-2">
        <div className={cn('mt-0.5 h-2 w-2 shrink-0 rounded-full', getStatusDot(data.healthScore))} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Icon size={12} className="shrink-0 text-neutral-400" />
            <p className="truncate text-xs font-semibold text-neutral-900">
              {data.title || data.path}
            </p>
          </div>
          <p className="mt-0.5 truncate text-[10px] text-neutral-400 font-mono">
            {data.path}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-2 flex items-center gap-3 text-[10px]">
        {data.healthScore !== null && (
          <span className={cn('font-semibold', getHealthText(data.healthScore))}>
            {Math.round(data.healthScore)}
          </span>
        )}
        <span className="text-neutral-400">
          ↓{data.inboundCount} ↑{data.outboundCount}
        </span>
        {data.issueCount > 0 && (
          <span className="text-amber-500 font-medium">
            {data.issueCount} issue{data.issueCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-neutral-300 !w-2 !h-2 !border-white !border-2" />
    </div>
  );
}

export const PageNode = memo(PageNodeComponent);
