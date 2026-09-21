import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { buildGraphData, calculateHierarchicalLayout } from '@/lib/graph/builder';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/projects/[id]/twin - Get graph data for digital twin
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const project = await db.project.findFirst({
      where: { id, userId: session.user.id },
      select: { id: true },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get latest completed crawl
    const crawl = await db.crawl.findFirst({
      where: { projectId: id, status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' },
    });

    if (!crawl) {
      return NextResponse.json({
        success: true,
        data: { nodes: [], edges: [], positions: [] },
        message: 'No completed crawl found',
      });
    }

    // Get pages with links and issues
    const pages = await db.page.findMany({
      where: { crawlId: crawl.id },
      include: {
        inboundLinks: { select: { id: true } },
        outboundLinks: { select: { id: true } },
        issues: { select: { id: true, severity: true } },
      },
    });

    const links = await db.link.findMany({
      where: { crawlId: crawl.id, isInternal: true },
      select: {
        id: true,
        sourcePageId: true,
        targetPageId: true,
        isInternal: true,
      },
    });

    // Determine if crawl was a limited sample
    const isLimited =
      crawl.pagesDiscovered > crawl.pagesAnalyzed ||
      Boolean(crawl.errorMessage?.includes('Limited crawl'));

    // Build graph data
    const graphData = buildGraphData(pages, links, { isLimited });
    const positions = calculateHierarchicalLayout(graphData);

    return NextResponse.json({
      success: true,
      data: {
        ...graphData,
        positions,
        isLimited,
      },
    });
  } catch (error) {
    console.error('Get twin data error:', error);
    return NextResponse.json(
      { error: 'Failed to load digital twin data' },
      { status: 500 }
    );
  }
}
