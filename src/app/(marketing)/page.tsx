'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { HeroGraph } from '@/components/marketing/hero-graph';
import {
  Globe,
  Search,
  Link2,
  BarChart3,
  Eye,
  FileText,
  AlertTriangle,
  Route,
  Shield,
  ArrowRight,
  Zap,
  Layers,
  Scan,
  Compass,
} from 'lucide-react';
import { useState } from 'react';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: 'easeOut' as const },
  }),
};

const features = [
  { icon: Globe, title: 'Website Structure', desc: 'Map every page and understand the hierarchy of your site.' },
  { icon: Link2, title: 'Internal Links', desc: 'Visualize how pages connect and find weak points.' },
  { icon: Search, title: 'SEO Analysis', desc: 'Detect missing titles, meta descriptions, and canonical issues.' },
  { icon: Zap, title: 'Performance', desc: 'Measure load performance with Core Web Vitals insights.' },
  { icon: Eye, title: 'Accessibility', desc: 'Find missing alt text, heading issues, and form labels.' },
  { icon: FileText, title: 'Content', desc: 'Analyze word count, headings, and content structure.' },
  { icon: AlertTriangle, title: 'Broken Links', desc: 'Detect 404s, timeouts, and redirect chains.' },
  { icon: Route, title: 'User Flows', desc: 'Discover navigation paths and structural friction.' },
  { icon: Shield, title: 'Technical Health', desc: 'HTTPS, redirects, indexability, and more.' },
];

const insights = [
  '3 pages are isolated from the main navigation.',
  '27% of internal links point toward one page.',
  'Your pricing page requires 4 clicks from the homepage.',
  '6 pages have missing meta descriptions.',
];

const steps = [
  { num: '01', title: 'Enter URL', desc: 'Paste any publicly accessible website URL.' },
  { num: '02', title: 'RealityLayer crawls', desc: 'We discover pages, links, and metadata.' },
  { num: '03', title: 'Build digital twin', desc: 'Structure, health, and SEO are analyzed.' },
  { num: '04', title: 'Explore & diagnose', desc: 'Interact with your website\'s living blueprint.' },
];

