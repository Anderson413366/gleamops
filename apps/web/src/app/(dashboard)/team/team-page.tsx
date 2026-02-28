'use client';

/**
 * Team module — renamed from Workforce (Epic 2.2).
 * Re-exports the existing workforce page with the new "Team" branding.
 */

import { useState, useMemo, useEffect } from 'react';
import { Users, FileText, BriefcaseBusiness, DollarSign, Plus, MessageSquare, UserRoundCheck, Clock, Droplets, HardHat } from 'lucide-react';
import { ChipTabs, SearchInput, Button, Card, CardContent } from '@gleamops/ui';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useSyncedTab } from '@/hooks/use-synced-tab';

import StaffTable from '../workforce/staff/staff-table';
import TimeEntriesTable from '../workforce/timekeeping/time-entries-table';
import TimesheetsTable from '../workforce/timesheets/timesheets-table';
import PositionsTable from '../workforce/positions/positions-table';
import PayrollTable from '../workforce/payroll/payroll-table';
import MessagesTab from '../workforce/messages/messages-tab';
import HrLitePanel from '../workforce/hr/hr-lite-panel';
import MicrofiberTable from '../workforce/microfiber/microfiber-table';
import MicrofiberExport from '../workforce/microfiber/microfiber-export';
import SubcontractorsTable from '../vendors/subcontractors/subcontractors-table';

const BASE_TABS = [
  { key: 'staff', label: 'Staff', icon: <Users className="h-4 w-4" /> },
  { key: 'positions', label: 'Positions', icon: <BriefcaseBusiness className="h-4 w-4" /> },
  { key: 'attendance', label: 'Attendance', icon: <Clock className="h-4 w-4" /> },
  { key: 'timesheets', label: 'Timesheets', icon: <FileText className="h-4 w-4" /> },
  { key: 'payroll', label: 'Payroll', icon: <DollarSign className="h-4 w-4" /> },
  { key: 'hr', label: 'HR', icon: <UserRoundCheck className="h-4 w-4" /> },
  { key: 'microfiber', label: 'Microfiber', icon: <Droplets className="h-4 w-4" /> },
  { key: 'subcontractors', label: 'Subcontractors', icon: <HardHat className="h-4 w-4" /> },
];

export default function TeamPageClient() {
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
    aliases: {
      timekeeping: 'attendance',
      attendance: 'attendance',
      exceptions: 'timesheets',
      'hr-lite': 'hr',
    },
  });
  const [search, setSearch] = useState('');
  const refreshKey = 0;
  const [autoCreateStaff, setAutoCreateStaff] = useState(false);
  const [kpis, setKpis] = useState({
    activeStaff: 0,
    supervisors: 0,
    openExceptions: 0,
    pendingTimesheets: 0,
  });
  useEffect(() => {
    async function fetchKpis() {
      const supabase = getSupabaseBrowserClient();
      const [activeRes, superRes, excRes, tsRes] = await Promise.all([
        supabase.from('staff').select('id', { count: 'exact', head: true }).is('archived_at', null).eq('staff_status', 'ACTIVE'),
        supabase.from('staff').select('id', { count: 'exact', head: true }).is('archived_at', null).eq('staff_status', 'ACTIVE').eq('role', 'SUPERVISOR'),
        supabase.from('time_exceptions').select('id', { count: 'exact', head: true }).is('resolved_at', null),
        supabase.from('timesheets').select('id', { count: 'exact', head: true }).eq('status', 'SUBMITTED'),
      ]);

      setKpis({
        activeStaff: activeRes.count ?? 0,
        supervisors: superRes.count ?? 0,
        openExceptions: excRes.count ?? 0,
        pendingTimesheets: tsRes.count ?? 0,
      });
    }
    fetchKpis();
  }, []);

  const handleAdd = () => {
    setAutoCreateStaff(true);
  };

  const addLabel = tab === 'staff' ? 'Add Staff' : '';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Team</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your team — staff, positions, timesheets, payroll, HR, and microfiber program</p>
        </div>
        {addLabel && (
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4" />
            {addLabel}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Active Staff</p><p className="text-lg font-semibold sm:text-xl leading-tight">{kpis.activeStaff}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Supervisors</p><p className="text-lg font-semibold sm:text-xl leading-tight">{kpis.supervisors}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Open Exceptions</p><p className="text-lg font-semibold sm:text-xl leading-tight text-warning">{kpis.openExceptions}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Pending Timesheets</p><p className="text-lg font-semibold sm:text-xl leading-tight">{kpis.pendingTimesheets}</p></CardContent></Card>
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
      {tab === 'attendance' && <TimeEntriesTable key={`attendance-${refreshKey}`} search={search} />}
      {tab === 'timesheets' && <TimesheetsTable key={`ts-${refreshKey}`} search={search} />}
      {tab === 'payroll' && <PayrollTable key={`pay-${refreshKey}`} search={search} />}
      {tab === 'hr' && <HrLitePanel key={`hr-${refreshKey}`} search={search} />}
      {tab === 'microfiber' && (
        <div className="space-y-4">
          <MicrofiberExport key={`mfe-${refreshKey}`} />
          <MicrofiberTable key={`mft-${refreshKey}`} search={search} />
        </div>
      )}
      {tab === 'messages' && messagingEnabled && <MessagesTab key={`msg-${refreshKey}`} search={search} />}
      {tab === 'subcontractors' && <SubcontractorsTable key={`subs-${refreshKey}`} search={search} />}
    </div>
  );
}
