'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/brand/logo';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Network,
  FileText,
  AlertTriangle,
  Search,
  BarChart3,
  GitBranch,
  ArrowLeftRight,
  FileBarChart,
  Settings,
  Plus,
  ChevronsUpDown,
  Newspaper,
} from 'lucide-react';

interface SidebarProps {
  projectId?: string;
  projectName?: string;
  className?: string;
}

const dashboardLinks = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Overview' },
  { href: '/news', icon: Newspaper, label: 'News Feed' },
];

function getProjectLinks(projectId: string) {
  return [
    { href: `/projects/${projectId}`, icon: LayoutDashboard, label: 'Overview' },
    { href: `/projects/${projectId}/twin`, icon: Network, label: 'Digital Twin' },
    { href: `/projects/${projectId}/pages`, icon: FileText, label: 'Pages' },
    { href: `/projects/${projectId}/issues`, icon: AlertTriangle, label: 'Issues' },
    { href: `/projects/${projectId}/seo`, icon: Search, label: 'SEO' },
    { href: `/projects/${projectId}/performance`, icon: BarChart3, label: 'Performance' },
    { href: `/projects/${projectId}/structure`, icon: GitBranch, label: 'Structure' },
    { href: `/projects/${projectId}/changes`, icon: ArrowLeftRight, label: 'Changes' },
    { href: `/projects/${projectId}/reports`, icon: FileBarChart, label: 'Reports' },
  ];
}

export function Sidebar({ projectId, projectName, className }: SidebarProps) {
  const pathname = usePathname();

  const links = projectId ? getProjectLinks(projectId) : dashboardLinks;

  return (
    <aside
      className={cn(
        'sticky top-0 z-30 hidden h-screen w-60 shrink-0 flex-col border-r border-[var(--border-default)] bg-white lg:flex',
        className
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center px-5">
        <Link href="/dashboard">
          <Logo size="sm" />
        </Link>
      </div>

      {/* Project selector */}
      {projectId && (
        <div className="mx-3 mb-2">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 rounded-lg border border-neutral-100 bg-neutral-50/50 px-3 py-2 transition-colors hover:bg-neutral-100"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-neutral-900 text-xs font-bold text-white">
              {(projectName || 'P')[0].toUpperCase()}
            </div>
            <div className="flex-1 truncate">
              <p className="truncate text-xs font-medium text-neutral-900">
                {projectName || 'Project'}
              </p>
            </div>
            <ChevronsUpDown size={12} className="text-neutral-400" />
          </Link>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive =
            pathname === link.href ||
            (link.href !== '/dashboard' &&
              link.href !== `/projects/${projectId}` &&
              pathname.startsWith(link.href));
          const isExactActive = pathname === link.href;

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                isActive || isExactActive
                  ? 'bg-neutral-100 font-medium text-neutral-900'
                  : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-700'
              )}
            >
              <Icon size={16} />
              {link.label}
            </Link>
          );
        })}

        {/* Separator + Settings */}
        {projectId && (
          <>
            <div className="my-3 h-px bg-neutral-100" />
            <Link
              href={`/projects/${projectId}/settings`}
              className={cn(
                'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                pathname === `/projects/${projectId}/settings`
                  ? 'bg-neutral-100 font-medium text-neutral-900'
                  : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-700'
              )}
            >
              <Settings size={16} />
              Project Settings
            </Link>
          </>
        )}
      </nav>

      {/* Bottom action */}
      {!projectId && (
        <div className="border-t border-neutral-100 p-3">
          <Link
            href="/dashboard/new"
            className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-neutral-300 py-2.5 text-sm font-medium text-neutral-600 transition-all hover:border-neutral-400 hover:bg-neutral-50 hover:text-neutral-900"
          >
            <Plus size={14} />
            New Project
          </Link>
        </div>
      )}
    </aside>
  );
}
