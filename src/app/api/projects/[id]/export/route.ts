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
      include: {
        crawls: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            pages: true,
            issues: true,
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Return export payload
    const exportData = {
      realityLayerVersion: '1.0.0',
      exportedAt: new Date().toISOString(),
      project: {
        id: project.id,
        name: project.name,
        domain: project.domain,
        url: project.url,
        healthScore: project.healthScore,
        createdAt: project.createdAt,
      },
      latestCrawl: project.crawls[0] || null,
    };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${project.domain}-digital-twin-report.json"`,
      },
    });
  } catch (error) {
    console.error('Export API error:', error);
    return NextResponse.json({ error: 'Failed to generate export report' }, { status: 500 });
  }
}
