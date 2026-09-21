import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { nanoid } from 'nanoid';

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

    const share = await db.shareLink.findFirst({
      where: { projectId: id, isActive: true },
    });

    return NextResponse.json({
      success: true,
      data: share ? { token: share.token, isActive: share.isActive } : null,
    });
  } catch (error) {
    console.error('Share GET error:', error);
    return NextResponse.json({ error: 'Failed to retrieve share status' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const project = await db.project.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Deactivate previous active share links
    await db.shareLink.updateMany({
      where: { projectId: id, isActive: true },
      data: { isActive: false },
    });

    // Create new token
    const token = nanoid(16);
    const newShare = await db.shareLink.create({
      data: {
        projectId: id,
        token,
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: { token: newShare.token, isActive: true },
    });
  } catch (error) {
    console.error('Share POST error:', error);
    return NextResponse.json({ error: 'Failed to generate share link' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    await db.shareLink.updateMany({
      where: { projectId: id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true, message: 'Share links disabled' });
  } catch (error) {
    console.error('Share DELETE error:', error);
    return NextResponse.json({ error: 'Failed to revoke share link' }, { status: 500 });
  }
}
