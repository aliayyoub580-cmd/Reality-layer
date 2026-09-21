'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Newspaper,
  RefreshCw,
  Search,
  Calendar,
  Clock,
  ExternalLink,
  Trash2,
  Eye,
  SlidersHorizontal,
  LayoutGrid,
  Table as TableIcon,
  CheckCircle2,
  AlertCircle,
  Globe,
  Timer,
  Play,
  X,
  Sparkles,
} from 'lucide-react';
import { timeAgo } from '@/lib/utils';

interface NewsItem {
  id: string;
  externalId: string;
  title: string;
  summary: string | null;
  imageUrl: string | null;
  articleUrl: string;
  newsSite: string | null;
  publishedAt: string | null;
  fetchedAt: string;
  createdAt: string;
}

interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  description?: string;
}

export default function NewsPage() {
  const [articles, setArticles] = useState<NewsItem[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedSource, setSelectedSource] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Modals state
  const [activeArticle, setActiveArticle] = useState<NewsItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<NewsItem | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [confirmRefreshModal, setConfirmRefreshModal] = useState(false);

  // Toast state
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Auto-fetch state
  const [autoFetchInterval, setAutoFetchInterval] = useState<string>('daily');
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  const addToast = useCallback((type: 'success' | 'error' | 'info', title: string, description?: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, title, description }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  // Initialize auto-fetch interval from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('realitylayer_news_interval') || 'daily';
    setAutoFetchInterval(saved);
  }, []);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch articles from API
  const loadArticles = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (selectedSource) params.set('source', selectedSource);
      if (sortOrder) params.set('sort', sortOrder);

      const res = await fetch(`/api/news?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch news');
      const data = await res.json();
      setArticles(data.data || []);
      setSources(data.sources || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error(err);
      addToast('error', 'Could not load news feed', 'Check your network connection or try refreshing.');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, selectedSource, sortOrder, addToast]);

  useEffect(() => {
    loadArticles();
  }, [loadArticles]);

  // Trigger manual or automatic refresh
  const handleRefresh = useCallback(
    async (isAuto = false) => {
      setRefreshing(true);
      try {
        const res = await fetch('/api/news/refresh', { method: 'POST' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Refresh failed');

        if (isAuto) {
          addToast(
            'success',
            '⚡ Auto-fetch triggered',
            `Synchronized ${data.count ?? 25} news articles automatically.`
          );
        } else {
          addToast('success', 'News feed refreshed', data.message);
        }

        setConfirmRefreshModal(false);
        await loadArticles();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'News refresh failed';
        addToast('error', 'Refresh failed', message);
      } finally {
        setRefreshing(false);
      }
    },
    [loadArticles, addToast]
  );

  // Auto-fetch countdown timer
  useEffect(() => {
    if (autoFetchInterval === 'off') {
      setSecondsLeft(null);
      return;
    }

    const intervalMap: Record<string, number> = {
      '1min': 60,
      '5min': 300,
      '15min': 900,
      '1hour': 3600,
      'daily': 86400,
    };

    const intervalSecs = intervalMap[autoFetchInterval] || 60;
    setSecondsLeft(intervalSecs);

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev === null || prev <= 1) {
          handleRefresh(true);
          return intervalSecs;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoFetchInterval, handleRefresh]);

  const handleSaveInterval = (mode: string) => {
    setAutoFetchInterval(mode);
    localStorage.setItem('realitylayer_news_interval', mode);
    addToast('info', 'Schedule Updated', `Auto-fetch schedule set to: ${mode}`);
  };

  const handleDeleteArticle = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    try {
      const res = await fetch(`/api/news?id=${deleteTarget.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed');

      addToast('success', 'Article removed', `“${deleteTarget.title.slice(0, 40)}…” deleted.`);
      setDeleteTarget(null);
      await loadArticles();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Delete failed';
      addToast('error', 'Delete error', message);
    } finally {
      setDeletingId(null);
    }
  };

  const lastUpdated = useMemo(() => {
    const dates = articles.map((a) => a.fetchedAt).filter(Boolean);
    if (!dates.length) return 'Not yet';
    try {
      const latest = new Date(dates.sort().at(-1)!);
      return timeAgo(latest);
    } catch {
      return 'Recently';
    }
  }, [articles]);

  const formatSeconds = (secs: number | null) => {
    if (secs === null) return 'Paused';
    if (secs >= 3600) {
      const h = Math.floor(secs / 3600);
      const m = Math.floor((secs % 3600) / 60);
      return `${h}h ${m}m`;
    }
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Toast notifications container */}
      <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 rounded-xl border p-4 shadow-xl backdrop-blur-md transition-all animate-in slide-in-from-top-3 ${
              t.type === 'success'
                ? 'border-emerald-200 bg-emerald-50/95 text-emerald-900 dark:bg-emerald-950/90 dark:border-emerald-800 dark:text-emerald-200'
                : t.type === 'error'
                ? 'border-rose-200 bg-rose-50/95 text-rose-900 dark:bg-rose-950/90 dark:border-rose-800 dark:text-rose-200'
                : 'border-blue-200 bg-blue-50/95 text-blue-900 dark:bg-blue-950/90 dark:border-blue-800 dark:text-blue-200'
            }`}
          >
            {t.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : t.type === 'error' ? (
              <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            ) : (
              <Sparkles className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-semibold text-sm">{t.title}</p>
              {t.description && <p className="text-xs opacity-90 mt-0.5">{t.description}</p>}
            </div>
          </div>
        ))}
      </div>

      {/* Page Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-900 text-white shadow-sm">
              <Newspaper size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
                News Feed
              </h1>
              <p className="text-sm text-neutral-500">
                Live spaceflight, tech, and digital twin industry updates.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowScheduleModal(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3.5 py-2 text-sm font-medium text-neutral-700 shadow-xs hover:bg-neutral-50 hover:text-neutral-900 transition-colors"
          >
            <Timer size={15} className="text-neutral-500" />
            <span>Schedule:</span>
            <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-800">
              {autoFetchInterval === 'daily'
                ? 'Daily'
                : autoFetchInterval === 'off'
                ? 'Paused'
                : autoFetchInterval}
            </span>
          </button>

          <button
            onClick={() => setConfirmRefreshModal(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white shadow-xs hover:bg-neutral-800 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            <span>{refreshing ? 'Syncing...' : 'Refresh News Now'}</span>
          </button>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-neutral-500">
              Total Articles
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <Newspaper size={16} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-neutral-900">{total}</span>
            <span className="text-xs text-neutral-500">cached items</span>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-neutral-500">
              Last Updated
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Clock size={16} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-neutral-900">{lastUpdated}</span>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-neutral-500">
              News Sources
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <Globe size={16} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-neutral-900">{sources.length}</span>
            <span className="text-xs text-neutral-500">
              {sources[0] ? `Top: ${sources[0]}` : 'Active feeds'}
            </span>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-neutral-500">
              Auto-Fetch Schedule
            </span>
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                autoFetchInterval === 'off'
                  ? 'bg-neutral-100 text-neutral-500'
                  : 'bg-emerald-50 text-emerald-600'
              }`}
            >
              <Timer size={16} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-xl font-bold text-neutral-900">
              {autoFetchInterval === 'off'
                ? 'Paused'
                : autoFetchInterval === 'daily'
                ? '12:05 AM UTC'
                : formatSeconds(secondsLeft)}
            </span>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                autoFetchInterval === 'off'
                  ? 'bg-neutral-100 text-neutral-600'
                  : 'bg-emerald-50 text-emerald-700'
              }`}
            >
              {autoFetchInterval === 'off'
                ? 'Idle'
                : autoFetchInterval === 'daily'
                ? 'Daily'
                : 'Active Timer'}
            </span>
          </div>
        </div>
      </div>

      {/* Filter & Control Toolbar */}
      <div className="mb-6 card p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/* Search box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search news by title or summary..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-10 pr-10 text-sm placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filters & View Toggles */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Source select */}
            <div className="flex items-center gap-1.5">
              <SlidersHorizontal size={14} className="text-neutral-400" />
              <select
                value={selectedSource}
                onChange={(e) => setSelectedSource(e.target.value)}
                className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-700 focus:border-neutral-900 focus:outline-none"
              >
                <option value="">All News Sources ({sources.length})</option>
                {sources.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort order select */}
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
              className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-700 focus:border-neutral-900 focus:outline-none"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex items-center rounded-lg border border-neutral-200 bg-neutral-50 p-0.5">
              <button
                onClick={() => setViewMode('grid')}
                className={`rounded-md p-1.5 text-neutral-600 transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-white text-neutral-900 shadow-xs'
                    : 'hover:text-neutral-900'
                }`}
                title="Grid view"
              >
                <LayoutGrid size={16} />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`rounded-md p-1.5 text-neutral-600 transition-colors ${
                  viewMode === 'table'
                    ? 'bg-white text-neutral-900 shadow-xs'
                    : 'hover:text-neutral-900'
                }`}
                title="Table view"
              >
                <TableIcon size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((idx) => (
            <div key={idx} className="card p-4 animate-pulse">
              <div className="h-44 w-full rounded-lg bg-neutral-200" />
              <div className="mt-4 h-4 w-1/3 rounded bg-neutral-200" />
              <div className="mt-2 h-5 w-4/5 rounded bg-neutral-200" />
              <div className="mt-2 h-4 w-full rounded bg-neutral-200" />
            </div>
          ))}
        </div>
      ) : articles.length === 0 ? (
        <div className="card flex flex-col items-center justify-center p-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400">
            <Newspaper size={24} />
          </div>
          <h3 className="mt-4 text-base font-semibold text-neutral-900">No news articles found</h3>
          <p className="mt-1 text-sm text-neutral-500 max-w-sm">
            Try adjusting your search keywords, clear source filters, or click “Refresh News Now” to sync new articles.
          </p>
          <button
            onClick={() => {
              setSearch('');
              setSelectedSource('');
              handleRefresh();
            }}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 transition-colors"
          >
            <RefreshCw size={14} />
            Reset & Sync News
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* CARD GRID VIEW */
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((item) => (
            <div
              key={item.id}
              className="card card-hover group flex flex-col overflow-hidden border border-neutral-200/80 bg-white"
            >
              {/* Image thumbnail */}
              <div className="relative h-48 w-full overflow-hidden bg-neutral-100">
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-neutral-100 to-neutral-200 text-neutral-400">
                    <Newspaper size={36} />
                  </div>
                )}
                {/* Source Badge overlay */}
                <div className="absolute top-3 left-3">
                  <span className="inline-flex items-center gap-1 rounded-md bg-neutral-900/80 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-md">
                    {item.newsSite || 'News'}
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div className="flex flex-1 flex-col p-5">
                <div className="flex items-center gap-2 text-xs text-neutral-500 mb-2">
                  <Calendar size={13} />
                  <span>{formatDate(item.publishedAt)}</span>
                </div>

                <h3 className="font-semibold text-neutral-900 line-clamp-2 group-hover:text-neutral-700 transition-colors">
                  {item.title}
                </h3>

                <p className="mt-2 text-xs text-neutral-600 line-clamp-3 leading-relaxed flex-1">
                  {item.summary || 'No summary available.'}
                </p>

                {/* Card Actions Footer */}
                <div className="mt-4 pt-4 border-t border-neutral-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveArticle(item)}
                      className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition-colors"
                    >
                      <Eye size={13} />
                      <span>Details</span>
                    </button>
                    <a
                      href={item.articleUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition-colors"
                    >
                      <ExternalLink size={13} />
                      <span>Original</span>
                    </a>
                  </div>

                  <button
                    onClick={() => setDeleteTarget(item)}
                    disabled={deletingId === item.id}
                    className="rounded-md p-1.5 text-neutral-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                    title="Delete article"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50/80 text-xs font-medium uppercase tracking-wider text-neutral-500">
                <tr>
                  <th className="px-5 py-3.5">Image</th>
                  <th className="px-5 py-3.5">Title</th>
                  <th className="px-5 py-3.5">News Site</th>
                  <th className="px-5 py-3.5">Published</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {articles.map((item) => (
                  <tr key={item.id} className="hover:bg-neutral-50/60 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="h-12 w-16 overflow-hidden rounded-md bg-neutral-100 shrink-0">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt=""
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-neutral-400">
                            <Newspaper size={16} />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 max-w-md">
                      <p className="font-semibold text-neutral-900 line-clamp-1">{item.title}</p>
                      <p className="text-xs text-neutral-500 line-clamp-1 mt-0.5">
                        {item.summary || 'No summary'}
                      </p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700">
                        {item.newsSite || '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-xs text-neutral-600">
                      {formatDate(item.publishedAt)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Live
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setActiveArticle(item)}
                          className="rounded-md px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition-colors"
                        >
                          View
                        </button>
                        <a
                          href={item.articleUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-md p-1.5 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
                          title="Open original article"
                        >
                          <ExternalLink size={14} />
                        </a>
                        <button
                          onClick={() => setDeleteTarget(item)}
                          className="rounded-md p-1.5 text-neutral-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                          title="Delete article"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ARTICLE DETAILS MODAL */}
      {activeArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-xs bg-neutral-900/40 animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl border border-neutral-100 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setActiveArticle(null)}
              className="absolute top-4 right-4 rounded-full p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
            >
              <X size={18} />
            </button>

            {activeArticle.imageUrl && (
              <div className="mb-4 h-64 w-full overflow-hidden rounded-xl bg-neutral-100">
                <img
                  src={activeArticle.imageUrl}
                  alt={activeArticle.title}
                  className="h-full w-full object-cover"
                />
              </div>
            )}

            <div className="flex items-center gap-2 text-xs font-medium text-neutral-500 mb-2">
              <span className="rounded bg-neutral-100 px-2 py-0.5 font-semibold text-neutral-800">
                {activeArticle.newsSite || 'News'}
              </span>
              <span>•</span>
              <span>Published: {formatDate(activeArticle.publishedAt)}</span>
            </div>

            <h2 className="text-xl font-bold text-neutral-900 mb-3 leading-snug">
              {activeArticle.title}
            </h2>

            <p className="text-sm text-neutral-600 leading-relaxed whitespace-pre-line mb-6">
              {activeArticle.summary || 'No extended summary provided for this article.'}
            </p>

            <div className="rounded-xl bg-neutral-50 p-4 border border-neutral-100 text-xs text-neutral-500 space-y-1.5 mb-6">
              <div className="flex justify-between">
                <span className="font-medium text-neutral-700">Source:</span>
                <span>{activeArticle.newsSite || 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-neutral-700">Synchronized At:</span>
                <span>{formatDate(activeArticle.fetchedAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-neutral-700">External ID:</span>
                <span className="font-mono">{activeArticle.externalId}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setActiveArticle(null)}
                className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                Close
              </button>
              <a
                href={activeArticle.articleUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 transition-colors"
              >
                <span>Open Original Article</span>
                <ExternalLink size={14} />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM REFRESH MODAL */}
      {confirmRefreshModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-xs bg-neutral-900/40 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-neutral-100">
            <h3 className="text-lg font-bold text-neutral-900 mb-2">
              Refresh & Synchronize News Feed
            </h3>
            <p className="text-sm text-neutral-600 mb-6">
              This will fetch the latest articles from the active news APIs and atomically update the cached news store.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setConfirmRefreshModal(false)}
                className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRefresh(false)}
                disabled={refreshing}
                className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 transition-colors disabled:opacity-50"
              >
                <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                <span>{refreshing ? 'Refreshing...' : 'Confirm Refresh'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-xs bg-neutral-900/40 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-neutral-100">
            <h3 className="text-lg font-bold text-neutral-900 mb-2 text-rose-600">
              Delete News Article
            </h3>
            <p className="text-sm text-neutral-600 mb-6">
              Are you sure you want to delete <strong className="text-neutral-900">“{deleteTarget.title}”</strong>? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteArticle}
                disabled={deletingId === deleteTarget.id}
                className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 transition-colors disabled:opacity-50"
              >
                <Trash2 size={14} />
                <span>{deletingId === deleteTarget.id ? 'Deleting...' : 'Delete Article'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AUTO-FETCH SCHEDULE CONFIGURATION MODAL */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-xs bg-neutral-900/40 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-neutral-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Timer className="h-5 w-5 text-neutral-800" />
                <h3 className="text-lg font-bold text-neutral-900">
                  Configure Auto-Fetch Schedule
                </h3>
              </div>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-neutral-500 mb-4">
              Configure automatic background news synchronization. Choose a rapid interval (1 or 5 minutes) to test live automatic updates in your browser.
            </p>

            <div className="space-y-2 mb-5">
              {[
                { id: '1min', label: '⚡ Every 1 Minute (Rapid Test Mode)', desc: 'Triggers sync & replacement every 60 seconds.' },
                { id: '5min', label: '⚡ Every 5 Minutes (Fast Test Mode)', desc: 'Triggers sync & replacement every 5 minutes.' },
                { id: '15min', label: '⏱️ Every 15 Minutes', desc: 'Syncs every 15 minutes.' },
                { id: '1hour', label: '⏱️ Every 1 Hour', desc: 'Syncs once every hour.' },
                { id: 'daily', label: '📅 Daily at 12:05 AM UTC', desc: 'Standard production daily cadence.' },
                { id: 'off', label: '⏸️ Paused / Disabled', desc: 'Disable automatic sync timers.' },
              ].map((opt) => (
                <label
                  key={opt.id}
                  className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-all ${
                    autoFetchInterval === opt.id
                      ? 'border-neutral-900 bg-neutral-50/80 shadow-xs'
                      : 'border-neutral-200 hover:bg-neutral-50/40'
                  }`}
                >
                  <input
                    type="radio"
                    name="autoFetchInterval"
                    value={opt.id}
                    checked={autoFetchInterval === opt.id}
                    onChange={() => handleSaveInterval(opt.id)}
                    className="mt-0.5 accent-neutral-900"
                  />
                  <div>
                    <p className="text-xs font-semibold text-neutral-900">{opt.label}</p>
                    <p className="text-[11px] text-neutral-500 mt-0.5">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>

            {autoFetchInterval !== 'off' && autoFetchInterval !== 'daily' && (
              <div className="mb-5 rounded-xl bg-blue-50/80 p-3 text-xs text-blue-900 border border-blue-100 flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-medium">
                  <Play size={12} className="text-blue-600" />
                  Active Countdown:
                </span>
                <span className="font-mono font-bold">{formatSeconds(secondsLeft)}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
              <button
                onClick={() => {
                  setShowScheduleModal(false);
                  handleRefresh(true);
                }}
                disabled={refreshing}
                className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
                <span>Test Trigger Now</span>
              </button>

              <button
                onClick={() => setShowScheduleModal(false)}
                className="rounded-lg bg-neutral-900 px-4 py-2 text-xs font-medium text-white hover:bg-neutral-800 transition-colors"
              >
                Save & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
