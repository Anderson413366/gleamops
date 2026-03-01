'use client';

import { Skeleton } from '@gleamops/ui';
import { normalizeRoleCode } from '@gleamops/shared';
import { useRole } from '@/hooks/use-role';

import CommandCenter from './command-center';
import DashboardHome from './dashboard-home';
import OwnerOverview from './owner-overview';
import StaffHome from './staff-home';
import SupervisorRouteView from '../schedule/supervisor/supervisor-route-view';
import { MessageWall, DashboardWidgets } from './message-wall';

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
  const normalizedRole = normalizeRoleCode(role);

  if (loading) {
    return <HomeLoadingState />;
  }

  if (normalizedRole === 'OWNER_ADMIN') {
    return <OwnerOverview />;
  }

  if (normalizedRole === 'MANAGER' || isAtLeast('MANAGER')) {
    return <CommandCenter />;
  }

  if (normalizedRole === 'SUPERVISOR') {
    return <SupervisorRouteView />;
  }

  if (normalizedRole === 'CLEANER' || normalizedRole === 'INSPECTOR') {
    return <StaffHome />;
  }

  return (
    <div className="flex gap-6">
      <div className="flex-1 min-w-0">
        <DashboardHome />
      </div>
      <div className="hidden xl:block w-80 shrink-0 space-y-6">
        <DashboardWidgets />
        <MessageWall />
      </div>
    </div>
  );
}
