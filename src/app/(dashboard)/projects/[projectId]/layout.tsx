import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { redirect, notFound } from 'next/navigation';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { AiAssistantDrawer } from '@/components/twin/ai-assistant-drawer';

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const { projectId } = await params;

  const project = await db.project.findFirst({
    where: {
      id: projectId,
      userId: session.user.id,
    },
    select: { id: true, name: true, domain: true },
  });

  if (!project) notFound();

  return (
    <DashboardShell projectId={project.id} projectName={project.name}>
      {children}
      <AiAssistantDrawer projectId={project.id} />
    </DashboardShell>
  );
}
