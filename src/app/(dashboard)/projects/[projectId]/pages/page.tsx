'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Search, FileText, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn, getHealthColor, truncate } from '@/lib/utils';

interface PageItem {
  id: string;
  url: string;
  path: string;
  title: string | null;
  statusCode: number | null;
  healthScore: number | null;
  depth: number | null;
  issueCount: number;
  inboundCount: number;
  outboundCount: number;
}

export default function PagesPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const [pages, setPages] = useState<PageItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('path');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '20',
        sort,
        order,
        ...(search ? { search } : {}),
      });
      const res = await fetch(`/api/projects/${projectId}/pages?${params}`);
      const json = await res.json();
      if (json.success) {
        setPages(json.data.items);
        setTotal(json.data.total);
        setTotalPages(json.data.totalPages);
      }
      setLoading(false);
    }
    load();
  }, [projectId, page, sort, order, search]);

  function toggleSort(field: string) {
    if (sort === field) {
      setOrder(order === 'asc' ? 'desc' : 'asc');
    } else {
      setSort(field);
      setOrder('asc');
    }
  }

  const columns = [
    { key: 'path', label: 'URL', width: 'flex-1 min-w-[200px]' },
    { key: 'statusCode', label: 'Status', width: 'w-20' },
    { key: 'healthScore', label: 'Health', width: 'w-20' },
    { key: 'depth', label: 'Depth', width: 'w-16' },
    { key: 'inboundCount', label: 'In', width: 'w-14' },
    { key: 'outboundCount', label: 'Out', width: 'w-14' },
    { key: 'issueCount', label: 'Issues', width: 'w-16' },
  ];

  return (
    <div className="animate-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Pages</h1>
          <p className="mt-1 text-sm text-neutral-500">{total} pages discovered</p>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search pages..."
            className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-9 pr-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900/5"
          />
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {/* Header */}
        <div className="flex items-center border-b border-neutral-100 bg-neutral-50/50 px-4 py-2">
          {columns.map((col) => (
            <button
              key={col.key}
              onClick={() => toggleSort(col.key)}
              className={cn(
                'flex items-center gap-1 text-xs font-medium text-neutral-500 hover:text-neutral-700 transition-colors',
                col.width
              )}
            >
              {col.label}
              {sort === col.key && <ArrowUpDown size={10} className="text-neutral-400" />}
            </button>
          ))}
        </div>

        {/* Rows */}
        {loading ? (
          <div className="divide-y divide-neutral-50">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3">
                <div className="skeleton h-4 flex-1" />
                <div className="skeleton h-4 w-16" />
                <div className="skeleton h-4 w-16" />
              </div>
            ))}
          </div>
        ) : pages.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <FileText size={20} className="text-neutral-300" />
            <p className="mt-2 text-sm text-neutral-500">No pages found</p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-50">
            {pages.map((p) => (
              <div key={p.id} className="flex items-center px-4 py-2.5 text-xs hover:bg-neutral-50/50 transition-colors">
                <div className="flex-1 min-w-[200px] min-w-0">
                  <p className="truncate font-medium text-neutral-900">{p.title || p.path}</p>
                  <p className="truncate text-[10px] text-neutral-400 font-mono">{p.path}</p>
                </div>
                <div className="w-20">
                  <span className={cn(
                    'inline-flex items-center rounded-md px-1.5 py-0.5 font-mono text-[10px] font-medium',
                    p.statusCode === 200 ? 'bg-emerald-50 text-emerald-700' :
                    (p.statusCode ?? 0) >= 400 ? 'bg-red-50 text-red-700' :
                    (p.statusCode ?? 0) >= 300 ? 'bg-amber-50 text-amber-700' :
                    'bg-neutral-100 text-neutral-500'
                  )}>
                    {p.statusCode || '—'}
                  </span>
                </div>
                <div className="w-20">
                  <span className={cn('font-semibold', getHealthColor(p.healthScore))}>
                    {p.healthScore != null ? Math.round(p.healthScore) : '—'}
                  </span>
                </div>
                <div className="w-16 text-neutral-500">{p.depth ?? '—'}</div>
                <div className="w-14 text-neutral-500">{p.inboundCount}</div>
                <div className="w-14 text-neutral-500">{p.outboundCount}</div>
                <div className="w-16">
                  {p.issueCount > 0 ? (
                    <span className="font-medium text-amber-600">{p.issueCount}</span>
                  ) : (
                    <span className="text-neutral-300">0</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-neutral-100 px-4 py-3">
            <p className="text-xs text-neutral-500">
              Page {page} of {totalPages} ({total} pages)
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 disabled:opacity-30"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 disabled:opacity-30"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
