'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Loader2 } from 'lucide-react';

export function SeedDemoButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSeed = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/projects/demo', { method: 'POST' });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data?.projectId) {
          router.push(`/projects/${json.data.projectId}/twin`);
          return;
        }
      }
    } catch (err) {
      console.error('Failed to seed demo:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleSeed}
      disabled={loading}
      className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 shadow-xs hover:bg-neutral-50 hover:text-neutral-900 active:scale-[0.98] transition-all disabled:opacity-50"
    >
      {loading ? (
        <Loader2 size={14} className="animate-spin text-neutral-500" />
      ) : (
        <Sparkles size={14} className="text-amber-500" />
      )}
      <span>{loading ? 'Creating Twin...' : 'Explore Demo Twin'}</span>
    </button>
  );
}
