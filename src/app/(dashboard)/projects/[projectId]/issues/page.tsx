'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AlertTriangle, AlertCircle, Info, CheckCircle, ExternalLink } from 'lucide-react';
import { cn, getSeverityColor } from '@/lib/utils';

interface IssueItem {
  id: string;
  type: string;
  severity: string;
  title: string;
  description: string;
  evidence: string | null;
  recommendation: string | null;
  impact: string | null;
  affectedPages: number;
  page: { url: string; path: string; title: string | null } | null;
}

interface IssueSummary {
  critical: number;
  warning: number;
  info: number;
  distinctTypes?: number;
}

const severityIcons = {
  CRITICAL: AlertCircle,
  WARNING: AlertTriangle,
  INFO: Info,
};

const severityLabels = {
  CRITICAL: 'Critical',
  WARNING: 'Warning',
  INFO: 'Info',
};

export default function IssuesPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const [issues, setIssues] = useState<IssueItem[]>([]);
  const [summary, setSummary] = useState<IssueSummary>({ critical: 0, warning: 0, info: 0 });
  const [filter, setFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const params = new URLSearchParams({
        pageSize: '100',
        ...(filter ? { severity: filter } : {}),
      });
      const res = await fetch(`/api/projects/${projectId}/issues?${params}`);
      const json = await res.json();
      if (json.success) {
        setIssues(json.data.items);
        setSummary(json.data.summary);
      }
      setLoading(false);
    }
    load();
  }, [projectId, filter]);

  const totalIssues = summary.critical + summary.warning + summary.info;

  return (
    <div className="animate-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Issues</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {summary.distinctTypes
            ? `${summary.distinctTypes} distinct issue types across ${totalIssues} occurrences`
            : `${totalIssues} issues found`}
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { key: 'CRITICAL', count: summary.critical, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100' },
          { key: 'WARNING', count: summary.warning, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
          { key: 'INFO', count: summary.info, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
        ].map((s) => {
          const Icon = severityIcons[s.key as keyof typeof severityIcons];
          const isActive = filter === s.key;
          return (
            <button
              key={s.key}
              onClick={() => setFilter(isActive ? null : s.key)}
              className={cn(
                'rounded-lg border p-4 text-left transition-all',
                isActive ? `${s.bg} ${s.border} ring-1 ring-current/10` : 'border-neutral-200 bg-white hover:bg-neutral-50'
              )}
            >
              <div className="flex items-center gap-2">
                <Icon size={14} className={s.color} />
                <span className="text-xs font-medium text-neutral-500">
                  {severityLabels[s.key as keyof typeof severityLabels]}
                </span>
              </div>
              <p className={cn('mt-1 text-2xl font-bold', s.color)}>{s.count}</p>
            </button>
          );
        })}
      </div>

      {/* Issue list */}
      <div className="space-y-2">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="card p-4">
              <div className="skeleton h-4 w-3/4 mb-2" />
              <div className="skeleton h-3 w-1/2" />
            </div>
          ))
        ) : issues.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <CheckCircle size={24} className="text-emerald-400" />
            <h3 className="mt-3 text-sm font-semibold text-neutral-900">
              {filter ? 'No issues at this severity level' : 'No issues found'}
            </h3>
            <p className="mt-1 text-xs text-neutral-500">
              {filter ? 'Try a different filter.' : 'Your website is looking healthy!'}
            </p>
          </div>
        ) : (
          issues.map((issue) => {
            const Icon = severityIcons[issue.severity as keyof typeof severityIcons] || Info;
            const isExpanded = expandedId === issue.id;

            return (
              <button
                key={issue.id}
                onClick={() => setExpandedId(isExpanded ? null : issue.id)}
                className="card w-full p-4 text-left transition-all hover:shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    'mt-0.5 rounded-md p-1',
                    issue.severity === 'CRITICAL' ? 'bg-red-50' :
                    issue.severity === 'WARNING' ? 'bg-amber-50' : 'bg-blue-50'
                  )}>
                    <Icon size={14} className={
                      issue.severity === 'CRITICAL' ? 'text-red-500' :
                      issue.severity === 'WARNING' ? 'text-amber-500' : 'text-blue-500'
                    } />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-neutral-900">{issue.title}</h3>
                      <span className={cn(
                        'inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium border',
                        getSeverityColor(issue.severity)
                      )}>
                        {issue.severity}
                      </span>
                    </div>

                    {issue.page && (
                      <p className="mt-0.5 text-xs text-neutral-400 font-mono truncate">
                        {issue.page.path}
                      </p>
                    )}

                    {isExpanded && (
                      <div className="mt-3 space-y-3">
                        <p className="text-sm text-neutral-600 leading-relaxed">
                          {issue.description}
                        </p>
                        {issue.recommendation && (
                          <div className="rounded-md bg-neutral-50 p-3">
                            <p className="text-xs font-medium text-neutral-500 mb-1">Recommendation</p>
                            <p className="text-xs text-neutral-700">{issue.recommendation}</p>
                          </div>
                        )}
                        {issue.page && (
                          <a
                            href={issue.page.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-700"
                            onClick={(e) => e.stopPropagation()}
                          >
                            View page <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
