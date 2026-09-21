import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { findProject, getLatestCrawl, findPagesForCrawl } from '@/lib/supabase';

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
    const order = (url.searchParams.get('order') || 'asc') as 'asc' | 'desc';
    const search = url.searchParams.get('search') || '';

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
        data: { items: [], total: 0, page: 1, pageSize, totalPages: 0 },
      });
    }

    const result = await findPagesForCrawl(crawl.id, {
      page,
      pageSize,
      sort,
      order,
      search,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('List pages error:', error);
    return NextResponse.json({ error: 'Failed to load pages' }, { status: 500 });
  }
}
