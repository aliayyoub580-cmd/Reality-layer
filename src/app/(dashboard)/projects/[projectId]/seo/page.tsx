'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Search, CheckCircle, AlertTriangle, XCircle, Loader2 } from 'lucide-react';
import { cn, getHealthColor } from '@/lib/utils';

interface SeoData {
  pages: {
    title: string | null;
    path: string;
    metaDescription: string | null;
    h1: string | null;
    canonical: string | null;
    ogTitle: string | null;
    isIndexable: boolean;
    titleLength: number | null;
    metaDescLength: number | null;
  }[];
}

export default function SeoPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const [data, setData] = useState<SeoData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/projects/${projectId}/pages?pageSize=100`);
      const json = await res.json();
      if (json.success) {
        setData({ pages: json.data.items });
      }
      setLoading(false);
    }
    load();
  }, [projectId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={20} className="animate-spin text-neutral-400" />
      </div>
    );
  }

  const pages = data?.pages || [];
  const withTitle = pages.filter((p) => p.title);
  const withDesc = pages.filter((p) => p.metaDescription);
  const withH1 = pages.filter((p) => p.h1);
  const withCanonical = pages.filter((p) => p.canonical);
  const withOg = pages.filter((p) => p.ogTitle);
  const indexable = pages.filter((p) => p.isIndexable);

  const checks = [
    { label: 'Pages with title', count: withTitle.length, total: pages.length },
    { label: 'Meta descriptions', count: withDesc.length, total: pages.length },
    { label: 'H1 headings', count: withH1.length, total: pages.length },
    { label: 'Canonical URLs', count: withCanonical.length, total: pages.length },
    { label: 'Open Graph tags', count: withOg.length, total: pages.length },
    { label: 'Indexable pages', count: indexable.length, total: pages.length },
  ];

  return (
    <div className="animate-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">SEO Analysis</h1>
        <p className="mt-1 text-sm text-neutral-500">Search engine optimization health</p>
      </div>

      {/* SEO checks */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {checks.map((check) => {
          const pct = check.total > 0 ? Math.round((check.count / check.total) * 100) : 0;
          const Icon = pct === 100 ? CheckCircle : pct >= 70 ? AlertTriangle : XCircle;
          const color = pct === 100 ? 'text-emerald-600' : pct >= 70 ? 'text-amber-500' : 'text-red-500';

          return (
            <div key={check.label} className="card p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-neutral-700">{check.label}</span>
                <Icon size={16} className={color} />
              </div>
              <div className="mt-2 flex items-end gap-1">
                <span className={cn('text-2xl font-bold', color)}>{check.count}</span>
                <span className="mb-0.5 text-sm text-neutral-400">/ {check.total}</span>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-neutral-100">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    pct === 100 ? 'bg-emerald-400' : pct >= 70 ? 'bg-amber-400' : 'bg-red-400'
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Page SEO table */}
      <div className="card overflow-hidden">
        <div className="border-b border-neutral-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-neutral-700">Page-by-Page SEO</h2>
        </div>
        <div className="divide-y divide-neutral-50">
          {pages.slice(0, 30).map((p) => (
            <div key={p.path} className="flex items-center gap-4 px-4 py-2.5 text-xs">
              <div className="flex-1 min-w-0">
                <p className="truncate font-medium text-neutral-900">{p.title || 'Untitled'}</p>
                <p className="truncate font-mono text-[10px] text-neutral-400">{p.path}</p>
              </div>
              <div className="flex items-center gap-2">
                {p.title ? <CheckCircle size={12} className="text-emerald-400" /> : <XCircle size={12} className="text-red-400" />}
                {p.metaDescription ? <CheckCircle size={12} className="text-emerald-400" /> : <XCircle size={12} className="text-red-400" />}
                {p.h1 ? <CheckCircle size={12} className="text-emerald-400" /> : <XCircle size={12} className="text-red-400" />}
                {p.canonical ? <CheckCircle size={12} className="text-emerald-400" /> : <XCircle size={12} className="text-red-400" />}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
