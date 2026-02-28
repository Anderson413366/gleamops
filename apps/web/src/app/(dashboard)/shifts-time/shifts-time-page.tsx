'use client';

import { useEffect, useState } from 'react';
import { SearchInput } from '@gleamops/ui';
import { normalizeRoleCode } from '@gleamops/shared';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { useLocale } from '@/hooks/use-locale';
import ShiftsTimePanel from '../jobs/shifts-time-panel';

const SHIFTS_TIME_ALLOWED_ROLES = new Set([
  'OWNER_ADMIN',
  'MANAGER',
  'SUPERVISOR',
  'CLEANER',
  'INSPECTOR',
]);

export default function ShiftsTimePageClient() {
  const router = useRouter();
  const { role, loading: authLoading } = useAuth();
  const shiftsTimeV1Enabled = useFeatureFlag('shifts_time_v1');
  const shiftsTimeRouteExecutionEnabled = useFeatureFlag('shifts_time_route_execution');
  const { t } = useLocale();
  const [search, setSearch] = useState('');

  const roleCode = normalizeRoleCode(role ?? '') ?? (role ?? '').toUpperCase();
  const isPilotManager = roleCode === 'OWNER_ADMIN' || roleCode === 'MANAGER';
  const canAccessShiftsTime = (
    SHIFTS_TIME_ALLOWED_ROLES.has(roleCode)
      && (isPilotManager || shiftsTimeV1Enabled || shiftsTimeRouteExecutionEnabled)
  );

  useEffect(() => {
    if (authLoading) return;
    if (!canAccessShiftsTime) {
      router.replace('/jobs?tab=service-plans');
    }
  }, [authLoading, canAccessShiftsTime, router]);

  if (authLoading || !canAccessShiftsTime) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('shiftsTime.tab')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('shiftsTime.tab')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('shiftsTime.subtitle')}</p>
      </div>

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder={t('shiftsTime.searchPlaceholder')}
        className="w-full sm:w-72 lg:w-80"
      />

      <ShiftsTimePanel search={search} />
    </div>
  );
}
