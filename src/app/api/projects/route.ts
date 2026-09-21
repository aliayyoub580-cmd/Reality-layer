import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { createProjectSchema } from '@/lib/validations';
import { validateUrl } from '@/lib/security/url-validator';
import { extractDomain } from '@/lib/utils';

// GET /api/projects - List user's projects
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projects = await db.project.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: 'desc' },
      include: {
        crawls: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            status: true,
            pagesAnalyzed: true,
            completedAt: true,
            healthScore: true,
          },
        },
        _count: {
          select: {
            pages: true,
            issues: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: projects });
  } catch (error) {
    console.error('List projects error:', error);
    return NextResponse.json(
      { error: 'Failed to load projects' },
      { status: 500 }
    );
  }
}

// POST /api/projects - Create project
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = createProjectSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, url } = validated.data;

    // SSRF validation
    const urlValidation = validateUrl(url);
    if (!urlValidation.valid) {
      return NextResponse.json(
        { error: urlValidation.error },
        { status: 400 }
      );
    }

    const domain = extractDomain(url);

    // Check for duplicate domain for this user
    const existingProject = await db.project.findFirst({
      where: {
        userId: session.user.id,
        domain,
      },
    });

    if (existingProject) {
      return NextResponse.json(
        { error: `You already have a project for ${domain}` },
        { status: 409 }
      );
    }

    // Create project
    const project = await db.project.create({
      data: {
        userId: session.user.id,
        name,
        domain,
        url: urlValidation.normalizedUrl || url,
      },
    });

    // Sync to Supabase Project table
    try {
      const { isSupabaseConfigured, supabaseAdmin } = await import('@/lib/supabase');
      if (isSupabaseConfigured()) {
        await supabaseAdmin.client.from('Project').upsert({
          id: project.id,
          userId: session.user.id,
          name: project.name,
          domain: project.domain,
          url: project.url,
          crawlLimit: project.crawlLimit,
          status: project.status,
          healthScore: project.healthScore,
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (sbErr) {
      console.warn('Supabase project sync notice:', sbErr);
    }

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        projectId: project.id,
        action: 'PROJECT_CREATED',
        details: JSON.stringify({ name, url, domain }),
      },
    });

    return NextResponse.json(
      { success: true, data: project },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create project error:', error);
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
}
