import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus, Globe, ArrowRight, Layers } from 'lucide-react';
import { timeAgo, getHealthColor } from '@/lib/utils';
import { SeedDemoButton } from '@/components/dashboard/seed-demo-button';

export const metadata = {
  title: 'Dashboard',
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const projects = await db.project.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: 'desc' },
    include: {
      crawls: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          id: true,
          status: true,
          pagesAnalyzed: true,
          completedAt: true,
          healthScore: true,
        },
      },
    },
  });

  return (
    <div className="animate-in">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
            Projects
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Your website digital twins
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SeedDemoButton />
          <Link
            href="/dashboard/new"
            className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-neutral-800 active:scale-[0.98]"
          >
            <Plus size={14} />
            New Project
          </Link>
        </div>
      </div>

      {/* Projects grid or empty state */}
      {projects.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-neutral-300 bg-white px-6 py-20 text-center">
          <div className="mb-4 rounded-xl bg-neutral-100 p-4">
            <Layers size={24} className="text-neutral-400" />
          </div>
          <h2 className="text-lg font-semibold text-neutral-900">
            Your RealityLayer is empty
          </h2>
          <p className="mt-2 max-w-sm text-sm text-neutral-500">
            Add your first website and build its digital twin. Discover your
            site&apos;s structure, health, and hidden problems.
          </p>
          <Link
            href="/dashboard/new"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-neutral-800 active:scale-[0.98]"
          >
            <Plus size={14} />
            Create Digital Twin
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => {
            const lastCrawl = project.crawls[0];
            const healthScore = lastCrawl?.healthScore ?? project.healthScore;
            const healthColor = getHealthColor(healthScore);

            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="card card-hover group p-5"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600 group-hover:bg-neutral-900 group-hover:text-white transition-colors">
                      <Globe size={16} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-neutral-900">
                        {project.name}
                      </h3>
                      <p className="text-xs text-neutral-400">{project.domain}</p>
                    </div>
                  </div>
                  <ArrowRight
                    size={14}
                    className="text-neutral-300 transition-all group-hover:translate-x-0.5 group-hover:text-neutral-500"
                  />
                </div>

                <div className="mt-4 flex items-center gap-4 text-xs text-neutral-500">
                  {healthScore !== null && healthScore !== undefined && (
                    <div className="flex items-center gap-1">
                      <span className="text-neutral-400">Health</span>
                      <span className={`font-semibold ${healthColor}`}>
                        {Math.round(healthScore)}
                      </span>
                    </div>
                  )}
                  {lastCrawl && (
                    <>
                      <div className="flex items-center gap-1">
                        <span className="text-neutral-400">Pages</span>
                        <span className="font-medium text-neutral-700">
                          {lastCrawl.pagesAnalyzed}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-neutral-400">
                          {lastCrawl.completedAt
                            ? timeAgo(lastCrawl.completedAt)
                            : lastCrawl.status}
                        </span>
                      </div>
                    </>
                  )}
                  {!lastCrawl && (
                    <span className="text-neutral-400">No crawls yet</span>
                  )}
                </div>
              </Link>
            );
          })}

          {/* Add project card */}
          <Link
            href="/dashboard/new"
            className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-neutral-200 bg-white p-8 text-center transition-colors hover:border-neutral-300 hover:bg-neutral-50"
          >
            <Plus size={20} className="text-neutral-400" />
            <span className="mt-2 text-sm font-medium text-neutral-500">
              Add Website
            </span>
          </Link>
        </div>
      )}
    </div>
  );
}
