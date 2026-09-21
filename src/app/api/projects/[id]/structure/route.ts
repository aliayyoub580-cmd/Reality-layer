import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const project = await db.project.findFirst({
      where: { id, userId: session.user.id },
      select: { id: true },
    });
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const crawl = await db.crawl.findFirst({
      where: { projectId: id, status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' },
    });
    if (!crawl) {
      return NextResponse.json({
        success: true,
        data: {
          totalPages: 0,
          totalLinks: 0,
          orphanPages: [],
          depthDistribution: {},
          topHubPages: [],
          deepPages: [],
          connectivityScore: 0,
        },
      });
    }

    const [pages, links] = await Promise.all([
      db.page.findMany({
        where: { crawlId: crawl.id },
        select: {
          id: true,
          url: true,
          path: true,
          title: true,
          depth: true,
          healthScore: true,
          statusCode: true,
          isIndexable: true,
          _count: {
            select: {
              inboundLinks: true,
              outboundLinks: true,
            },
          },
        },
      }),
      db.link.findMany({
        where: { crawlId: crawl.id, isInternal: true },
        select: { sourcePageId: true, targetPageId: true },
      }),
    ]);

    const totalPages = pages.length;
    const totalLinks = links.length;

    const isLimited =
      crawl.pagesDiscovered > crawl.pagesAnalyzed ||
      Boolean(crawl.errorMessage?.includes('Limited crawl'));

    // Distinguish confirmed orphans vs potential/unverified orphans in a limited crawl
    const unlinkedPages = pages
      .filter((p) => p.path !== '/' && p._count.inboundLinks === 0 && p.statusCode === 200 && p.isIndexable)
      .map((p) => ({
        id: p.id,
        path: p.path,
        title: p.title,
        url: p.url,
        healthScore: p.healthScore,
      }));

    const confirmedOrphans = isLimited ? [] : unlinkedPages;
    const potentialOrphans = isLimited ? unlinkedPages : [];

    // Depth distribution
    const depthDistribution: Record<number, number> = {};
    pages.forEach((p) => {
      const d = p.depth ?? (p.path === '/' ? 0 : 1);
      depthDistribution[d] = (depthDistribution[d] || 0) + 1;
    });

    // Deep pages (> 3 clicks)
    const deepPages = pages
      .filter((p) => (p.depth ?? 0) >= 3)
      .map((p) => ({
        id: p.id,
        path: p.path,
        title: p.title,
        depth: p.depth,
      }));

    // Hub pages (highest outbound links)
    const topHubPages = [...pages]
      .sort((a, b) => b._count.outboundLinks - a._count.outboundLinks)
      .slice(0, 10)
      .map((p) => ({
        id: p.id,
        path: p.path,
        title: p.title,
        outboundCount: p._count.outboundLinks,
        inboundCount: p._count.inboundLinks,
      }));

    // Inbound popular pages
    const topAuthorityPages = [...pages]
      .sort((a, b) => b._count.inboundLinks - a._count.inboundLinks)
      .slice(0, 10)
      .map((p) => ({
        id: p.id,
        path: p.path,
        title: p.title,
        inboundCount: p._count.inboundLinks,
        outboundCount: p._count.outboundLinks,
      }));

    // Internal connectivity score (0 - 100)
    const orphanRatio = totalPages > 0 ? confirmedOrphans.length / totalPages : 0;
    const avgLinks = totalPages > 0 ? totalLinks / totalPages : 0;
    const linkDensityFactor = Math.min(avgLinks / 5, 1);
    const orphanPenalty = orphanRatio * 40;
    const connectivityScore = Math.max(
      15,
      Math.min(100, Math.round(linkDensityFactor * 60 + 40 - orphanPenalty))
    );

    return NextResponse.json({
      success: true,
      data: {
        totalPages,
        totalLinks,
        orphanPages: confirmedOrphans,
        potentialOrphans,
        isLimited,
        depthDistribution,
        deepPages,
        topHubPages,
        topAuthorityPages,
        connectivityScore,
      },
    });
  } catch (error) {
    console.error('Structure API error:', error);
    return NextResponse.json({ error: 'Failed to calculate structure analytics' }, { status: 500 });
  }
}
