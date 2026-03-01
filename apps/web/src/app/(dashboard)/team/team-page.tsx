'use client';

/**
 * Team module — renamed from Workforce (Epic 2.2).
 * Re-exports the existing workforce page with the new "Team" branding.
 */

import { useState, useEffect, useCallback } from 'react';
import { Users, FileText, BriefcaseBusiness, DollarSign, Plus, MessageSquare, UserRoundCheck, Clock, Droplets, HardHat, Coffee, Tag } from 'lucide-react';
import { SearchInput, Button, Card, CardContent } from '@gleamops/ui';
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
import BreakRulesTable from '../workforce/break-rules/break-rules-table';
import ShiftTagsTable from '../workforce/shift-tags/shift-tags-table';

const ATTENDANCE_SUB_TABS = ['Overview', 'Add Clock Time', 'Manage Time Sheets', 'Clocked In List', 'Time Clock Locations', 'Auto-approval Rules'] as const;
const PAYROLL_SUB_TABS = ['Scheduled Hours', 'Confirmed Hours', 'Confirmed Time Sheets', 'Payroll Settings'] as const;

function AttendanceWrapper({ search }: { search: string }) {
  const [subTab, setSubTab] = useState('Overview');
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5 border-b border-border pb-2">
        {ATTENDANCE_SUB_TABS.map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => setSubTab(st)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              subTab === st ? 'bg-module-accent/15 text-module-accent border border-module-accent/30' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            {st}
          </button>
        ))}
      </div>
      {subTab === 'Overview' && <TimeEntriesTable search={search} />}
      {subTab !== 'Overview' && (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <p className="text-sm text-muted-foreground">{subTab} — coming soon</p>
        </div>
      )}
    </div>
  );
}

function PayrollWrapper({ search }: { search: string }) {
  const [subTab, setSubTab] = useState('Scheduled Hours');
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5 border-b border-border pb-2">
        {PAYROLL_SUB_TABS.map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => setSubTab(st)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              subTab === st ? 'bg-module-accent/15 text-module-accent border border-module-accent/30' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            {st}
          </button>
        ))}
      </div>
      {subTab === 'Scheduled Hours' && <PayrollTable search={search} />}
      {subTab !== 'Scheduled Hours' && (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <p className="text-sm text-muted-foreground">{subTab} — coming soon</p>
        </div>
      )}
    </div>
  );
}

const BASE_TABS = [
  { key: 'staff', label: 'Staff', icon: <Users className="h-4 w-4" /> },
  { key: 'positions', label: 'Positions', icon: <BriefcaseBusiness className="h-4 w-4" /> },
  { key: 'attendance', label: 'Attendance', icon: <Clock className="h-4 w-4" /> },
  { key: 'timesheets', label: 'Timesheets', icon: <FileText className="h-4 w-4" /> },
  { key: 'payroll', label: 'Payroll', icon: <DollarSign className="h-4 w-4" /> },
  { key: 'hr', label: 'HR', icon: <UserRoundCheck className="h-4 w-4" /> },
  { key: 'microfiber', label: 'Microfiber', icon: <Droplets className="h-4 w-4" /> },
  { key: 'subcontractors', label: 'Subcontractors', icon: <HardHat className="h-4 w-4" /> },
  { key: 'break-rules', label: 'Break Rules', icon: <Coffee className="h-4 w-4" /> },
  { key: 'shift-tags', label: 'Shift Tags', icon: <Tag className="h-4 w-4" /> },
  { key: 'messages', label: 'Messages', icon: <MessageSquare className="h-4 w-4" /> },
];

