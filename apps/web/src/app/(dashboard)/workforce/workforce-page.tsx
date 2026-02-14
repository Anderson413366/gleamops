'use client';

import { useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Users, Clock, FileText, AlertTriangle, BriefcaseBusiness, DollarSign, Plus, MessageSquare } from 'lucide-react';
import { ChipTabs, SearchInput, Button } from '@gleamops/ui';
import { useFeatureFlag } from '@/hooks/use-feature-flag';

// Import existing tables from /people/ subdirectories
import StaffTable from '../people/staff/staff-table';
import TimeEntriesTable from '../people/timekeeping/time-entries-table';
import TimesheetsTable from '../people/timesheets/timesheets-table';
import ExceptionsTable from '../people/exceptions/exceptions-table';
import PositionsTable from '../people/positions/positions-table';
import PayrollTable from '../people/payroll/payroll-table';
import MessagesTab from './messages/messages-tab';

const BASE_TABS = [
  { key: 'staff', label: 'Staff', icon: <Users className="h-4 w-4" /> },
  { key: 'positions', label: 'Positions', icon: <BriefcaseBusiness className="h-4 w-4" /> },
  { key: 'timekeeping', label: 'Timekeeping', icon: <Clock className="h-4 w-4" /> },
  { key: 'timesheets', label: 'Timesheets', icon: <FileText className="h-4 w-4" /> },
  { key: 'exceptions', label: 'Exceptions', icon: <AlertTriangle className="h-4 w-4" /> },
  { key: 'payroll', label: 'Payroll', icon: <DollarSign className="h-4 w-4" /> },
];

export default function WorkforcePageClient() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab');
  const messagingEnabled = useFeatureFlag('messaging_v1');

  const TABS = useMemo(() => {
    const tabs = [...BASE_TABS];
    if (messagingEnabled) {
      tabs.push({ key: 'messages', label: 'Messages', icon: <MessageSquare className="h-4 w-4" /> });
    }
    return tabs;
  }, [messagingEnabled]);

  const [tab, setTab] = useState(TABS.some(t => t.key === initialTab) ? initialTab! : TABS[0].key);
  const [search, setSearch] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [autoCreateStaff, setAutoCreateStaff] = useState(false);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

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
      {tab === 'positions' && <PositionsTable key={`pos-${refreshKey}`} search={search} />}
      {tab === 'timekeeping' && <TimeEntriesTable key={`time-${refreshKey}`} search={search} onRefresh={refresh} />}
      {tab === 'timesheets' && <TimesheetsTable key={`ts-${refreshKey}`} search={search} />}
      {tab === 'exceptions' && <ExceptionsTable key={`ex-${refreshKey}`} search={search} />}
      {tab === 'payroll' && <PayrollTable key={`pay-${refreshKey}`} search={search} />}
      {tab === 'messages' && messagingEnabled && <MessagesTab key={`msg-${refreshKey}`} search={search} />}
    </div>
  );
}
