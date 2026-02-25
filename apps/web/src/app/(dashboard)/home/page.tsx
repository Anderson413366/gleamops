'use client';

import { Skeleton } from '@gleamops/ui';
import { useRole } from '@/hooks/use-role';

import CommandCenter from './command-center';
import DashboardHome from './dashboard-home';
import SupervisorRouteView from '../schedule/supervisor/supervisor-route-view';

function HomeLoadingState() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-56" />
      <Skeleton className="h-6 w-96" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <Skeleton key={idx} className="h-28 w-full rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}

export default function HomePage() {
  const { loading, isAtLeast, role } = useRole();

  if (loading) {
    return <HomeLoadingState />;
  }

  if (isAtLeast('MANAGER')) {
    return <CommandCenter />;
  }

  if (role === 'SUPERVISOR') {
    return <SupervisorRouteView />;
  }

  return <DashboardHome />;
}
