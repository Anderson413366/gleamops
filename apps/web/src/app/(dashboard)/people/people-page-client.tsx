'use client';

import { useState, useCallback } from 'react';
import { Users, CalendarClock, Clock, AlertTriangle, FileText, DollarSign } from 'lucide-react';
import { ChipTabs, SearchInput, EmptyState } from '@gleamops/ui';
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
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">People</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Staff, Availability, Time, Exceptions, Timesheets, Payroll Export
        </p>
      </div>

      <ChipTabs tabs={TABS} active={tab} onChange={setTab} />
      <SearchInput value={search} onChange={setSearch} placeholder={`Search ${tab}...`} />

      {tab === 'staff' && <StaffTable key={`s-${refreshKey}`} search={search} />}

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

      {tab === 'time' && (
        <TimeEntriesTable key={`te-${refreshKey}`} search={search} onRefresh={refresh} />
      )}

      {tab === 'exceptions' && <ExceptionsTable key={`e-${refreshKey}`} search={search} />}

      {tab === 'timesheets' && <TimesheetsTable key={`ts-${refreshKey}`} search={search} />}

      {tab === 'payroll-export' && <PayrollTable key={`p-${refreshKey}`} search={search} />}
    </div>
  );
}
