import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { findProject, getLatestCrawl, findIssuesForCrawl } from '@/lib/supabase';

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
    const severity = url.searchParams.get('severity') || undefined;
    const type = url.searchParams.get('type') || undefined;
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '50');

    // Verify ownership
    const project = await findProject(id, session.user.id);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get latest crawl
    const crawl = await getLatestCrawl(id, 'COMPLETED');
    if (!crawl) {
      return NextResponse.json({
        success: true,
        data: {
          items: [],
          total: 0,
          page: 1,
          pageSize,
          totalPages: 0,
          summary: { critical: 0, warning: 0, info: 0, distinctTypes: 0, groupedTypes: [] },
        },
      });
    }

    const result = await findIssuesForCrawl(crawl.id, {
      severity,
      type,
      page,
      pageSize,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('List issues error:', error);
    return NextResponse.json({ error: 'Failed to load issues' }, { status: 500 });
  }
}
