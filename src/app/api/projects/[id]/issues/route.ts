import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/projects/[id]/issues - List issues
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const url = new URL(request.url);
    const severity = url.searchParams.get('severity');
    const type = url.searchParams.get('type');
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '50');

    // Verify ownership
    const project = await db.project.findFirst({
      where: { id, userId: session.user.id },
      select: { id: true },
    });
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get latest crawl
    const crawl = await db.crawl.findFirst({
      where: { projectId: id, status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' },
    });
    if (!crawl) {
      return NextResponse.json({ success: true, data: { items: [], total: 0, summary: { critical: 0, warning: 0, info: 0 } } });
    }

    const where = {
      crawlId: crawl.id,
      ...(severity ? { severity } : {}),
      ...(type ? { type } : {}),
    };

    const [items, total, criticalCount, warningCount, infoCount, groupedTypesRaw] = await Promise.all([
      db.issue.findMany({
        where,
        orderBy: [{ severity: 'asc' }, { type: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          page: { select: { url: true, path: true, title: true } },
        },
      }),
      db.issue.count({ where }),
      db.issue.count({ where: { crawlId: crawl.id, severity: 'CRITICAL' } }),
      db.issue.count({ where: { crawlId: crawl.id, severity: 'WARNING' } }),
      db.issue.count({ where: { crawlId: crawl.id, severity: 'INFO' } }),
      db.issue.groupBy({
        by: ['type', 'severity', 'title'],
        where: { crawlId: crawl.id },
        _count: { id: true },
      }),
    ]);

    const groupedTypes = groupedTypesRaw.map((g) => ({
      type: g.type,
      severity: g.severity,
      title: g.title,
      affectedPagesCount: g._count.id,
    }));

    return NextResponse.json({
      success: true,
      data: {
        items,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
        summary: {
          critical: criticalCount,
          warning: warningCount,
          info: infoCount,
          distinctTypes: groupedTypes.length,
          groupedTypes,
        },
      },
    });
  } catch (error) {
    console.error('List issues error:', error);
    return NextResponse.json({ error: 'Failed to load issues' }, { status: 500 });
  }
}
