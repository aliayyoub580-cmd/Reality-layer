import { DashboardShell } from '@/components/layout/dashboard-shell';

export const metadata = {
  title: 'News Feed — RealityLayer',
  description: 'Live spaceflight, tech, and digital twin industry news feed.',
};

export default function NewsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell>{children}</DashboardShell>;
}
