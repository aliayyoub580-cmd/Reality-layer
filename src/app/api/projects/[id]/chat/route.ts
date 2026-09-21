import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { askRealityLayer } from '@/lib/ai/advisor';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { message } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message prompt required' }, { status: 400 });
    }

    const project = await db.project.findFirst({
      where: { id, userId: session.user.id },
      include: {
        crawls: {
          where: { status: 'COMPLETED' },
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            issues: { take: 10 },
            pages: {
              select: {
                depth: true,
                loadTime: true,
                inboundLinks: true,
                path: true,
                statusCode: true,
                isIndexable: true,
              },
            },
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const latestCrawl = project.crawls[0];
    const pages = latestCrawl?.pages || [];
    const issues = latestCrawl?.issues || [];

    const criticalIssues = issues.filter((i) => i.severity === 'CRITICAL').length;
    const warningIssues = issues.filter((i) => i.severity === 'WARNING').length;
    const isLimited = Boolean(
      latestCrawl &&
        (latestCrawl.pagesDiscovered > latestCrawl.pagesAnalyzed ||
          latestCrawl.errorMessage?.includes('Limited crawl'))
    );
    const unlinkedCount = pages.filter(
      (p) => p.path !== '/' && p.inboundLinks?.length === 0 && p.statusCode === 200 && p.isIndexable
    ).length;
    const orphanCount = isLimited ? 0 : unlinkedCount;
    const deepPagesCount = pages.filter((p) => (p.depth ?? 0) >= 3).length;

    const pagesWithSpeed = pages.filter((p) => p.loadTime !== null && (p.loadTime || 0) > 0);
    const avgResponseTimeMs = pagesWithSpeed.length
      ? Math.round(pagesWithSpeed.reduce((acc, p) => acc + (p.loadTime || 0), 0) / pagesWithSpeed.length)
      : 320;

    const response = await askRealityLayer(message, {
      domain: project.domain,
      healthScore: project.healthScore,
      totalPages: pages.length,
      criticalIssues,
      warningIssues,
      topIssues: issues.map((i) => ({
        title: i.title,
        severity: i.severity,
        description: i.description,
        recommendation: i.recommendation,
      })),
      orphanCount,
      deepPagesCount,
      avgResponseTimeMs,
    });

    return NextResponse.json({ success: true, data: { reply: response } });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json({ error: 'Failed to process AI query' }, { status: 500 });
  }
}
