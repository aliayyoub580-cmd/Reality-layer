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

    // Get all completed crawls for this project
    const crawls = await db.crawl.findMany({
      where: { projectId: id, status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        pagesDiscovered: true,
        pagesAnalyzed: true,
        totalPages: true,
        healthScore: true,
        startedAt: true,
        completedAt: true,
        createdAt: true,
      },
    });

    if (crawls.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          crawls: [],
          changes: [],
        },
      });
    }

    // If there are at least two crawls, find or compute changes between the latest 2 crawls
    let changes: Array<{
      id: string;
      changeType: 'ADDED' | 'REMOVED' | 'MODIFIED';
      entityType: string;
      url: string;
      description: string;
      oldValue?: string | null;
      newValue?: string | null;
    }> = [];

    if (crawls.length >= 2) {
      const latestCrawl = crawls[0];
      const previousCrawl = crawls[1];

      // Check if changes exist in DB
      const existingChanges = await db.crawlChange.findMany({
        where: { crawlId: latestCrawl.id, previousCrawlId: previousCrawl.id },
      });

      if (existingChanges.length > 0) {
        changes = existingChanges.map((c) => ({
          id: c.id,
          changeType: c.changeType as 'ADDED' | 'REMOVED' | 'MODIFIED',
          entityType: c.entityType,
          url: c.entityUrl || '',
          description: c.description,
          oldValue: c.oldValue,
          newValue: c.newValue,
        }));
      } else {
        // Compare pages dynamically
        const [latestPages, previousPages] = await Promise.all([
          db.page.findMany({
            where: { crawlId: latestCrawl.id },
            select: { url: true, path: true, title: true, statusCode: true, healthScore: true },
          }),
          db.page.findMany({
            where: { crawlId: previousCrawl.id },
            select: { url: true, path: true, title: true, statusCode: true, healthScore: true },
          }),
        ]);

        const prevMap = new Map(previousPages.map((p) => [p.url, p]));
        const currMap = new Map(latestPages.map((p) => [p.url, p]));

        // Added pages
        for (const [url, p] of currMap.entries()) {
          if (!prevMap.has(url)) {
            changes.push({
              id: `add-${url}`,
              changeType: 'ADDED',
              entityType: 'PAGE',
              url,
              description: `New page discovered: ${p.path}`,
              newValue: p.path,
            });
          } else {
            const prev = prevMap.get(url)!;
            if (prev.statusCode !== p.statusCode) {
              changes.push({
                id: `status-${url}`,
                changeType: 'MODIFIED',
                entityType: 'STATUS',
                url,
                description: `HTTP status changed from ${prev.statusCode} to ${p.statusCode}`,
                oldValue: String(prev.statusCode),
                newValue: String(p.statusCode),
              });
            } else if (prev.title !== p.title && (prev.title || p.title)) {
              changes.push({
                id: `title-${url}`,
                changeType: 'MODIFIED',
                entityType: 'METADATA',
                url,
                description: `Title tag updated on ${p.path}`,
                oldValue: prev.title,
                newValue: p.title,
              });
            }
          }
        }

        // Removed pages
        for (const [url, prev] of prevMap.entries()) {
          if (!currMap.has(url)) {
            changes.push({
              id: `del-${url}`,
              changeType: 'REMOVED',
              entityType: 'PAGE',
              url,
              description: `Page disappeared or no longer linked: ${prev.path}`,
              oldValue: prev.path,
            });
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        crawls,
        changes,
      },
    });
  } catch (error) {
    console.error('Changes API error:', error);
    return NextResponse.json({ error: 'Failed to load crawl history and changes' }, { status: 500 });
  }
}
