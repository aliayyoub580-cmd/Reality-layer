import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { startCrawl } from '@/lib/crawler/engine';
import { findProject } from '@/lib/supabase';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/projects/[id]/crawl - Start a new crawl
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const project = await findProject(id, session.user.id);

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Check if already crawling
    if (project.status === 'CRAWLING') {
      return NextResponse.json(
        { error: 'A crawl is already in progress' },
        { status: 409 }
      );
    }

    // Start crawl
    const crawlId = await startCrawl(id, {
      maxPages: project.crawlLimit,
    });

    // Audit log (non-blocking)
    try {
      await db.auditLog.create({
        data: {
          userId: session.user.id,
          projectId: id,
          action: 'CRAWL_STARTED',
          details: JSON.stringify({ crawlId }),
        },
      });
    } catch {}

    return NextResponse.json({
      success: true,
      data: { crawlId },
      message: 'Crawl started',
    });
  } catch (error) {
    console.error('Start crawl error:', error);
    return NextResponse.json(
      { error: 'Failed to start crawl' },
      { status: 500 }
    );
  }
}

// GET /api/projects/[id]/crawl - Get crawl status/progress
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const project = await findProject(id, session.user.id);

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get latest crawl
    let crawl: any = null;
    try {
      crawl = await db.crawl.findFirst({
        where: { projectId: id },
        orderBy: { createdAt: 'desc' },
      });
    } catch {}

    if (!crawl) {
      try {
        const { isSupabaseConfigured, supabaseAdmin } = await import('@/lib/supabase');
        if (isSupabaseConfigured()) {
          const { data } = await supabaseAdmin.client
            .from('Crawl')
            .select('*')
            .eq('projectId', id)
            .order('createdAt', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (data) crawl = data;
        }
      } catch {}
    }

    if (!crawl) {
      return NextResponse.json({
        success: true,
        data: null,
        message: 'No crawls found',
      });
    }

    const progress =
      crawl.totalPages > 0
        ? Math.round((crawl.pagesAnalyzed / crawl.totalPages) * 100)
        : 0;

    return NextResponse.json({
      success: true,
      data: {
        id: crawl.id,
        status: crawl.status,
        pagesDiscovered: crawl.pagesDiscovered,
        pagesAnalyzed: crawl.pagesAnalyzed,
        totalPages: crawl.totalPages,
        progress,
        healthScore: crawl.healthScore,
        startedAt: crawl.startedAt,
        completedAt: crawl.completedAt,
        errorMessage: crawl.errorMessage,
      },
    });
  } catch (error) {
    console.error('Get crawl status error:', error);
    return NextResponse.json(
      { error: 'Failed to get crawl status' },
      { status: 500 }
    );
  }
}
