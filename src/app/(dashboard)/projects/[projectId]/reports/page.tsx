'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  FileBarChart,
  Download,
  Share2,
  Copy,
  Check,
  Printer,
  ShieldAlert,
  Globe,
  Heart,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ReportsPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [loading, setLoading] = useState(true);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    async function loadShareStatus() {
      try {
        setLoading(false);
        const res = await fetch(`/api/projects/${projectId}/share`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setShareToken(json.data.token);
          }
        }
      } catch (err) {
        console.error('Failed to load share token:', err);
      }
    }
    loadShareStatus();
  }, [projectId]);

  const handleToggleShare = async () => {
    try {
      setGenerating(true);
      if (shareToken) {
        // Revoke
        const res = await fetch(`/api/projects/${projectId}/share`, { method: 'DELETE' });
        if (res.ok) {
          setShareToken(null);
        }
      } else {
        // Create
        const res = await fetch(`/api/projects/${projectId}/share`, { method: 'POST' });
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setShareToken(json.data.token);
          }
        }
      }
    } catch (err) {
      console.error('Failed to update share status:', err);
    } finally {
      setGenerating(false);
    }
  };

  const copyShareLink = () => {
    if (!shareToken) return;
    const url = `${window.location.origin}/share/${shareToken}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Reports & Artifact Export</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Export digital twin snapshots, generate executive summaries, and manage public links.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3.5 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
          >
            <Printer size={14} /> Print / Save PDF
          </button>
          <a
            href={`/api/projects/${projectId}/export`}
            download
            className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3.5 py-2 text-xs font-medium text-white hover:bg-neutral-800"
          >
            <Download size={14} /> Export JSON
          </a>
        </div>
      </div>

      {/* Shareable Link Box */}
      <div className="rounded-xl border border-neutral-200/80 bg-white p-6 shadow-xs">
        <div className="flex items-center gap-2">
          <Share2 size={18} className="text-indigo-600" />
          <h2 className="text-base font-semibold text-neutral-900">Public Digital Twin Share Link</h2>
        </div>
        <p className="mt-1 text-xs text-neutral-500">
          Anyone with this private link can view a read-only audit overview and high-level health report of this project without logging in.
        </p>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          {shareToken ? (
            <div className="flex flex-1 items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-mono text-neutral-600">
              <span className="flex-1 truncate">
                {typeof window !== 'undefined' ? `${window.location.origin}/share/${shareToken}` : shareToken}
              </span>
              <button
                onClick={copyShareLink}
                className="inline-flex items-center gap-1 rounded bg-white px-2 py-1 text-xs font-sans font-medium text-neutral-700 shadow-xs hover:bg-neutral-100"
              >
                {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
              <a
                href={`/share/${shareToken}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded bg-white px-2 py-1 text-xs font-sans font-medium text-neutral-700 shadow-xs hover:bg-neutral-100"
              >
                <ExternalLink size={12} />
              </a>
            </div>
          ) : (
            <div className="flex-1 rounded-lg border border-dashed border-neutral-200 p-3 text-xs text-neutral-400">
              Public link is currently disabled.
            </div>
          )}

          <button
            onClick={handleToggleShare}
            disabled={generating}
            className={cn(
              'rounded-lg px-4 py-2 text-xs font-medium transition-colors',
              shareToken
                ? 'border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            )}
          >
            {generating ? 'Processing...' : shareToken ? 'Revoke Link' : 'Enable Public Link'}
          </button>
        </div>
      </div>

      {/* Available Export Formats */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-neutral-200/80 bg-white p-6 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <FileBarChart size={20} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-neutral-900">Executive Twin Report</h3>
              <p className="text-xs text-neutral-500">Comprehensive PDF-ready layout</p>
            </div>
          </div>
          <p className="mt-4 text-xs text-neutral-600 leading-relaxed">
            Includes high-level summary cards, top issues, category health breakdown (SEO, Technical, Accessibility, Structure, Content, Performance), and recommendations.
          </p>
          <div className="mt-5">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800"
            >
              Generate Printable View &rarr;
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-neutral-200/80 bg-white p-6 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
              <Download size={20} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-neutral-900">Raw JSON Graph Data</h3>
              <p className="text-xs text-neutral-500">Full telemetry & crawl database</p>
            </div>
          </div>
          <p className="mt-4 text-xs text-neutral-600 leading-relaxed">
            Download the raw structured JSON payload containing all discovered pages, link relations, issue diagnostics, and crawl telemetry for custom scripts or archiving.
          </p>
          <div className="mt-5">
            <a
              href={`/api/projects/${projectId}/export`}
              download
              className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800"
            >
              Download JSON Package &rarr;
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
