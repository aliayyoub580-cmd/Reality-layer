'use client';

import { useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { Search, Command, LogOut, User, Settings, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { Logo } from '@/components/brand/logo';

interface TopbarProps {
  onMobileMenuToggle?: () => void;
  mobileMenuOpen?: boolean;
}

export function Topbar({ onMobileMenuToggle, mobileMenuOpen }: TopbarProps) {
  const { data: session } = useSession();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-4 border-b border-[var(--border-default)] bg-white/90 px-4 backdrop-blur-sm lg:px-6">
      {/* Mobile menu button */}
      <button
        className="lg:hidden p-1.5 text-neutral-500 hover:text-neutral-900"
        onClick={onMobileMenuToggle}
        aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
      >
        {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {/* Mobile logo */}
      <div className="lg:hidden">
        <Link href="/dashboard">
          <Logo size="sm" showText={false} />
        </Link>
      </div>

      {/* Search bar */}
      <div className="flex flex-1 items-center">
        <button
          className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50/50 px-3 py-1.5 text-sm text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
          aria-label="Search pages, URLs, issues..."
        >
          <Search size={14} />
          <span className="hidden sm:inline">Search pages, URLs, issues...</span>
          <kbd className="ml-8 hidden rounded border border-neutral-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-neutral-400 sm:inline">
            <Command size={9} className="mr-0.5 inline" />K
          </kbd>
        </button>
      </div>

      {/* User menu */}
      <div className="relative">
        <button
          onClick={() => setUserMenuOpen(!userMenuOpen)}
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-neutral-100"
          aria-expanded={userMenuOpen}
          aria-haspopup="true"
          aria-label="User menu"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-900 text-xs font-medium text-white">
            {session?.user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <span className="hidden text-sm font-medium text-neutral-700 sm:inline">
            {session?.user?.name || 'User'}
          </span>
        </button>

        {userMenuOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setUserMenuOpen(false)}
              aria-hidden="true"
            />
            <div className="absolute right-0 z-50 mt-1 w-48 rounded-lg border border-neutral-200 bg-white py-1 shadow-lg">
              <div className="border-b border-neutral-100 px-3 py-2">
                <p className="text-xs font-medium text-neutral-900">
                  {session?.user?.name}
                </p>
                <p className="text-xs text-neutral-400">{session?.user?.email}</p>
              </div>
              <Link
                href="/settings"
                className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-50"
                onClick={() => setUserMenuOpen(false)}
              >
                <Settings size={14} />
                Settings
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-50"
              >
                <LogOut size={14} />
                Sign out
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
