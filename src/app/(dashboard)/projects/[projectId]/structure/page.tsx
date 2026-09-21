'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  GitBranch,
  AlertOctagon,
  Layers,
  Share2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface StructureData {
  totalPages: number;
  totalLinks: number;
  orphanPages: Array<{
    id: string;
    path: string;
    title: string | null;
    url: string;
    healthScore: number | null;
  }>;
  potentialOrphans?: Array<{
    id: string;
    path: string;
    title: string | null;
    url: string;
    healthScore: number | null;
  }>;
  isLimited?: boolean;
  depthDistribution: Record<number, number>;
  deepPages: Array<{
    id: string;
    path: string;
    title: string | null;
    depth: number;
  }>;
  topHubPages: Array<{
    id: string;
    path: string;
    title: string | null;
    outboundCount: number;
    inboundCount: number;
  }>;
  topAuthorityPages: Array<{
    id: string;
    path: string;
    title: string | null;
    inboundCount: number;
    outboundCount: number;
  }>;
  connectivityScore: number;
}

export default function StructurePage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<StructureData | null>(null);
  const [selectedSimPage, setSelectedSimPage] = useState<string>('');

  useEffect(() => {
    async function loadStructure() {
      try {
        setLoading(true);
        const res = await fetch(`/api/projects/${projectId}/structure`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setData(json.data);
            if (json.data.topHubPages?.length > 0) {
              setSelectedSimPage(json.data.topHubPages[0].id);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load structure:', err);
      } finally {
        setLoading(false);
      }
    }
    loadStructure();
  }, [projectId]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-neutral-900 border-t-transparent" />
          <p className="mt-3 text-sm text-neutral-500">Synthesizing site topology...</p>
        </div>
      </div>
    );
  }

  if (!data || data.totalPages === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-200 p-12 text-center">
        <GitBranch className="mx-auto h-10 w-10 text-neutral-400" />
        <h3 className="mt-4 text-base font-semibold text-neutral-900">No Structural Data Available</h3>
        <p className="mt-1 text-sm text-neutral-500">
          Run a crawl first to generate the internal link graph and hierarchy insights.
        </p>
      </div>
    );
  }

  const simulatedPage = data.topHubPages.find((p) => p.id === selectedSimPage);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Information Architecture & Graph Topology</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Analyze internal crawl depth, discover orphan nodes, and simulate graph fragility.
        </p>
      </div>

      {/* Top Level Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-neutral-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Connectivity Index</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <Share2 size={16} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-neutral-900">{data.connectivityScore}/100</span>
            <span
              className={cn(
                'text-xs font-medium',
                data.connectivityScore >= 75 ? 'text-emerald-600' : 'text-amber-600'
              )}
            >
              {data.connectivityScore >= 75 ? 'Dense Mesh' : 'Fragile / Sparse'}
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-neutral-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Orphan Pages</span>
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-lg',
                data.orphanPages.length > 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
              )}
            >
              <AlertOctagon size={16} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-neutral-900">{data.orphanPages.length}</span>
            <span className="text-xs text-neutral-500">
              {data.isLimited
                ? `${data.potentialOrphans?.length || 0} potential (limited crawl)`
                : 'confirmed unreachable'}
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-neutral-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Deep Paths (&gt;=3 Clicks)</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <Layers size={16} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-neutral-900">{data.deepPages.length}</span>
            <span className="text-xs text-neutral-500">pages buried deep</span>
          </div>
        </div>

        <div className="rounded-xl border border-neutral-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Internal Links</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <GitBranch size={16} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-neutral-900">{data.totalLinks}</span>
            <span className="text-xs text-neutral-500">
              ~{(data.totalLinks / (data.totalPages || 1)).toFixed(1)} per page
            </span>
          </div>
        </div>
      </div>

      {/* Depth Distribution Hierarchy */}
      <div className="rounded-xl border border-neutral-200/80 bg-white p-6 shadow-xs">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-700">Click Depth Distribution</h2>
        <p className="mt-1 text-xs text-neutral-500">
          How many clicks away from the homepage (/ route) does it take for a user or bot to reach content?
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[0, 1, 2, 3, 4].map((depth) => {
            const count =
              depth === 4
                ? Object.entries(data.depthDistribution)
                    .filter(([d]) => Number(d) >= 4)
                    .reduce((acc, [, val]) => acc + val, 0)
                : data.depthDistribution[depth] || 0;
            const pct = data.totalPages > 0 ? Math.round((count / data.totalPages) * 100) : 0;

            return (
              <div key={depth} className="rounded-lg border border-neutral-100 bg-neutral-50/60 p-4">
                <div className="flex items-center justify-between text-xs font-medium text-neutral-500">
                  <span>{depth === 0 ? 'Homepage (0)' : depth === 4 ? '4+ Clicks' : `${depth} Click${depth > 1 ? 's' : ''}`}</span>
                  <span className="text-neutral-400">{pct}%</span>
                </div>
                <div className="mt-2 text-xl font-bold text-neutral-900">{count}</div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-neutral-200">
                  <div
                    style={{ width: `${pct}%` }}
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      depth <= 1 ? 'bg-emerald-500' : depth === 2 ? 'bg-blue-500' : 'bg-amber-500'
                    )}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive Removal Simulation */}
      <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/40 via-white to-neutral-50/50 p-6 shadow-xs">
        <div className="flex items-center gap-2 text-indigo-900">
          <Sparkles size={18} className="text-indigo-600" />
          <h2 className="text-base font-semibold">Graph Fragility & Node Removal Simulator</h2>
        </div>
        <p className="mt-1 text-xs text-neutral-600">
          Test what would happen to downstream navigation if a critical hub page or navigation pillar was removed.
        </p>

        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex-1">
            <label className="text-xs font-medium text-neutral-600">Select Hub Node to Test:</label>
            <select
              value={selectedSimPage}
              onChange={(e) => setSelectedSimPage(e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-medium text-neutral-900 focus:border-indigo-500 focus:outline-none"
            >
              {data.topHubPages.map((hub) => (
                <option key={hub.id} value={hub.id}>
                  {hub.path} ({hub.outboundCount} outbound routes)
                </option>
              ))}
            </select>
          </div>

          {simulatedPage && (
            <div className="flex flex-1 items-center gap-4 rounded-xl border border-indigo-100 bg-white p-3.5 text-xs">
              <div className="flex-1">
                <span className="text-[11px] font-semibold uppercase text-neutral-400">Estimated Impact</span>
                <p className="mt-0.5 font-medium text-neutral-900">
                  Severing this node risks orphaning up to{' '}
                  <span className="font-bold text-rose-600">{simulatedPage.outboundCount} pathways</span>.
                </p>
              </div>
              <div className="rounded-lg bg-indigo-50 px-2.5 py-1.5 font-medium text-indigo-700">
                Hub Degree: {simulatedPage.outboundCount}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2 Column: Orphan Pages & Hub Pages */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Orphan Pages */}
        <div className="rounded-xl border border-neutral-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <div className="flex items-center gap-2">
              <AlertOctagon size={16} className="text-rose-500" />
              <h2 className="text-sm font-semibold text-neutral-900">Detected Orphan Pages</h2>
            </div>
            <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700">
              {data.orphanPages.length} pages
            </span>
          </div>

          <div className="mt-3 max-h-80 overflow-y-auto divide-y divide-neutral-100">
            {data.orphanPages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center text-xs text-neutral-500">
                <CheckCircle2 size={24} className="mb-2 text-emerald-500" />
                <span>
                  {data.isLimited
                    ? `0 confirmed orphan pages. (${data.potentialOrphans?.length || 0} unlinked pages are unverified due to limited crawl)`
                    : 'Zero orphan pages detected! All routes have internal pathways.'}
                </span>
              </div>
            ) : (
              data.orphanPages.map((page) => (
                <div key={page.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="truncate max-w-[280px]">
                    <p className="font-medium text-neutral-900 truncate">{page.title || page.path}</p>
                    <p className="text-[11px] text-neutral-400 truncate">{page.path}</p>
                  </div>
                  <a
                    href={page.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    Inspect <ExternalLink size={10} />
                  </a>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Hubs */}
        <div className="rounded-xl border border-neutral-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <div className="flex items-center gap-2">
              <Share2 size={16} className="text-blue-500" />
              <h2 className="text-sm font-semibold text-neutral-900">Highest Degree Hub Nodes</h2>
            </div>
            <span className="text-xs text-neutral-400">Outbound Links</span>
          </div>

          <div className="mt-3 max-h-80 overflow-y-auto divide-y divide-neutral-100">
            {data.topHubPages.map((hub) => (
              <div key={hub.id} className="py-2.5 flex items-center justify-between text-xs">
                <div className="truncate max-w-[280px]">
                  <p className="font-medium text-neutral-900 truncate">{hub.title || hub.path}</p>
                  <p className="text-[11px] text-neutral-400 truncate">{hub.path}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded bg-neutral-100 px-2 py-0.5 font-mono text-[11px] text-neutral-700">
                    {hub.outboundCount} out / {hub.inboundCount} in
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
