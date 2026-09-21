import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { updateProjectSchema } from '@/lib/validations';
import { findProject, findProjectWithDetails } from '@/lib/supabase';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/projects/[id] - Get project details
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const details = await findProjectWithDetails(id, session.user.id);

    if (!details) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    const data = {
      ...details.project,
      crawls: details.crawls,
      _count: details.counts,
    };

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Get project error:', error);
    return NextResponse.json(
      { error: 'Failed to load project' },
      { status: 500 }
    );
  }
}

// PATCH /api/projects/[id] - Update project
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const existing = await findProject(id, session.user.id);
    if (!existing) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validated = updateProjectSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.issues[0].message },
        { status: 400 }
      );
    }

    let updatedProject: any = { ...existing, ...validated.data };

    // Update in Supabase
    try {
      const { isSupabaseConfigured, supabaseAdmin } = await import('@/lib/supabase');
      if (isSupabaseConfigured()) {
        const { data: sbUpdated } = await supabaseAdmin.client
          .from('Project')
          .update({
            ...validated.data,
            updatedAt: new Date().toISOString(),
          })
          .eq('id', id)
          .select()
          .single();

        if (sbUpdated) {
          updatedProject = sbUpdated;
        }
      }
    } catch (sbErr) {
      console.warn('Supabase patch notice:', sbErr);
    }

    // Try local mirror non-blocking
    try {
      await db.project.update({
        where: { id },
        data: validated.data,
      });
    } catch {}

    return NextResponse.json({ success: true, data: updatedProject });
  } catch (error) {
    console.error('Update project error:', error);
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id] - Delete project
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const existing = await findProject(id, session.user.id);
    if (!existing) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Delete from Supabase
    try {
      const { isSupabaseConfigured, supabaseAdmin } = await import('@/lib/supabase');
      if (isSupabaseConfigured()) {
        await supabaseAdmin.client.from('Project').delete().eq('id', id);
      }
    } catch (sbErr) {
      console.warn('Supabase delete notice:', sbErr);
    }

    // Try local DB non-blocking
    try {
      await db.project.delete({ where: { id } });
      await db.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'PROJECT_DELETED',
          details: JSON.stringify({ name: existing.name, domain: existing.domain }),
        },
      });
    } catch {}

    return NextResponse.json({ success: true, message: 'Project deleted' });
  } catch (error) {
    console.error('Delete project error:', error);
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    );
  }
}
