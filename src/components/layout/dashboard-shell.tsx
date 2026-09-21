'use client';

import { useState } from 'react';
import { SessionProvider } from 'next-auth/react';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { CommandPalette } from '@/components/layout/command-palette';
import { AnimatePresence, motion } from 'framer-motion';

interface DashboardLayoutProps {
  children: React.ReactNode;
  projectId?: string;
  projectName?: string;
}

export function DashboardShell({
  children,
  projectId,
  projectName,
}: DashboardLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <SessionProvider>
      <div className="flex min-h-screen bg-[var(--bg-primary)]">
        {/* Desktop sidebar */}
        <Sidebar projectId={projectId} projectName={projectName} />

        {/* Mobile sidebar overlay */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden"
                onClick={() => setMobileMenuOpen(false)}
                aria-hidden="true"
              />
              <motion.div
                initial={{ x: -240 }}
                animate={{ x: 0 }}
                exit={{ x: -240 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed inset-y-0 left-0 z-50 w-60 bg-white lg:hidden"
              >
                <Sidebar projectId={projectId} projectName={projectName} className="!flex h-full w-full" />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Main content area */}
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar
            onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
            mobileMenuOpen={mobileMenuOpen}
          />
          <main className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-8 lg:py-8 flex-1">
            {children}
          </main>
        </div>

        <CommandPalette projectId={projectId} />
      </div>
    </SessionProvider>
  );
}
