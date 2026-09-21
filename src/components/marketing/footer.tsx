import Link from 'next/link';
import { Logo } from '@/components/brand/logo';

export function Footer() {
  return (
    <footer className="border-t border-[var(--border-subtle)] bg-white">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
          <Logo size="sm" />
          <div className="flex items-center gap-6 text-sm text-neutral-400">
            <Link href="#" className="transition-colors hover:text-neutral-600">
              Privacy
            </Link>
            <Link href="#" className="transition-colors hover:text-neutral-600">
              Terms
            </Link>
            <span>© {new Date().getFullYear()} RealityLayer</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
