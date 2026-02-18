import { AppShell } from '@/components/layout/app-shell';
import { NeuroPreferencesProvider } from '@/contexts/neuro-preferences-context';

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
