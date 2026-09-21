'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Network,
  FileText,
  AlertTriangle,
  Zap,
  GitBranch,
  ArrowLeftRight,
  FileBarChart,
  Settings,
  Plus,
  ArrowRight,
  Newspaper,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CommandPaletteProps {
  projectId?: string;
}

export function CommandPalette({ projectId }: CommandPaletteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const router = useRouter();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setIsOpen((prev) => !prev);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const navigateTo = (path: string) => {
    setIsOpen(false);
    setQuery('');
    router.push(path);
  };

  const projectItems = projectId
    ? [
        { label: 'Digital Twin Graph', icon: Network, path: `/projects/${projectId}/twin` },
        { label: 'Discovered Pages', icon: FileText, path: `/projects/${projectId}/pages` },
        { label: 'Issue Diagnostics', icon: AlertTriangle, path: `/projects/${projectId}/issues` },
        { label: 'SEO Coverage', icon: Search, path: `/projects/${projectId}/seo` },
        { label: 'Performance Latency', icon: Zap, path: `/projects/${projectId}/performance` },
        { label: 'Information Architecture', icon: GitBranch, path: `/projects/${projectId}/structure` },
        { label: 'Version Diff History', icon: ArrowLeftRight, path: `/projects/${projectId}/changes` },
        { label: 'Reports & Export', icon: FileBarChart, path: `/projects/${projectId}/reports` },
        { label: 'Project Settings', icon: Settings, path: `/projects/${projectId}/settings` },
      ]
    : [];

  const globalItems = [
    { label: 'Dashboard Overview', icon: FileText, path: '/dashboard' },
    { label: 'News Feed & Updates', icon: Newspaper, path: '/news' },
    { label: 'Create New Project', icon: Plus, path: '/dashboard/new' },
  ];

  const allItems = [...projectItems, ...globalItems];
  const filtered = allItems.filter((item) =>
    item.label.toLowerCase().includes(query.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-neutral-900/40 backdrop-blur-xs transition-opacity"
        onClick={() => setIsOpen(false)}
      />

      {/* Modal dialog */}
      <div className="relative w-full max-w-lg rounded-2xl border border-neutral-200 bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        {/* Search Input */}
        <div className="flex items-center border-b border-neutral-100 px-4 py-3">
          <Search size={16} className="text-neutral-400 mr-2.5" />
          <input
            type="text"
            placeholder="Type a destination or command..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="w-full text-xs font-medium text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
          />
          <kbd className="rounded border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 text-[10px] text-neutral-400">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-neutral-400">
              No matching commands or destinations found.
            </div>
          ) : (
            <div className="space-y-0.5">
              {filtered.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => navigateTo(item.path)}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-medium text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600">
                        <Icon size={14} />
                      </div>
                      <span>{item.label}</span>
                    </div>
                    <ArrowRight size={12} className="text-neutral-400" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
