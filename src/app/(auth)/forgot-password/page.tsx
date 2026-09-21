'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Logo } from '@/components/brand/logo';
import { Mail, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Simulated — actual email sending requires SMTP configuration
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setSent(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm animate-in">
      <div className="mb-8 flex flex-col items-center">
        <Link href="/">
          <Logo size="lg" />
        </Link>
        <p className="mt-3 text-sm text-neutral-500">
          Reset your password
        </p>
      </div>

      <div className="card p-6">
        {sent ? (
          <div className="flex flex-col items-center py-4 text-center">
            <div className="mb-3 rounded-full bg-emerald-50 p-3">
              <CheckCircle size={24} className="text-emerald-600" />
            </div>
            <h3 className="text-sm font-semibold text-neutral-900">Check your email</h3>
            <p className="mt-2 text-sm text-neutral-500">
              If an account exists for <strong className="text-neutral-700">{email}</strong>, we&apos;ve sent password reset instructions.
            </p>
            <Link
              href="/login"
              className="mt-6 text-sm font-medium text-neutral-900 hover:underline"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                <AlertCircle size={14} />
                {error}
              </div>
            )}

            <p className="mb-4 text-sm text-neutral-500">
              Enter your email address and we&apos;ll send you a link to reset your password.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-neutral-700">
                  Email
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full rounded-lg border border-neutral-200 bg-white py-2.5 pl-10 pr-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900/5"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-neutral-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </button>
            </form>
          </>
        )}
      </div>

      {!sent && (
        <p className="mt-6 text-center text-sm text-neutral-500">
          Remember your password?{' '}
          <Link href="/login" className="font-medium text-neutral-900 hover:underline">
            Sign in
          </Link>
        </p>
      )}
    </div>
  );
}
