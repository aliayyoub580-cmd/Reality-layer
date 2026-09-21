import { auth } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { AiAssistantDrawer } from '@/components/twin/ai-assistant-drawer';
import { findProject } from '@/lib/supabase';

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

  const project = await findProject(projectId, session.user.id);

  if (!project) notFound();

  return (
    <DashboardShell projectId={project.id} projectName={project.name}>
      {children}
      <AiAssistantDrawer projectId={project.id} />
    </DashboardShell>
  );
}