export default function LandingPage() {
  const [url, setUrl] = useState('');

  return (
    <div className="overflow-hidden">
      {/* ─── Hero ───────────────────────────────────────── */}
      <section className="relative pb-20 pt-16 md:pb-28 md:pt-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col items-center text-center">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-1.5 text-xs font-medium text-neutral-500"
            >
              <Layers size={12} />
              Website Digital Twin Platform
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.6 }}
              className="max-w-3xl text-4xl font-bold leading-[1.1] tracking-tight text-neutral-900 md:text-6xl"
            >
              See Your Website as a{' '}
              <span className="text-gradient">Living System</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="mt-6 max-w-xl text-base leading-relaxed text-neutral-500 md:text-lg"
            >
              RealityLayer turns any website into an interactive digital twin
              — revealing its structure, health, performance, SEO, and
              user-flow bottlenecks.
            </motion.p>

            {/* URL Input */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.6 }}
              className="mt-10 w-full max-w-lg"
            >
              <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white p-1.5 shadow-sm transition-all focus-within:border-neutral-300 focus-within:shadow-md">
                <div className="flex items-center gap-2 pl-3 text-neutral-400">
                  <Globe size={16} />
                </div>
                <input
                  type="url"
                  placeholder="https://example.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="flex-1 bg-transparent py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
                  aria-label="Website URL"
                  id="hero-url-input"
                />
                <Link
                  href={url ? `/signup?url=${encodeURIComponent(url)}` : '/signup'}
                  className="inline-flex shrink-0 whitespace-nowrap items-center gap-2 rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-neutral-800 active:scale-[0.98]"
                >
                  Create Digital Twin
                  <ArrowRight size={14} />
                </Link>
              </div>

              <div className="mt-4 flex items-center justify-center gap-4 text-xs text-neutral-400">
                <Link
                  href="/dashboard?demo=true"
                  className="inline-flex items-center gap-1 transition-colors hover:text-neutral-600"
                >
                  <Compass size={12} />
                  Explore Demo
                </Link>
                <span className="text-neutral-200">·</span>
                <span>No credit card required</span>
              </div>
            </motion.div>
          </div>

          {/* Hero Graph */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="mt-16 md:mt-20"
          >
            <div className="mx-auto max-w-2xl rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm md:p-10">
              <div className="mb-4 flex items-center gap-2 text-xs text-neutral-400">
                <div className="h-2 w-2 rounded-full bg-emerald-400" />
                <span>Live Digital Twin Preview</span>
              </div>
              <HeroGraph />
            </div>
          </motion.div>
        </div>

        {/* Decorative background elements */}
        <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-b from-neutral-100/50 to-transparent blur-3xl" />
      </section>

      {/* ─── How It Works ───────────────────────────────── */}
      <section id="how-it-works" className="border-t border-neutral-100 bg-white py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            className="text-center"
          >
            <motion.p variants={fadeUp} custom={0} className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
              How it works
            </motion.p>
            <motion.h2 variants={fadeUp} custom={1} className="mt-3 text-3xl font-bold tracking-tight text-neutral-900 md:text-4xl">
              From URL to Understanding
            </motion.h2>
          </motion.div>

          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, i) => (
              <motion.div
                key={step.num}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-50px' }}
                variants={fadeUp}
                custom={i + 2}
                className="relative"
              >
                <span className="text-5xl font-bold text-neutral-100">{step.num}</span>
                <h3 className="mt-2 text-base font-semibold text-neutral-900">{step.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-neutral-500">{step.desc}</p>
                {i < steps.length - 1 && (
                  <div className="absolute right-0 top-6 hidden text-neutral-200 lg:block">
                    <ArrowRight size={16} />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features ───────────────────────────────────── */}
      <section id="features" className="py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            className="text-center"
          >
            <motion.p variants={fadeUp} custom={0} className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
              Capabilities
            </motion.p>
            <motion.h2 variants={fadeUp} custom={1} className="mt-3 text-3xl font-bold tracking-tight text-neutral-900 md:text-4xl">
              What RealityLayer Understands
            </motion.h2>
            <motion.p variants={fadeUp} custom={2} className="mt-4 text-neutral-500">
              Comprehensive analysis that goes beyond surface-level checks.
            </motion.p>
          </motion.div>

          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: '-30px' }}
                  variants={fadeUp}
                  custom={i}
                  className="card card-hover p-5"
                >
                  <div className="mb-3 inline-flex rounded-lg border border-neutral-100 bg-neutral-50 p-2.5">
                    <Icon size={18} className="text-neutral-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-neutral-900">{feature.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-neutral-500">{feature.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── Example Insights ───────────────────────────── */}
      <section className="border-t border-neutral-100 bg-white py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            className="text-center"
          >
            <motion.p variants={fadeUp} custom={0} className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
              Insights
            </motion.p>
            <motion.h2 variants={fadeUp} custom={1} className="mt-3 text-3xl font-bold tracking-tight text-neutral-900 md:text-4xl">
              What You&apos;ll Discover
            </motion.h2>
            <motion.p variants={fadeUp} custom={2} className="mt-4 text-sm text-neutral-500">
              Example findings from a typical website analysis.
            </motion.p>
          </motion.div>

          <div className="mt-14 grid gap-4 sm:grid-cols-2">
            {insights.map((insight, i) => (
              <motion.div
                key={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-30px' }}
                variants={fadeUp}
                custom={i + 3}
                className="flex items-start gap-3 rounded-xl border border-neutral-100 bg-neutral-50/50 p-5"
              >
                <div className="mt-0.5 rounded-md bg-neutral-900 p-1">
                  <Scan size={12} className="text-white" />
                </div>
                <p className="text-sm leading-relaxed text-neutral-600">{insight}</p>
              </motion.div>
            ))}
          </div>

          <p className="mt-6 text-center text-xs text-neutral-400">
            These are example insights — your actual results will be generated from a real crawl of your website.
          </p>
        </div>
      </section>

      {/* ─── Bottom CTA ─────────────────────────────────── */}
      <section className="py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            className="flex flex-col items-center rounded-2xl border border-neutral-200 bg-white px-6 py-16 text-center shadow-sm md:px-16"
          >
            <motion.h2 variants={fadeUp} custom={0} className="text-3xl font-bold tracking-tight text-neutral-900 md:text-4xl">
              Build Your Digital Twin
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="mt-4 max-w-md text-neutral-500">
              Stop guessing about your website&apos;s health. See the full picture in minutes.
            </motion.p>
            <motion.div variants={fadeUp} custom={2} className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-6 py-3 text-sm font-medium text-white transition-all hover:bg-neutral-800 active:scale-[0.98]"
              >
                Get Started Free
                <ArrowRight size={14} />
              </Link>
              <Link
                href="/dashboard?demo=true"
                className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-6 py-3 text-sm font-medium text-neutral-700 transition-all hover:bg-neutral-50 active:scale-[0.98]"
              >
                Explore Demo
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
