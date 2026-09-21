import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'RealityLayer — See Your Website as a Living System',
    template: '%s | RealityLayer',
  },
  description:
    'RealityLayer turns any website into an interactive digital twin — revealing its structure, health, performance, SEO, and user-flow bottlenecks.',
  keywords: [
    'website analysis',
    'digital twin',
    'SEO audit',
    'website health',
    'site structure',
    'website crawler',
    'internal linking',
    'website performance',
  ],
  authors: [{ name: 'RealityLayer' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://realitylayer.com',
    siteName: 'RealityLayer',
    title: 'RealityLayer — See Your Website as a Living System',
    description:
      'Transform any website into an interactive digital twin. Explore structure, diagnose problems, and improve your site.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RealityLayer — See Your Website as a Living System',
    description:
      'Transform any website into an interactive digital twin.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable} data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className="min-h-screen bg-[var(--bg-primary)] antialiased">
        {children}
      </body>
    </html>
  );
}
