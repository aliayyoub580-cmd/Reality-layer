import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const domain = `demo-${Date.now().toString().slice(-4)}.acme.io`;
    const baseUrl = `https://${domain}`;

    // Create Demo Project
    const project = await db.project.create({
      data: {
        userId,
        name: 'Acme Cloud Platform (Demo)',
        domain,
        url: baseUrl,
        crawlLimit: 100,
        status: 'COMPLETED',
        healthScore: 84,
      },
    });

    // Create completed Crawl
    const crawl = await db.crawl.create({
      data: {
        projectId: project.id,
        status: 'COMPLETED',
        pagesDiscovered: 14,
        pagesAnalyzed: 14,
        totalPages: 14,
        healthScore: 84,
        startedAt: new Date(Date.now() - 1000 * 60 * 2),
        completedAt: new Date(),
      },
    });

    // Seed Pages
    const rawPages = [
      { path: '/', title: 'Acme Cloud — Intelligent Infrastructure', depth: 0, status: 200, score: 92, time: 240, size: 45000, wc: 650, images: 4 },
      { path: '/features', title: 'Platform Features & Capabilities | Acme', depth: 1, status: 200, score: 88, time: 310, size: 52000, wc: 820, images: 6 },
      { path: '/pricing', title: 'Transparent Usage Pricing | Acme', depth: 1, status: 200, score: 95, time: 190, size: 38000, wc: 420, images: 2 },
      { path: '/docs', title: 'Documentation & Architecture Guides | Acme', depth: 1, status: 200, score: 90, time: 280, size: 68000, wc: 1400, images: 3 },
      { path: '/docs/quickstart', title: 'Quickstart Guide | Acme Docs', depth: 2, status: 200, score: 91, time: 220, size: 42000, wc: 900, images: 2 },
      { path: '/docs/api-reference', title: 'REST & GraphQL API Reference | Acme Docs', depth: 2, status: 200, score: 84, time: 480, size: 110000, wc: 2200, images: 1 },
      { path: '/docs/api/webhooks', title: 'Real-time Webhooks & Events', depth: 3, status: 200, score: 80, time: 340, size: 54000, wc: 780, images: 1 },
      { path: '/blog', title: 'Engineering & Product Insights | Acme Blog', depth: 1, status: 200, score: 78, time: 520, size: 85000, wc: 1100, images: 8 },
      { path: '/blog/zero-trust-scaling', title: 'Scaling to 10M Requests with Zero Trust', depth: 2, status: 200, score: 82, time: 390, size: 64000, wc: 1600, images: 4 },
      { path: '/about', title: 'About Our Team & Mission | Acme', depth: 1, status: 200, score: 85, time: 210, size: 34000, wc: 500, images: 3 },
      { path: '/security', title: 'Enterprise Security & Compliance (SOC2)', depth: 2, status: 200, score: 89, time: 260, size: 48000, wc: 850, images: 2 },
      { path: '/privacy', title: 'Privacy Policy', depth: 2, status: 200, score: 72, time: 180, size: 28000, wc: 1900, images: 0 },
      { path: '/legacy-v1-sdk', title: 'Deprecated V1 SDK Guide', depth: 3, status: 404, score: 40, time: 120, size: 8000, wc: 120, images: 0 },
      { path: '/hidden-campaign-landing', title: 'Exclusive Special Offer', depth: 2, status: 200, score: 65, time: 310, size: 32000, wc: 340, images: 2 },
    ];

    const createdPages: Record<string, string> = {};

    for (const p of rawPages) {
      const pageRecord = await db.page.create({
        data: {
          projectId: project.id,
          crawlId: crawl.id,
          url: `${baseUrl}${p.path}`,
          path: p.path,
          title: p.title,
          statusCode: p.status,
          healthScore: p.score,
          depth: p.depth,
          loadTime: p.time,
          responseSize: p.size,
          wordCount: p.wc,
          imageCount: p.images,
          isHttps: true,
          hasViewport: true,
          metaDescription: `Discover the high-reliability infrastructure features at ${p.path}`,
          h1: p.title.split('|')[0].trim(),
        },
      });
      createdPages[p.path] = pageRecord.id;
    }

    // Seed Internal Links
    const linkPairs = [
      ['/', '/features'],
      ['/', '/pricing'],
      ['/', '/docs'],
      ['/', '/blog'],
      ['/', '/about'],
      ['/features', '/pricing'],
      ['/features', '/docs'],
      ['/docs', '/docs/quickstart'],
      ['/docs', '/docs/api-reference'],
      ['/docs/api-reference', '/docs/api/webhooks'],
      ['/docs/api-reference', '/legacy-v1-sdk'], // broken link target!
      ['/blog', '/blog/zero-trust-scaling'],
      ['/blog/zero-trust-scaling', '/docs'],
      ['/about', '/security'],
      ['/about', '/privacy'],
    ];

    for (const [src, tgt] of linkPairs) {
      if (createdPages[src] && createdPages[tgt]) {
        await db.link.create({
          data: {
            projectId: project.id,
            crawlId: crawl.id,
            sourcePageId: createdPages[src],
            targetPageId: createdPages[tgt],
            sourceUrl: `${baseUrl}${src}`,
            targetUrl: `${baseUrl}${tgt}`,
            anchorText: tgt.replace('/', '').replace(/-/g, ' '),
            isInternal: true,
            isFollowed: true,
          },
        });
      }
    }

    // Seed Issues
    const issuesData = [
      {
        type: 'BROKEN_LINK',
        severity: 'CRITICAL',
        title: 'Broken internal hyperlink (HTTP 404)',
        description: 'Link pointing to /legacy-v1-sdk returns HTTP 404 Not Found.',
        impact: 'HIGH',
        pageId: createdPages['/docs/api-reference'],
        recommendation: 'Update href to point to the current active SDK documentation or set up a 301 redirect.',
      },
      {
        type: 'ORPHAN_PAGE',
        severity: 'WARNING',
        title: 'Orphan page with zero inbound internal links',
        description: 'Page /hidden-campaign-landing has no incoming links from any crawlable page on the site.',
        impact: 'MEDIUM',
        pageId: createdPages['/hidden-campaign-landing'],
        recommendation: 'Link this page from a relevant category hub or add it to your sitemap.',
      },
      {
        type: 'MISSING_CANONICAL',
        severity: 'WARNING',
        title: 'Missing canonical tag on legal document',
        description: 'Page /privacy does not declare a rel="canonical" link in the head element.',
        impact: 'MEDIUM',
        pageId: createdPages['/privacy'],
        recommendation: 'Add <link rel="canonical" href="https://demo.acme.io/privacy" /> to prevent duplicate content flags.',
      },
      {
        type: 'DEEP_CLICK_DEPTH',
        severity: 'INFO',
        title: 'High crawl depth detected',
        description: 'Page /docs/api/webhooks is located 3 clicks away from the entry domain node.',
        impact: 'LOW',
        pageId: createdPages['/docs/api/webhooks'],
        recommendation: 'Consider adding a direct shortcut link from the primary Documentation sidebar.',
      },
    ];

    for (const iss of issuesData) {
      await db.issue.create({
        data: {
          projectId: project.id,
          crawlId: crawl.id,
          pageId: iss.pageId,
          type: iss.type,
          severity: iss.severity,
          title: iss.title,
          description: iss.description,
          impact: iss.impact,
          recommendation: iss.recommendation,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: { projectId: project.id },
    });
  } catch (error) {
    console.error('Demo seed error:', error);
    return NextResponse.json({ error: 'Failed to seed demo digital twin' }, { status: 500 });
  }
}