export default function TeamPageClient() {
  const [tab] = useSyncedTab({
    tabKeys: BASE_TABS.map((entry) => entry.key),
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
  const [tabKpis, setTabKpis] = useState<{ label: string; value: number | string; warn?: boolean }[]>([
    { label: 'Active Staff', value: 0 },
    { label: 'Supervisors', value: 0 },
    { label: 'Open Exceptions', value: 0, warn: true },
    { label: 'Pending Timesheets', value: 0 },
  ]);

  const fetchTabKpis = useCallback(async (activeTab: string) => {
    const supabase = getSupabaseBrowserClient();

    if (activeTab === 'staff') {
      const [activeRes, superRes, excRes, tsRes] = await Promise.all([
        supabase.from('staff').select('id', { count: 'exact', head: true }).is('archived_at', null).eq('staff_status', 'ACTIVE'),
        supabase.from('staff').select('id', { count: 'exact', head: true }).is('archived_at', null).eq('staff_status', 'ACTIVE').eq('role', 'SUPERVISOR'),
        supabase.from('time_exceptions').select('id', { count: 'exact', head: true }).is('resolved_at', null),
        supabase.from('timesheets').select('id', { count: 'exact', head: true }).eq('status', 'SUBMITTED'),
      ]);
      setTabKpis([
        { label: 'Active Staff', value: activeRes.count ?? 0 },
        { label: 'Supervisors', value: superRes.count ?? 0 },
        { label: 'Open Exceptions', value: excRes.count ?? 0, warn: (excRes.count ?? 0) > 0 },
        { label: 'Pending Timesheets', value: tsRes.count ?? 0 },
      ]);
    } else if (activeTab === 'positions') {
      const [posRes, assignedRes, staffRes] = await Promise.all([
        supabase.from('staff_positions').select('id', { count: 'exact', head: true }).is('archived_at', null),
        supabase.from('staff_eligible_positions').select('staff_id').is('archived_at', null),
        supabase.from('staff').select('id', { count: 'exact', head: true }).is('archived_at', null).eq('staff_status', 'ACTIVE'),
      ]);
      const totalPos = posRes.count ?? 0;
      const uniqueStaff = new Set((assignedRes.data ?? []).map((r: { staff_id: string }) => r.staff_id)).size;
      const totalStaff = staffRes.count ?? 0;
      setTabKpis([
        { label: 'Total Positions', value: totalPos },
        { label: 'Staff Assigned', value: uniqueStaff },
        { label: 'Unassigned', value: Math.max(totalStaff - uniqueStaff, 0), warn: (totalStaff - uniqueStaff) > 0 },
        { label: 'Avg Staff/Position', value: totalPos > 0 ? (uniqueStaff / totalPos).toFixed(1) : '0' },
      ]);
    } else if (activeTab === 'attendance') {
      const today = new Date().toISOString().slice(0, 10);
      const [clockedInRes, clockInsRes, excRes] = await Promise.all([
        supabase.from('time_entries').select('id', { count: 'exact', head: true }).is('clock_out', null).gte('clock_in', `${today}T00:00:00`),
        supabase.from('time_entries').select('id', { count: 'exact', head: true }).gte('clock_in', `${today}T00:00:00`),
        supabase.from('time_exceptions').select('id', { count: 'exact', head: true }).is('resolved_at', null),
      ]);
      setTabKpis([
        { label: 'Clocked In Now', value: clockedInRes.count ?? 0 },
        { label: 'Clock-ins Today', value: clockInsRes.count ?? 0 },
        { label: 'Open Exceptions', value: excRes.count ?? 0, warn: (excRes.count ?? 0) > 0 },
        { label: 'Avg Duration', value: '—' },
      ]);
    } else if (activeTab === 'timesheets') {
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const [pendingRes, approvedRes, rejectedRes, hoursRes] = await Promise.all([
        supabase.from('timesheets').select('id', { count: 'exact', head: true }).eq('status', 'SUBMITTED'),
        supabase.from('timesheets').select('id', { count: 'exact', head: true }).eq('status', 'APPROVED').gte('updated_at', weekAgo),
        supabase.from('timesheets').select('id', { count: 'exact', head: true }).eq('status', 'REJECTED'),
        supabase.from('timesheets').select('total_hours').eq('status', 'APPROVED'),
      ]);
      const totalHours = (hoursRes.data ?? []).reduce((sum, r: { total_hours: number | null }) => sum + (Number(r.total_hours) || 0), 0);
      setTabKpis([
        { label: 'Pending', value: pendingRes.count ?? 0 },
        { label: 'Approved This Week', value: approvedRes.count ?? 0 },
        { label: 'Rejected', value: rejectedRes.count ?? 0, warn: (rejectedRes.count ?? 0) > 0 },
        { label: 'Total Hours', value: totalHours > 0 ? `${totalHours.toFixed(0)}h` : '0h' },
      ]);
    } else if (activeTab === 'payroll') {
      const [staffRes, schedRes, confirmedRes, pendingRes] = await Promise.all([
        supabase.from('staff').select('id', { count: 'exact', head: true }).is('archived_at', null).eq('staff_status', 'ACTIVE'),
        supabase.from('timesheets').select('total_hours').in('status', ['SUBMITTED', 'APPROVED']),
        supabase.from('timesheets').select('total_hours').eq('status', 'APPROVED'),
        supabase.from('timesheets').select('id', { count: 'exact', head: true }).eq('status', 'SUBMITTED'),
      ]);
      const schedHours = (schedRes.data ?? []).reduce((sum, r: { total_hours: number | null }) => sum + (Number(r.total_hours) || 0), 0);
      const confirmedHours = (confirmedRes.data ?? []).reduce((sum, r: { total_hours: number | null }) => sum + (Number(r.total_hours) || 0), 0);
      setTabKpis([
        { label: 'Staff on Payroll', value: staffRes.count ?? 0 },
        { label: 'Scheduled Hours', value: schedHours > 0 ? `${schedHours.toFixed(0)}h` : '0h' },
        { label: 'Confirmed Hours', value: confirmedHours > 0 ? `${confirmedHours.toFixed(0)}h` : '0h' },
        { label: 'Pending Confirm', value: pendingRes.count ?? 0 },
      ]);
    } else if (activeTab === 'hr') {
      const [ptoRes, goalsRes, reviewsRes, docsRes] = await Promise.all([
        supabase.from('hr_leave_requests').select('id', { count: 'exact', head: true }).eq('status', 'PENDING').is('archived_at', null),
        supabase.from('hr_goals').select('id', { count: 'exact', head: true }).eq('status', 'ACTIVE').is('archived_at', null),
        supabase.from('hr_reviews').select('id', { count: 'exact', head: true }).eq('status', 'SUBMITTED').is('archived_at', null),
        supabase.from('hr_documents').select('id', { count: 'exact', head: true }).is('archived_at', null).lte('expiry_date', new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)),
      ]);
      setTabKpis([
        { label: 'Pending PTO', value: ptoRes.count ?? 0 },
        { label: 'Active Goals', value: goalsRes.count ?? 0 },
        { label: 'Submitted Reviews', value: reviewsRes.count ?? 0 },
        { label: 'Expiring Docs', value: docsRes.count ?? 0, warn: (docsRes.count ?? 0) > 0 },
      ]);
    } else {
      // Shared fallback for microfiber, subs, break-rules, shift-tags
      const [activeRes, posRes, excRes, tsRes] = await Promise.all([
        supabase.from('staff').select('id', { count: 'exact', head: true }).is('archived_at', null).eq('staff_status', 'ACTIVE'),
        supabase.from('staff_positions').select('id', { count: 'exact', head: true }).is('archived_at', null),
        supabase.from('time_exceptions').select('id', { count: 'exact', head: true }).is('resolved_at', null),
        supabase.from('timesheets').select('id', { count: 'exact', head: true }).eq('status', 'SUBMITTED'),
      ]);
      setTabKpis([
        { label: 'Active Staff', value: activeRes.count ?? 0 },
        { label: 'Positions', value: posRes.count ?? 0 },
        { label: 'Exceptions', value: excRes.count ?? 0, warn: (excRes.count ?? 0) > 0 },
        { label: 'Timesheets', value: tsRes.count ?? 0 },
      ]);
    }
  }, []);

  useEffect(() => {
    fetchTabKpis(tab);
  }, [tab, fetchTabKpis]);

  const handleAdd = () => {
    setAutoCreateStaff(true);
  };

  const addLabel = tab === 'staff' ? 'Add Staff' : '';

  return (
    <div className="space-y-6">
      <div className="pt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tabKpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
              <p className={`text-lg font-semibold sm:text-xl leading-tight${kpi.warn ? ' text-warning' : ''}`}>{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-muted/30 px-3 py-2">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={`Search ${tab}...`}
          className="w-56 sm:w-72 lg:w-80"
        />
        {addLabel && (
          <Button className="shrink-0" onClick={handleAdd}>
            <Plus className="h-4 w-4" />
            {addLabel}
          </Button>
        )}
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
      {tab === 'attendance' && (
        <AttendanceWrapper key={`attendance-${refreshKey}`} search={search} />
      )}
      {tab === 'timesheets' && <TimesheetsTable key={`ts-${refreshKey}`} search={search} />}
      {tab === 'payroll' && (
        <PayrollWrapper key={`pay-${refreshKey}`} search={search} />
      )}
      {tab === 'hr' && <HrLitePanel key={`hr-${refreshKey}`} search={search} />}
      {tab === 'microfiber' && (
        <div className="space-y-4">
          <MicrofiberExport key={`mfe-${refreshKey}`} />
          <MicrofiberTable key={`mft-${refreshKey}`} search={search} />
        </div>
      )}
      {tab === 'messages' && <MessagesTab key={`msg-${refreshKey}`} search={search} />}
      {tab === 'subcontractors' && <SubcontractorsTable key={`subs-${refreshKey}`} search={search} />}
      {tab === 'break-rules' && <BreakRulesTable key={`break-${refreshKey}`} search={search} />}
      {tab === 'shift-tags' && <ShiftTagsTable key={`tags-${refreshKey}`} search={search} />}
    </div>
  );
}
