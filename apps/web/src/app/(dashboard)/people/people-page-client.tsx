'use client';

import { useState, useCallback, useEffect } from 'react';
import { Users, CalendarClock, Clock, AlertTriangle, FileText, DollarSign, Plus } from 'lucide-react';
import { ChipTabs, SearchInput, Button, Card, CardContent, EmptyState } from '@gleamops/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useSyncedTab } from '@/hooks/use-synced-tab';

import StaffTable from '../workforce/staff/staff-table';
import TimeEntriesTable from '../workforce/timekeeping/time-entries-table';
import ExceptionsTable from '../workforce/exceptions/exceptions-table';
import TimesheetsTable from '../workforce/timesheets/timesheets-table';
import PayrollTable from '../workforce/payroll/payroll-table';

const TABS = [
  { key: 'staff', label: 'Staff', icon: <Users className="h-4 w-4" /> },
  { key: 'availability', label: 'Availability', icon: <CalendarClock className="h-4 w-4" /> },
  { key: 'time', label: 'Time', icon: <Clock className="h-4 w-4" /> },
  { key: 'exceptions', label: 'Exceptions', icon: <AlertTriangle className="h-4 w-4" /> },
  { key: 'timesheets', label: 'Timesheets', icon: <FileText className="h-4 w-4" /> },
  { key: 'payroll-export', label: 'Payroll Export', icon: <DollarSign className="h-4 w-4" /> },
];

export default function PeoplePageClient() {
  const [tab, setTab] = useSyncedTab({
    tabKeys: TABS.map((t) => t.key),
    defaultTab: 'staff',
    aliases: { payroll: 'payroll-export', timekeeping: 'time' },
  });
  const [search, setSearch] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [autoCreateStaff, setAutoCreateStaff] = useState(false);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const [kpis, setKpis] = useState({
    activeStaff: 0,
    supervisors: 0,
    openExceptions: 0,
    onLeave: 0,
  });

  useEffect(() => {
    async function fetchKpis() {
      const supabase = getSupabaseBrowserClient();
      const [activeRes, supervisorsRes, exceptionsRes, leaveRes] = await Promise.all([
        supabase.from('staff').select('id', { count: 'exact', head: true }).is('archived_at', null).eq('staff_status', 'ACTIVE'),
        supabase.from('staff').select('id', { count: 'exact', head: true }).is('archived_at', null).in('role', ['SUPERVISOR', 'MANAGER']),
        supabase.from('alerts').select('id', { count: 'exact', head: true }).eq('alert_type', 'TIME_EXCEPTION').is('dismissed_at', null),
        supabase.from('staff').select('id', { count: 'exact', head: true }).is('archived_at', null).eq('staff_status', 'ON_LEAVE'),
      ]);

      setKpis({
        activeStaff: activeRes.count ?? 0,
        supervisors: supervisorsRes.count ?? 0,
        openExceptions: exceptionsRes.count ?? 0,
        onLeave: leaveRes.count ?? 0,
      });
    }
    fetchKpis();
  }, [refreshKey]);

  const handleAdd = () => {
    if (tab === 'staff') {
      setAutoCreateStaff(true);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">People</h1>
          <p className="text-sm text-muted-foreground mt-1">Staff, Availability, Time, Exceptions, Timesheets, Payroll Export</p>
        </div>
        {tab === 'staff' && (
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4" />
            New Staff
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Active Staff</p><p className="text-xl font-semibold">{kpis.activeStaff}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Supervisors</p><p className="text-xl font-semibold">{kpis.supervisors}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Open Exceptions</p><p className="text-xl font-semibold text-warning">{kpis.openExceptions}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">On Leave</p><p className="text-xl font-semibold">{kpis.onLeave}</p></CardContent></Card>
      </div>

      <ChipTabs tabs={TABS} active={tab} onChange={setTab} />
      <SearchInput value={search} onChange={setSearch} placeholder={`Search ${tab}...`} />

      {tab === 'staff' && (
        <StaffTable
          key={`staff-${refreshKey}`}
          search={search}
          autoCreate={autoCreateStaff}
          onAutoCreateHandled={() => setAutoCreateStaff(false)}
        />
      )}

      {tab === 'availability' && (
        <EmptyState
          icon={<CalendarClock className="h-10 w-10" />}
          title="Staff Availability"
          description="Manage staff availability windows and time-off requests."
          bullets={[
            'View and edit recurring availability patterns',
            'Review pending time-off requests',
            'Track PTO balances and accruals',
          ]}
        />
      )}

      {tab === 'time' && <TimeEntriesTable key={`te-${refreshKey}`} search={search} onRefresh={refresh} />}
      {tab === 'exceptions' && <ExceptionsTable key={`e-${refreshKey}`} search={search} />}
      {tab === 'timesheets' && <TimesheetsTable key={`ts-${refreshKey}`} search={search} />}
      {tab === 'payroll-export' && <PayrollTable key={`p-${refreshKey}`} search={search} />}
    </div>
  );
}
