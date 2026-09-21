import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function AccountSettingsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }

  return (
    <div className="max-w-3xl space-y-8 animate-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Account Settings</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Manage your personal profile, credentials, and RealityLayer subscription preferences.
        </p>
      </div>

      {/* Profile Section */}
      <div className="rounded-xl border border-neutral-200/80 bg-white p-6 shadow-xs space-y-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-700">Profile Information</h2>

        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-900 text-lg font-bold text-white">
            {session?.user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div>
            <h3 className="font-semibold text-neutral-900">{session?.user?.name || 'User'}</h3>
            <p className="text-xs text-neutral-500">{session?.user?.email || 'user@example.com'}</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 pt-2">
          <div>
            <label className="block text-xs font-semibold text-neutral-700">Full Name</label>
            <input
              type="text"
              defaultValue={session?.user?.name || ''}
              disabled
              className="mt-1.5 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3.5 py-2 text-sm text-neutral-600 focus:outline-none cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700">Email Address</label>
            <input
              type="email"
              defaultValue={session?.user?.email || ''}
              disabled
              className="mt-1.5 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3.5 py-2 text-sm text-neutral-600 focus:outline-none cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      {/* Crawl Engine & Rate Limits */}
      <div className="rounded-xl border border-neutral-200/80 bg-white p-6 shadow-xs space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-700">Crawler & Resource Allocation</h2>
        
        <div className="divide-y divide-neutral-100 text-xs">
          <div className="py-3 flex items-center justify-between">
            <div>
              <p className="font-medium text-neutral-900">Concurrent Crawl Threads</p>
              <p className="text-neutral-500">Max parallel HTTP connections per project</p>
            </div>
            <span className="rounded bg-neutral-100 px-2 py-1 font-mono text-neutral-700">3 workers</span>
          </div>

          <div className="py-3 flex items-center justify-between">
            <div>
              <p className="font-medium text-neutral-900">Per-Domain Politeness Delay</p>
              <p className="text-neutral-500">Delay between successive requests to prevent rate limiting</p>
            </div>
            <span className="rounded bg-neutral-100 px-2 py-1 font-mono text-neutral-700">500ms</span>
          </div>

          <div className="py-3 flex items-center justify-between">
            <div>
              <p className="font-medium text-neutral-900">Digital Twin Engine Mode</p>
              <p className="text-neutral-500">Graph calculation algorithm</p>
            </div>
            <span className="rounded bg-indigo-50 px-2 py-1 font-medium text-indigo-700">BFS Hierarchical Dagre</span>
          </div>
        </div>
      </div>
    </div>
  );
}
