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

    let projects: any[] = [];
    let querySucceeded = false;

    // 1. Try local db first
    try {
      projects = await db.project.findMany({
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
      querySucceeded = true;
    } catch (dbErr) {
      console.warn('Local db project query notice:', dbErr);
    }

    // 2. If local query failed or returned empty, check Supabase
    if (!querySucceeded || projects.length === 0) {
      try {
        const { isSupabaseConfigured, supabaseAdmin } = await import('@/lib/supabase');
        if (isSupabaseConfigured()) {
          const { data: sbProjects } = await supabaseAdmin.client
            .from('Project')
            .select('*')
            .eq('userId', session.user.id)
            .order('updatedAt', { ascending: false });

          if (sbProjects && sbProjects.length > 0) {
            projects = sbProjects.map((p) => ({
              ...p,
              crawls: [],
              _count: { pages: 0, issues: 0 },
            }));
          }
        }
      } catch (sbErr) {
        console.warn('Supabase projects query notice:', sbErr);
      }
    }

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
    const projectId = `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const finalUrl = urlValidation.normalizedUrl || url;

    // 1. If Supabase is configured, use Supabase primary
    try {
      const { isSupabaseConfigured, supabaseAdmin } = await import('@/lib/supabase');
      if (isSupabaseConfigured()) {
        const { data: existingSb } = await supabaseAdmin.client
          .from('Project')
          .select('id')
          .eq('userId', session.user.id)
          .eq('domain', domain)
          .maybeSingle();

        if (existingSb) {
          return NextResponse.json(
            { error: `You already have a project for ${domain}` },
            { status: 409 }
          );
        }

        const { data: newProject, error: pError } = await supabaseAdmin.client
          .from('Project')
          .insert({
            id: projectId,
            userId: session.user.id,
            name,
            domain,
            url: finalUrl,
            crawlLimit: 100,
            status: 'IDLE',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
          .select()
          .single();

        if (pError) {
          console.error('Supabase project creation error:', pError);
          return NextResponse.json(
            { error: pError.message || 'Failed to create project' },
            { status: 500 }
          );
        }

        // Try local mirror non-blocking
        try {
          await db.project.create({
            data: {
              id: projectId,
              userId: session.user.id,
              name,
              domain,
              url: finalUrl,
            },
          });
          await db.auditLog.create({
            data: {
              userId: session.user.id,
              projectId,
              action: 'PROJECT_CREATED',
              details: JSON.stringify({ name, url: finalUrl, domain }),
            },
          });
        } catch {
          // Ignored on serverless
        }

        return NextResponse.json(
          { success: true, data: newProject || { id: projectId, name, domain, url: finalUrl } },
          { status: 201 }
        );
      }
    } catch (sbErr) {
      console.warn('Supabase create project notice:', sbErr);
    }

    // 2. Fallback to local db
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

    const project = await db.project.create({
      data: {
        userId: session.user.id,
        name,
        domain,
        url: finalUrl,
      },
    });

    try {
      await db.auditLog.create({
        data: {
          userId: session.user.id,
          projectId: project.id,
          action: 'PROJECT_CREATED',
          details: JSON.stringify({ name, url: finalUrl, domain }),
        },
      });
    } catch {}

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
