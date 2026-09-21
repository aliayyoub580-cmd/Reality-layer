import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/projects/[id]/pages - List pages
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '20');
    const sort = url.searchParams.get('sort') || 'path';
    const order = url.searchParams.get('order') || 'asc';
    const search = url.searchParams.get('search') || '';

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
      return NextResponse.json({ success: true, data: { items: [], total: 0, page: 1, pageSize, totalPages: 0 } });
    }

    const where = {
      crawlId: crawl.id,
      ...(search ? {
        OR: [
          { url: { contains: search } },
          { title: { contains: search } },
          { path: { contains: search } },
        ],
      } : {}),
    };

    const [items, total] = await Promise.all([
      db.page.findMany({
        where,
        orderBy: { [sort]: order },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          _count: { select: { issues: true, inboundLinks: true, outboundLinks: true } },
        },
      }),
      db.page.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        items: items.map((p) => ({
          ...p,
          issueCount: p._count.issues,
          inboundCount: p._count.inboundLinks,
          outboundCount: p._count.outboundLinks,
        })),
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('List pages error:', error);
    return NextResponse.json({ error: 'Failed to load pages' }, { status: 500 });
  }
}
