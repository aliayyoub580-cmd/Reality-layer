'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  ArrowLeftRight,
  PlusCircle,
  MinusCircle,
  RefreshCw,
  Clock,
  History,
  Calendar,
  CheckCircle,
  TrendingUp,
} from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';

interface CrawlItem {
  id: string;
  pagesAnalyzed: number;
  healthScore: number | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

interface ChangeItem {
  id: string;
  changeType: 'ADDED' | 'REMOVED' | 'MODIFIED';
  entityType: string;
  url: string;
  description: string;
  oldValue?: string | null;
  newValue?: string | null;
}

export default function ChangesPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [loading, setLoading] = useState(true);
  const [crawls, setCrawls] = useState<CrawlItem[]>([]);
  const [changes, setChanges] = useState<ChangeItem[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const res = await fetch(`/api/projects/${projectId}/changes`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setCrawls(json.data.crawls || []);
            setChanges(json.data.changes || []);
          }
        }
      } catch (err) {
        console.error('Failed to load changes:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [projectId]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-neutral-900 border-t-transparent" />
          <p className="mt-3 text-sm text-neutral-500">Loading version history...</p>
        </div>
      </div>
    );
  }

  const addedCount = changes.filter((c) => c.changeType === 'ADDED').length;
  const removedCount = changes.filter((c) => c.changeType === 'REMOVED').length;
  const modifiedCount = changes.filter((c) => c.changeType === 'MODIFIED').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Change Detection & Version History</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Track structural, technical, and content evolutions between crawl snapshots over time.
        </p>
      </div>

      {/* Snapshot Comparison Summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-neutral-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Total Crawls</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <History size={16} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-neutral-900">{crawls.length}</span>
            <span className="text-xs text-neutral-500">snapshots recorded</span>
          </div>
        </div>

        <div className="rounded-xl border border-neutral-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">New Pages</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <PlusCircle size={16} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-600">+{addedCount}</span>
            <span className="text-xs text-neutral-500">since last crawl</span>
          </div>
        </div>

        <div className="rounded-xl border border-neutral-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Removed Pages</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
              <MinusCircle size={16} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-rose-600">-{removedCount}</span>
            <span className="text-xs text-neutral-500">unlinked / 404</span>
          </div>
        </div>

        <div className="rounded-xl border border-neutral-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Modifications</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <RefreshCw size={16} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-600">~{modifiedCount}</span>
            <span className="text-xs text-neutral-500">metadata / status</span>
          </div>
        </div>
      </div>

      {/* 2 Column: Crawl History Timeline & Diff Log */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Timeline (1 col) */}
        <div className="rounded-xl border border-neutral-200/80 bg-white p-5 shadow-xs lg:col-span-1">
          <div className="flex items-center gap-2 border-b border-neutral-100 pb-3">
            <Clock size={16} className="text-neutral-500" />
            <h2 className="text-sm font-semibold text-neutral-900">Crawl Timeline</h2>
          </div>

          <div className="mt-4 relative pl-4 border-l-2 border-neutral-100 space-y-6">
            {crawls.map((crawl, idx) => (
              <div key={crawl.id} className="relative group">
                {/* Dot */}
                <div
                  className={cn(
                    'absolute -left-[21px] top-1 h-3 w-3 rounded-full border-2 border-white',
                    idx === 0 ? 'bg-indigo-600 ring-4 ring-indigo-50' : 'bg-neutral-300'
                  )}
                />
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-neutral-900">
                      {idx === 0 ? 'Latest Snapshot' : `Version #${crawls.length - idx}`}
                    </span>
                    <span className="text-[11px] text-neutral-400">
                      {formatDate(crawl.createdAt)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-neutral-600">
                    <span>{crawl.pagesAnalyzed} pages</span>
                    <span>•</span>
                    <span className="font-semibold text-neutral-800">
                      Score: {crawl.healthScore ? `${Math.round(crawl.healthScore)}%` : '—'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Changes Diff Log (2 cols) */}
        <div className="rounded-xl border border-neutral-200/80 bg-white p-5 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <div className="flex items-center gap-2">
              <ArrowLeftRight size={16} className="text-neutral-500" />
              <h2 className="text-sm font-semibold text-neutral-900">Recent Differential Events</h2>
            </div>
            <span className="text-xs text-neutral-500">{changes.length} changes detected</span>
          </div>

          <div className="mt-4 divide-y divide-neutral-100">
            {changes.length === 0 ? (
              <div className="py-12 text-center text-xs text-neutral-500">
                {crawls.length < 2 ? (
                  <span>
                    At least two crawl runs are required to calculate differentials. Trigger another crawl to see changes!
                  </span>
                ) : (
                  <span>No differences detected between the latest two crawls.</span>
                )}
              </div>
            ) : (
              changes.map((change) => (
                <div key={change.id} className="py-3 flex items-start gap-3">
                  <div className="mt-0.5">
                    {change.changeType === 'ADDED' && (
                      <PlusCircle size={16} className="text-emerald-500" />
                    )}
                    {change.changeType === 'REMOVED' && (
                      <MinusCircle size={16} className="text-rose-500" />
                    )}
                    {change.changeType === 'MODIFIED' && (
                      <RefreshCw size={16} className="text-amber-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-neutral-900">{change.description}</p>
                    <p className="mt-0.5 text-[11px] font-mono text-neutral-400 truncate max-w-md">
                      {change.url}
                    </p>
                    {change.oldValue && change.newValue && (
                      <div className="mt-2 rounded bg-neutral-50 p-2 font-mono text-[11px] text-neutral-600">
                        <span className="text-rose-600 line-through mr-2">- {change.oldValue}</span>
                        <span className="text-emerald-600">+ {change.newValue}</span>
                      </div>
                    )}
                  </div>
                  <span
                    className={cn(
                      'rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
                      change.changeType === 'ADDED'
                        ? 'bg-emerald-50 text-emerald-700'
                        : change.changeType === 'REMOVED'
                        ? 'bg-rose-50 text-rose-700'
                        : 'bg-amber-50 text-amber-700'
                    )}
                  >
                    {change.changeType}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
