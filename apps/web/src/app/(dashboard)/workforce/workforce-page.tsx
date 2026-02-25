'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { Users, Clock, FileText, AlertTriangle, BriefcaseBusiness, DollarSign, Plus, MessageSquare, UserRoundCheck } from 'lucide-react';
import { ChipTabs, SearchInput, Button, Card, CardContent } from '@gleamops/ui';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useSyncedTab } from '@/hooks/use-synced-tab';

import StaffTable from './staff/staff-table';
import TimeEntriesTable from './timekeeping/time-entries-table';
import TimesheetsTable from './timesheets/timesheets-table';
import ExceptionsTable from './exceptions/exceptions-table';
import PositionsTable from './positions/positions-table';
import PayrollTable from './payroll/payroll-table';
import MessagesTab from './messages/messages-tab';
import HrLitePanel from './hr/hr-lite-panel';

const BASE_TABS = [
  { key: 'staff', label: 'Staff', icon: <Users className="h-4 w-4" /> },
  { key: 'positions', label: 'Positions', icon: <BriefcaseBusiness className="h-4 w-4" /> },
  { key: 'timekeeping', label: 'Timekeeping', icon: <Clock className="h-4 w-4" /> },
  { key: 'timesheets', label: 'Timesheets', icon: <FileText className="h-4 w-4" /> },
  { key: 'exceptions', label: 'Exceptions', icon: <AlertTriangle className="h-4 w-4" /> },
  { key: 'payroll', label: 'Payroll', icon: <DollarSign className="h-4 w-4" /> },
  { key: 'hr-lite', label: 'HR Lite', icon: <UserRoundCheck className="h-4 w-4" /> },
];

export default function WorkforcePageClient() {
  const messagingEnabled = useFeatureFlag('messaging_v1');

  const TABS = useMemo(() => {
    const tabs = [...BASE_TABS];
    if (messagingEnabled) {
      tabs.push({ key: 'messages', label: 'Messages', icon: <MessageSquare className="h-4 w-4" /> });
    }
    return tabs;
  }, [messagingEnabled]);

  const [tab, setTab] = useSyncedTab({
    tabKeys: TABS.map((entry) => entry.key),
    defaultTab: 'staff',
  });
  const [search, setSearch] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [autoCreateStaff, setAutoCreateStaff] = useState(false);
  const [kpis, setKpis] = useState({
    activeStaff: 0,
    supervisors: 0,
    openExceptions: 0,
    onLeave: 0,
  });
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

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
          <h1 className="text-2xl font-bold text-foreground">Workforce</h1>
          <p className="text-sm text-muted-foreground mt-1">Staff, Positions, Timekeeping, Timesheets, Exceptions, Payroll{messagingEnabled ? ', Messages' : ''}</p>
        </div>
        {tab === 'staff' && (
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4" />
            New Staff
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Active Staff</p><p className="text-lg font-semibold sm:text-xl leading-tight">{kpis.activeStaff}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Supervisors</p><p className="text-lg font-semibold sm:text-xl leading-tight">{kpis.supervisors}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Open Exceptions</p><p className="text-lg font-semibold sm:text-xl leading-tight text-warning">{kpis.openExceptions}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">On Leave</p><p className="text-lg font-semibold sm:text-xl leading-tight">{kpis.onLeave}</p></CardContent></Card>
      </div>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 lg:flex-1">
          <ChipTabs tabs={TABS} active={tab} onChange={setTab} />
        </div>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={`Search ${tab}...`}
          className="w-full sm:w-72 lg:w-80 lg:ml-auto"
        />
      </div>

      {tab === 'staff' && (
        <StaffTable
          key={`staff-${refreshKey}`}
          search={search}
          autoCreate={autoCreateStaff}
          onAutoCreateHandled={() => setAutoCreateStaff(false)}
          showCreateButton={false}
        />
      )}
      {tab === 'positions' && <PositionsTable key={`pos-${refreshKey}`} search={search} />}
      {tab === 'timekeeping' && <TimeEntriesTable key={`time-${refreshKey}`} search={search} onRefresh={refresh} />}
      {tab === 'timesheets' && <TimesheetsTable key={`ts-${refreshKey}`} search={search} />}
      {tab === 'exceptions' && <ExceptionsTable key={`ex-${refreshKey}`} search={search} />}
      {tab === 'payroll' && <PayrollTable key={`pay-${refreshKey}`} search={search} />}
      {tab === 'hr-lite' && <HrLitePanel key={`hr-${refreshKey}`} search={search} />}
      {tab === 'messages' && messagingEnabled && <MessagesTab key={`msg-${refreshKey}`} search={search} />}
    </div>
  );
}
