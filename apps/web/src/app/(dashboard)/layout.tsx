import { AppShell } from '@/components/layout/app-shell';
import { NeuroPreferencesProvider } from '@/contexts/neuro-preferences-context';

export const dynamic = 'force-dynamic';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <NeuroPreferencesProvider>
      <AppShell>{children}</AppShell>
    </NeuroPreferencesProvider>
  );
}
