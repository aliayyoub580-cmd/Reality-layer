'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Zap,
  Clock,
  HardDrive,
  AlertTriangle,
  ExternalLink,
  ArrowUpDown,
} from 'lucide-react';
import { cn, formatBytes, formatDuration } from '@/lib/utils';

interface PageItem {
  id: string;
  url: string;
  path: string;
  title: string | null;
  loadTime: number | null;
  responseSize: number | null;
  statusCode: number | null;
  imageCount: number;
  linkCount: number;
  healthScore: number | null;
}

export default function PerformancePage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [loading, setLoading] = useState(true);
  const [pages, setPages] = useState<PageItem[]>([]);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<'loadTime' | 'responseSize'>('loadTime');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const res = await fetch(`/api/projects/${projectId}/pages?pageSize=100&sort=loadTime&order=desc`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setPages(json.data.items || []);
          }
        }
      } catch (err) {
        console.error('Failed to load performance data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [projectId]);

  // Calculations
  const pagesWithSpeed = pages.filter((p) => p.loadTime !== null && p.loadTime > 0);
  const avgLoadTime = pagesWithSpeed.length
    ? Math.round(pagesWithSpeed.reduce((acc, p) => acc + (p.loadTime || 0), 0) / pagesWithSpeed.length)
    : 0;

  const fastPages = pagesWithSpeed.filter((p) => (p.loadTime || 0) < 500);
  const moderatePages = pagesWithSpeed.filter((p) => (p.loadTime || 0) >= 500 && (p.loadTime || 0) <= 1500);
  const slowPages = pagesWithSpeed.filter((p) => (p.loadTime || 0) > 1500);

  const avgSize = pages.length
    ? Math.round(pages.reduce((acc, p) => acc + (p.responseSize || 0), 0) / pages.length)
    : 0;

  const largePages = pages.filter((p) => (p.responseSize || 0) > 1024 * 1024);

  // Filter & Sort
  const filteredPages = pages
    .filter((p) => (p.path?.toLowerCase() || '').includes(search.toLowerCase()) || (p.title?.toLowerCase() || '').includes(search.toLowerCase()))
    .sort((a, b) => {
      const valA = a[sortField] || 0;
      const valB = b[sortField] || 0;
      return sortOrder === 'desc' ? valB - valA : valA - valB;
    });

  const toggleSort = (field: 'loadTime' | 'responseSize') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Performance & Velocity</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Analyze load times, HTML payload weights, and page responsiveness across the digital twin.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-neutral-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Avg Response Time</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <Clock size={16} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-neutral-900">{formatDuration(avgLoadTime)}</span>
            <span className={cn('text-xs font-medium', avgLoadTime < 800 ? 'text-emerald-600' : 'text-amber-600')}>
              {avgLoadTime < 800 ? 'Optimal' : avgLoadTime < 1800 ? 'Needs Attention' : 'Sluggish'}
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-neutral-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Fast Pages (&lt;500ms)</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Zap size={16} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-neutral-900">{fastPages.length}</span>
            <span className="text-xs text-neutral-500">of {pages.length} total pages</span>
          </div>
        </div>

        <div className="rounded-xl border border-neutral-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Slow Pages (&gt;1.5s)</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <AlertTriangle size={16} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-neutral-900">{slowPages.length}</span>
            <span className="text-xs text-amber-600 font-medium">Critical focus</span>
          </div>
        </div>

        <div className="rounded-xl border border-neutral-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Avg HTML Payload</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
              <HardDrive size={16} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-neutral-900">{formatBytes(avgSize)}</span>
            <span className="text-xs text-neutral-500">{largePages.length} pages &gt; 1MB</span>
          </div>
        </div>
      </div>

      {/* Speed Distribution Spectrum */}
      <div className="rounded-xl border border-neutral-200/80 bg-white p-6 shadow-xs">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-700">Response Speed Distribution</h2>
        <div className="mt-4 flex h-4 w-full overflow-hidden rounded-full bg-neutral-100">
          <div
            style={{ width: `${pagesWithSpeed.length ? (fastPages.length / pagesWithSpeed.length) * 100 : 0}%` }}
            className="bg-emerald-500 transition-all duration-500"
            title={`Fast: ${fastPages.length}`}
          />
          <div
            style={{ width: `${pagesWithSpeed.length ? (moderatePages.length / pagesWithSpeed.length) * 100 : 0}%` }}
            className="bg-amber-400 transition-all duration-500"
            title={`Moderate: ${moderatePages.length}`}
          />
          <div
            style={{ width: `${pagesWithSpeed.length ? (slowPages.length / pagesWithSpeed.length) * 100 : 0}%` }}
            className="bg-rose-500 transition-all duration-500"
            title={`Slow: ${slowPages.length}`}
          />
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4 text-xs text-neutral-600">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-emerald-500" />
            <span>Fast (&lt;500ms): <strong>{fastPages.length}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-amber-400" />
            <span>Moderate (500ms - 1.5s): <strong>{moderatePages.length}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-rose-500" />
            <span>Slow (&gt;1.5s): <strong>{slowPages.length}</strong></span>
          </div>
        </div>
      </div>

      {/* Page List Table */}
      <div className="rounded-xl border border-neutral-200/80 bg-white shadow-xs">
        <div className="flex flex-col gap-3 border-b border-neutral-200/80 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">Page Latency Explorer</h2>
            <p className="text-xs text-neutral-500">Inspect load latency and transfer footprint per route</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search routes or titles..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-neutral-100 bg-neutral-50/75 text-neutral-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Page / Path</th>
                <th
                  onClick={() => toggleSort('loadTime')}
                  className="cursor-pointer px-4 py-3 hover:text-neutral-900"
                >
                  <div className="flex items-center gap-1">
                    <span>Response Time</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('responseSize')}
                  className="cursor-pointer px-4 py-3 hover:text-neutral-900"
                >
                  <div className="flex items-center gap-1">
                    <span>HTML Size</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th className="px-4 py-3">Images</th>
                <th className="px-4 py-3">Links</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-neutral-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-400">
                    Loading performance metrics...
                  </td>
                </tr>
              ) : filteredPages.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-400">
                    No pages match your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredPages.map((p) => {
                  const isSlow = (p.loadTime || 0) > 1500;
                  const isModerate = (p.loadTime || 0) >= 500 && (p.loadTime || 0) <= 1500;
                  return (
                    <tr key={p.id} className="hover:bg-neutral-50/80 transition-colors">
                      <td className="px-4 py-3">
                        <div className="max-w-[280px] truncate font-medium text-neutral-900">
                          {p.title || p.path}
                        </div>
                        <div className="max-w-[280px] truncate text-[11px] text-neutral-400">
                          {p.path}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded px-2 py-0.5 font-medium',
                            isSlow
                              ? 'bg-rose-50 text-rose-700'
                              : isModerate
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-emerald-50 text-emerald-700'
                          )}
                        >
                          {p.loadTime ? formatDuration(p.loadTime) : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px]">
                        {p.responseSize ? formatBytes(p.responseSize) : '—'}
                      </td>
                      <td className="px-4 py-3 text-neutral-600">{p.imageCount}</td>
                      <td className="px-4 py-3 text-neutral-600">{p.linkCount}</td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold',
                            p.statusCode === 200
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          )}
                        >
                          {p.statusCode || 200}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <a
                          href={p.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-900"
                        >
                          Visit <ExternalLink size={11} />
                        </a>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
