'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Logo } from '@/components/brand/logo';
import { Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border-subtle)] bg-white/80 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" aria-label="RealityLayer Home">
          <Logo size="md" />
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-8 md:flex">
          <Link
            href="#features"
            className="text-sm text-neutral-500 transition-colors hover:text-neutral-900"
          >
            Features
          </Link>
          <Link
            href="#how-it-works"
            className="text-sm text-neutral-500 transition-colors hover:text-neutral-900"
          >
            How it Works
          </Link>
          <div className="h-4 w-px bg-neutral-200" />
          <Link
            href="/login"
            className="text-sm font-medium text-neutral-700 transition-colors hover:text-neutral-900"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center justify-center shrink-0 whitespace-nowrap rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-neutral-800 active:scale-[0.98]"
          >
            Get Started
          </Link>
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden p-2 text-neutral-600 hover:text-neutral-900"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {/* Mobile nav */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-neutral-100 bg-white md:hidden"
          >
            <div className="flex flex-col gap-1 px-6 py-4">
              <Link
                href="#features"
                className="rounded-md px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                onClick={() => setMobileOpen(false)}
              >
                Features
              </Link>
              <Link
                href="#how-it-works"
                className="rounded-md px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                onClick={() => setMobileOpen(false)}
              >
                How it Works
              </Link>
              <div className="my-2 h-px bg-neutral-100" />
              <Link
                href="/login"
                className="rounded-md px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                onClick={() => setMobileOpen(false)}
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="mt-1 rounded-lg bg-neutral-900 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-neutral-800"
                onClick={() => setMobileOpen(false)}
              >
                Get Started
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
