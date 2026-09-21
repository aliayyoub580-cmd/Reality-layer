'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Play, Loader2, AlertCircle } from 'lucide-react';

interface CrawlButtonProps {
  projectId: string;
  isFirstCrawl?: boolean;
  className?: string;
}

export function CrawlButton({
  projectId,
  isFirstCrawl = false,
  className = '',
}: CrawlButtonProps) {
  const router = useRouter();
  const [crawling, setCrawling] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimer = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const pollStatus = useCallback(() => {
    clearTimer();

    pollTimerRef.current = setInterval(async () => {
      try {
        const statusRes = await fetch(`/api/projects/${projectId}/crawl`);
        const statusJson = await statusRes.json();

        if (statusJson.success && statusJson.data) {
          const { status, pagesAnalyzed, totalPages } = statusJson.data;

          if (status === 'CRAWLING') {
            setCrawling(true);
            setProgressText(
              totalPages > 0
                ? `Crawling: ${pagesAnalyzed} / ${totalPages} pages`
                : `Crawling: ${pagesAnalyzed} pages...`
            );
          } else if (status === 'ANALYZING') {
            setCrawling(true);
            setProgressText('Synthesizing digital twin & health scores...');
          } else if (status === 'COMPLETED') {
            clearTimer();
            setCrawling(false);
            setProgressText('Complete!');
            router.refresh();
          } else if (status === 'FAILED') {
            clearTimer();
            setCrawling(false);
            setError(statusJson.data.errorMessage || 'Crawl failed');
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 1500);
  }, [projectId, router, clearTimer]);

  // Check if crawl is already in progress on mount
  useEffect(() => {
    let mounted = true;
    async function checkCurrentStatus() {
      try {
        const res = await fetch(`/api/projects/${projectId}/crawl`);
        const data = await res.json();
        if (mounted && data.success && data.data) {
          const { status } = data.data;
          if (status === 'CRAWLING' || status === 'ANALYZING') {
            setCrawling(true);
            setProgressText('Crawl in progress...');
            pollStatus();
          }
        }
      } catch {
        // ignore
      }
    }
    checkCurrentStatus();
    return () => {
      mounted = false;
      clearTimer();
    };
  }, [projectId, pollStatus, clearTimer]);

  const startCrawl = async () => {
    try {
      setCrawling(true);
      setError(null);
      setProgressText('Initiating crawl...');

      const res = await fetch(`/api/projects/${projectId}/crawl`, {
        method: 'POST',
      });

      const data = await res.json();

      // If already in progress (409), smoothly join the existing crawl
      if (res.status === 409) {
        setProgressText('Crawl in progress, connecting...');
        pollStatus();
        return;
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to start crawl');
      }

      pollStatus();
    } catch (err: any) {
      console.error('Start crawl error:', err);
      setError(err.message || 'Network error');
      setCrawling(false);
      clearTimer();
    }
  };

  if (isFirstCrawl) {
    return (
      <div className="flex flex-col items-center gap-3">
        <button
          onClick={startCrawl}
          disabled={crawling}
          className={`inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-neutral-800 active:scale-[0.98] disabled:opacity-85 ${className}`}
        >
          {crawling ? (
            <>
              <Loader2 size={16} className="animate-spin text-neutral-400" />
              <span>{progressText || 'Crawling Website...'}</span>
            </>
          ) : (
            <>
              <Play size={16} className="fill-white" />
              <span>Start First Crawl</span>
            </>
          )}
        </button>
        {error && (
          <p className="flex items-center gap-1.5 text-xs font-medium text-red-600">
            <AlertCircle size={14} />
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={startCrawl}
        disabled={crawling}
        className={`inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white shadow-xs transition-all hover:bg-neutral-800 active:scale-[0.98] disabled:opacity-85 ${className}`}
      >
        {crawling ? (
          <>
            <Loader2 size={14} className="animate-spin text-neutral-400" />
            <span className="text-xs">{progressText || 'Crawling...'}</span>
          </>
        ) : (
          <>
            <Play size={14} />
            <span>New Crawl</span>
          </>
        )}
      </button>
      {error && (
        <span className="text-xs text-red-600 truncate max-w-[200px]" title={error}>
          {error}
        </span>
      )}
    </div>
  );
}
