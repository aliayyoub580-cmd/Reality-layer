import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import {
  Heart,
  FileText,
  Link2,
  AlertTriangle,
  Search,
  Network,
  Play,
  ArrowRight,
  Clock,
  BarChart3,
} from 'lucide-react';
import { getHealthColor, timeAgo, formatNumber } from '@/lib/utils';
import { CrawlButton } from '@/components/dashboard/crawl-button';

export const metadata = { title: 'Project Overview' };

export default async function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const { projectId } = await params;

  const { findProjectWithDetails } = await import('@/lib/supabase');
  const details = await findProjectWithDetails(projectId, session.user.id);

  if (!details) notFound();

  const { project, crawls, counts } = details;
  const lastCrawl = crawls[0];
  const healthScore = lastCrawl?.healthScore ?? project.healthScore;

  // Determine if crawl was a limited partial sample
  const isLimited = Boolean(
    lastCrawl &&
      (lastCrawl.pagesDiscovered > lastCrawl.pagesAnalyzed ||
        lastCrawl.errorMessage?.includes('Limited crawl'))
  );
  const pagesAnalyzed = lastCrawl?.pagesAnalyzed ?? counts.pages;

  // Get issue counts by severity
  let issueCounts: any[] = [];
  let distinctIssueTypes: any[] = [];
  let unlinkedPagesCount = 0;
  let brokenLinkCount = 0;

  if (lastCrawl) {
    try {
      [issueCounts, distinctIssueTypes, unlinkedPagesCount, brokenLinkCount] = await Promise.all([
        db.issue.groupBy({
          by: ['severity'],
          where: { projectId, crawlId: lastCrawl.id },
          _count: true,
        }),
        db.issue.groupBy({
          by: ['type'],
          where: { projectId, crawlId: lastCrawl.id },
        }),
        db.page.count({
          where: {
            projectId,
            crawlId: lastCrawl.id,
            inboundLinks: { none: {} },
            path: { not: '/' },
            statusCode: 200,
            isIndexable: true,
          },
        }),
        db.link.count({
          where: {
            projectId,
            crawlId: lastCrawl.id,
            isInternal: true,
            statusCode: { in: [404, 410, 500, 502, 503] },
          },
        }),
      ]);
    } catch {
      // Fallback for Supabase cloud
      try {
        const { supabaseAdmin } = await import('@/lib/supabase');
        const { data: issues } = await supabaseAdmin.client
          .from('Issue')
          .select('severity, type')
          .eq('projectId', projectId)
          .eq('crawlId', lastCrawl.id);

        if (issues) {
          const sevMap: Record<string, number> = {};
          const typeSet = new Set<string>();
          issues.forEach((i: any) => {
            sevMap[i.severity] = (sevMap[i.severity] || 0) + 1;
            if (i.type) typeSet.add(i.type);
          });
          issueCounts = Object.entries(sevMap).map(([severity, count]) => ({
            severity,
            _count: count,
          }));
          distinctIssueTypes = Array.from(typeSet).map((type) => ({ type }));
        }
      } catch {}
    }
  }

  const criticalCount = issueCounts.find((i) => i.severity === 'CRITICAL')?._count ?? 0;
  const warningCount = issueCounts.find((i) => i.severity === 'WARNING')?._count ?? 0;
  const infoCount = issueCounts.find((i) => i.severity === 'INFO')?._count ?? 0;

  // In a limited partial crawl, unlinked pages are potential/unknown, NOT confirmed orphans
  const confirmedOrphanCount = isLimited ? 0 : unlinkedPagesCount;

  const stats = [
    {
      label: 'Health',
      value: healthScore != null ? Math.round(healthScore) : '—',
      sub: isLimited ? `Limited crawl · ${pagesAnalyzed} pages` : 'Full crawl score',
      icon: Heart,
      color: getHealthColor(healthScore),
      href: null,
    },
    {
      label: 'Pages',
      value: formatNumber(pagesAnalyzed),
      sub: isLimited ? `Capped at limit (${project.crawlLimit})` : 'Analyzed',
      icon: FileText,
      color: 'text-neutral-700',
      href: `/projects/${projectId}/pages`,
    },
    {
      label: 'Broken Links',
      value: brokenLinkCount,
      sub: brokenLinkCount === 0 ? '0 confirmed (404/500)' : `${brokenLinkCount} confirmed errors`,
      icon: Link2,
      color: brokenLinkCount > 0 ? 'text-red-600' : 'text-emerald-600',
      href: `/projects/${projectId}/issues`,
    },
    {
      label: 'SEO Issues',
      value: distinctIssueTypes.length > 0 ? `${distinctIssueTypes.length} types` : '0',
      sub: `${warningCount + criticalCount} issues on ${pagesAnalyzed} pages`,
      icon: Search,
      color: criticalCount > 0 ? 'text-red-600' : warningCount > 0 ? 'text-amber-500' : 'text-emerald-600',
      href: `/projects/${projectId}/seo`,
    },
    {
      label: 'Orphan Pages',
      value: confirmedOrphanCount === 0 ? '0 confirmed' : `${confirmedOrphanCount} confirmed`,
      sub: isLimited
        ? unlinkedPagesCount > 0
          ? `${unlinkedPagesCount} potential (limited crawl)`
          : '0 unlinked in sample'
        : 'Confirmed across site',
      icon: AlertTriangle,
      color: confirmedOrphanCount > 0 ? 'text-amber-500' : 'text-emerald-600',
      href: `/projects/${projectId}/structure`,
    },
  ];

  const hasCrawlData = !!lastCrawl && lastCrawl.status === 'COMPLETED';

  return (
    <div className="animate-in space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
            {project.name}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">{project.domain}</p>
        </div>
        <div className="flex items-center gap-3">
          {hasCrawlData && (
            <Link
              href={`/projects/${projectId}/twin`}
              className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition-all hover:bg-neutral-50"
            >
              <Network size={14} />
              Digital Twin
            </Link>
          )}
          <CrawlButton projectId={projectId} />
        </div>
      </div>

      {/* Stats grid */}
      {hasCrawlData ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {stats.map((stat) => {
            const Icon = stat.icon;
            const inner = (
              <div className="card p-5">
                <div className="flex items-center gap-2">
                  <Icon size={14} className="text-neutral-400" />
                  <span className="text-xs font-medium text-neutral-500">{stat.label}</span>
                </div>
                <p className={`mt-2 text-2xl font-bold ${stat.color}`}>
                  {stat.value}
                </p>
                <p className="mt-1 text-[11px] text-neutral-400 font-normal">
                  {stat.sub}
                </p>
              </div>
            );
            return stat.href ? (
              <Link key={stat.label} href={stat.href} className="card-hover">
                {inner}
              </Link>
            ) : (
              <div key={stat.label}>{inner}</div>
            );
          })}
        </div>
      ) : (
        /* Empty state - no crawl yet */
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-neutral-300 bg-white px-6 py-16 text-center">
          <div className="mb-4 rounded-xl bg-neutral-100 p-4">
            <Network size={24} className="text-neutral-400" />
          </div>
          <h2 className="text-lg font-semibold text-neutral-900">
            No crawl data yet
          </h2>
          <p className="mt-2 max-w-sm text-sm text-neutral-500">
            Start your first crawl to build this website&apos;s digital twin and discover its structure, health, and issues.
          </p>
          <div className="mt-6">
            <CrawlButton projectId={projectId} isFirstCrawl />
          </div>
        </div>
      )}

      {/* Quick actions */}
      {hasCrawlData && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { title: 'Digital Twin', desc: 'Explore your website visually', icon: Network, href: `/projects/${projectId}/twin` },
            { title: 'Issues', desc: `${criticalCount + warningCount + infoCount} issues found`, icon: AlertTriangle, href: `/projects/${projectId}/issues` },
            { title: 'SEO Analysis', desc: 'Review SEO health', icon: Search, href: `/projects/${projectId}/seo` },
            { title: 'Performance', desc: 'Check performance metrics', icon: BarChart3, href: `/projects/${projectId}/performance` },
            { title: 'Structure', desc: 'Click depth & orphan pages', icon: Network, href: `/projects/${projectId}/structure` },
            { title: 'Changes', desc: 'Compare crawl history', icon: Clock, href: `/projects/${projectId}/changes` },
          ].map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.title}
                href={action.href}
                className="card card-hover group flex items-center gap-4 p-4"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100 group-hover:bg-neutral-900 group-hover:text-white transition-colors">
                  <Icon size={18} className="text-neutral-600 group-hover:text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-neutral-900">{action.title}</h3>
                  <p className="text-xs text-neutral-500">{action.desc}</p>
                </div>
                <ArrowRight size={14} className="text-neutral-300 group-hover:text-neutral-500 transition-colors" />
              </Link>
            );
          })}
        </div>
      )}

      {/* Crawl history */}
      {crawls.length > 0 && (
        <div>
          <h2 className="mb-4 text-sm font-semibold text-neutral-700">Recent Crawls</h2>
          <div className="card divide-y divide-neutral-100">
            {crawls.map((crawl: any) => (
              <div key={crawl.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className={`h-2 w-2 rounded-full ${
                    crawl.status === 'COMPLETED' ? 'bg-emerald-400' :
                    crawl.status === 'FAILED' ? 'bg-red-400' :
                    crawl.status === 'CRAWLING' || crawl.status === 'ANALYZING' ? 'bg-amber-400 animate-pulse' :
                    'bg-neutral-300'
                  }`} />
                  <div>
                    <p className="text-sm font-medium text-neutral-900">
                      {crawl.pagesAnalyzed} pages
                    </p>
                    <p className="text-xs text-neutral-400">
                      {crawl.completedAt ? timeAgo(crawl.completedAt) : crawl.status}
                    </p>
                  </div>
                </div>
                {crawl.healthScore != null && (
                  <span className={`text-sm font-semibold ${getHealthColor(crawl.healthScore)}`}>
                    {Math.round(crawl.healthScore)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
