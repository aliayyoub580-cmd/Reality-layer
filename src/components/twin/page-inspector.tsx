'use client';

import { memo } from 'react';
import { cn } from '@/lib/utils';
import { X, Heart, Link2, AlertTriangle, Search, Eye, FileText, ExternalLink } from 'lucide-react';
import type { GraphNode } from '@/types';

interface PageInspectorProps {
  node: GraphNode | null;
  onClose: () => void;
}

function getScoreBadge(score: number | null): { bg: string; text: string } {
  if (score === null) return { bg: 'bg-neutral-100', text: 'text-neutral-400' };
  if (score >= 90) return { bg: 'bg-emerald-50', text: 'text-emerald-700' };
  if (score >= 70) return { bg: 'bg-amber-50', text: 'text-amber-700' };
  return { bg: 'bg-red-50', text: 'text-red-700' };
}

function InspectorComponent({ node, onClose }: PageInspectorProps) {
  if (!node) return null;

  const score = getScoreBadge(node.healthScore);

  return (
    <div className="absolute right-0 top-0 z-20 h-full w-80 border-l border-neutral-200 bg-white shadow-lg animate-in overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-100 bg-white px-4 py-3">
        <h3 className="text-sm font-semibold text-neutral-900">Page Inspector</h3>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
          aria-label="Close inspector"
        >
          <X size={16} />
        </button>
      </div>

      <div className="space-y-5 p-4">
        {/* Page title */}
        <div>
          <h4 className="text-base font-semibold text-neutral-900">
            {node.title || 'Untitled Page'}
          </h4>
          <a
            href={node.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-xs text-neutral-400 font-mono hover:text-neutral-600 transition-colors"
          >
            {node.path}
            <ExternalLink size={10} />
          </a>
        </div>

        {/* Health score */}
        <div className={cn('rounded-lg p-4', score.bg)}>
          <div className="flex items-center gap-2">
            <Heart size={14} className={score.text} />
            <span className="text-xs font-medium text-neutral-600">Health Score</span>
          </div>
          <p className={cn('mt-1 text-3xl font-bold', score.text)}>
            {node.healthScore !== null ? Math.round(node.healthScore) : '—'}
            <span className="text-sm font-normal text-neutral-400"> / 100</span>
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-neutral-100 p-3">
            <div className="flex items-center gap-1.5 text-neutral-400">
              <Link2 size={12} />
              <span className="text-[10px] font-medium">Inbound</span>
            </div>
            <p className="mt-1 text-lg font-bold text-neutral-900">{node.inboundCount}</p>
          </div>
          <div className="rounded-lg border border-neutral-100 p-3">
            <div className="flex items-center gap-1.5 text-neutral-400">
              <Link2 size={12} />
              <span className="text-[10px] font-medium">Outbound</span>
            </div>
            <p className="mt-1 text-lg font-bold text-neutral-900">{node.outboundCount}</p>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-2">
          <h5 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Details</h5>
          <div className="space-y-1">
            {[
              { label: 'Status', value: `${node.statusCode || '—'}`, icon: FileText },
              { label: 'Type', value: node.pageType, icon: FileText },
              { label: 'Depth', value: node.depth !== null ? `${node.depth}` : '—', icon: Search },
              { label: 'Issues', value: `${node.issueCount}`, icon: AlertTriangle },
              { label: 'Orphan', value: node.isOrphan ? 'Yes' : 'No', icon: Eye },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2 text-xs text-neutral-500">
                    <Icon size={12} />
                    {item.label}
                  </div>
                  <span className={cn(
                    'text-xs font-medium',
                    item.label === 'Issues' && node.issueCount > 0 ? 'text-amber-600' :
                    item.label === 'Orphan' && node.isOrphan ? 'text-red-600' :
                    'text-neutral-700'
                  )}>
                    {item.value}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export const PageInspector = memo(InspectorComponent);
