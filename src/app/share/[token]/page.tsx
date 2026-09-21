import { db } from '@/lib/db';
import { notFound } from 'next/navigation';
import { Logo } from '@/components/brand/logo';
import { Heart, Globe, AlertTriangle, ShieldCheck, CheckCircle2, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface SharePageProps {
  params: Promise<{ token: string }>;
}

export default async function PublicSharePage({ params }: SharePageProps) {
  const { token } = await params;

  const share = await db.shareLink.findUnique({
    where: { token },
    include: {
      project: {
        include: {
          crawls: {
            where: { status: 'COMPLETED' },
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: {
              issues: { take: 10 },
              pages: { take: 15 },
            },
          },
        },
      },
    },
  });

  if (!share || !share.isActive || !share.project) {
    notFound();
  }

  const { project } = share;
  const latestCrawl = project.crawls[0];

  return (
    <div className="min-h-screen bg-neutral-50/50">
      {/* Navbar */}
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Logo size="sm" />
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
              Read-Only Digital Twin Snapshot
            </span>
            <Link
              href="/signup"
              className="rounded-lg bg-neutral-900 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-neutral-800"
            >
              Sign Up Free
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="rounded-2xl border border-neutral-200/80 bg-white p-8 shadow-xs">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Website Report</span>
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-neutral-900">{project.name}</h1>
              <a
                href={project.url}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900"
              >
                <Globe size={14} /> {project.domain}
              </a>
            </div>

            <div className="flex items-center gap-4 rounded-xl border border-neutral-100 bg-neutral-50 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Heart size={24} />
              </div>
              <div>
                <div className="text-2xl font-black text-neutral-900">
                  {project.healthScore ? `${Math.round(project.healthScore)}%` : '—'}
                </div>
                <div className="text-xs text-neutral-500">System Health</div>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          {latestCrawl && (
            <div className="mt-8 grid grid-cols-2 gap-4 border-t border-neutral-100 pt-6 sm:grid-cols-4">
              <div>
                <span className="text-xs text-neutral-400">Pages Mapped</span>
                <p className="mt-0.5 text-xl font-bold text-neutral-900">{latestCrawl.pagesAnalyzed}</p>
              </div>
              <div>
                <span className="text-xs text-neutral-400">Open Issues</span>
                <p className="mt-0.5 text-xl font-bold text-neutral-900">{latestCrawl.issues.length}</p>
              </div>
              <div>
                <span className="text-xs text-neutral-400">Audit Status</span>
                <p className="mt-0.5 text-xl font-bold text-emerald-600">Verified</p>
              </div>
              <div>
                <span className="text-xs text-neutral-400">Generated</span>
                <p className="mt-0.5 text-sm font-medium text-neutral-700">
                  {new Date(latestCrawl.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Highlighted Issues */}
        {latestCrawl && latestCrawl.issues.length > 0 && (
          <div className="mt-8 rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-xs">
            <h2 className="text-base font-semibold text-neutral-900">System Vulnerabilities & Alerts</h2>
            <div className="mt-4 divide-y divide-neutral-100">
              {latestCrawl.issues.map((issue) => (
                <div key={issue.id} className="py-3 flex items-start gap-3">
                  <AlertTriangle
                    size={16}
                    className={
                      issue.severity === 'CRITICAL'
                        ? 'text-rose-500 mt-0.5'
                        : 'text-amber-500 mt-0.5'
                    }
                  />
                  <div>
                    <h3 className="text-sm font-medium text-neutral-900">{issue.title}</h3>
                    <p className="text-xs text-neutral-500 mt-0.5">{issue.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA banner */}
        <div className="mt-10 rounded-2xl bg-neutral-900 p-8 text-center text-white">
          <h2 className="text-xl font-bold">Want to explore the complete Digital Twin graph?</h2>
          <p className="mx-auto mt-2 max-w-md text-xs text-neutral-400">
            Create a free RealityLayer account to explore interactive graph topologies, inspect click depths, and track continuous regressions.
          </p>
          <div className="mt-6">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-xs font-semibold text-neutral-900 hover:bg-neutral-100"
            >
              Get Started Free <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
