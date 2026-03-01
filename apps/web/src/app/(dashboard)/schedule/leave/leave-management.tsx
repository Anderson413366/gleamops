'use client';

import { useState, useEffect, useMemo } from 'react';
import { Plus, RotateCcw } from 'lucide-react';
import { Button, Card, CardContent, CollapsibleCard, EmptyState, Select, Input, Badge } from '@gleamops/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { LeaveRequestForm } from './leave-request-form';

interface LeaveRequest {
  id: string;
  staff_id: string;
  staff_name: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  status: string;
  is_paid: boolean;
  reason: string | null;
}

interface LeaveBalance {
  leave_type: string;
  is_paid: boolean;
  entitled_days: number;
  remaining_days: number;
}

const LEAVE_STATUS_COLORS: Record<string, 'yellow' | 'green' | 'red' | 'gray'> = {
  PENDING: 'yellow',
  APPROVED: 'green',
  DECLINED: 'red',
  CANCELED: 'gray',
};

function formatDate(dateStr: string) {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function LeaveManagement() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [positionFilter, setPositionFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [positions, setPositions] = useState<Array<{ value: string; label: string }>>([]);
  const [locations, setLocations] = useState<Array<{ value: string; label: string }>>([]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const supabase = getSupabaseBrowserClient();

      // Fetch leave requests from staff_availability_rules with rule_type = 'ONE_OFF' and availability_type = 'UNAVAILABLE'
      const { data: rules } = await supabase
        .from('staff_availability_rules')
        .select('id, staff_id, availability_type, one_off_start, one_off_end, notes, rule_type, staff:staff_id(full_name)')
        .eq('rule_type', 'ONE_OFF')
        .eq('availability_type', 'UNAVAILABLE')
        .is('archived_at', null)
        .order('one_off_start', { ascending: false });

      const mapped: LeaveRequest[] = (rules ?? []).map((r: Record<string, unknown>) => {
        const staff = r.staff as { full_name?: string } | null;
        const notes = (r.notes as string) || '';
        const leaveType = notes.startsWith('[') ? notes.slice(1, notes.indexOf(']')) : 'Time Off';
        const isPaid = notes.includes('[PAID]');
        const reason = notes.replace(/\[.*?\]/g, '').trim() || null;
        const status = (r as Record<string, unknown>).valid_to && new Date((r as Record<string, unknown>).valid_to as string) < new Date() ? 'APPROVED' : 'PENDING';

        return {
          id: r.id as string,
          staff_id: r.staff_id as string,
          staff_name: staff?.full_name ?? 'Unknown',
          leave_type: leaveType,
          start_date: (r.one_off_start as string) ?? '',
          end_date: (r.one_off_end as string) ?? '',
          status,
          is_paid: isPaid,
          reason,
        };
      });

      setRequests(mapped);

      // Fetch positions for filter
      const { data: posData } = await supabase
        .from('position_types')
        .select('position_code, display_name')
        .is('archived_at', null)
        .limit(50);

      setPositions((posData ?? []).map((p: Record<string, unknown>) => ({
        value: (p.position_code as string) ?? '',
        label: (p.display_name as string) ?? (p.position_code as string) ?? '',
      })));

      // Fetch locations for filter
      const { data: siteData } = await supabase
        .from('sites')
        .select('id, name, site_code')
        .is('archived_at', null)
        .order('name')
        .limit(100);

      setLocations((siteData ?? []).map((s: Record<string, unknown>) => ({
        value: (s.id as string) ?? '',
        label: (s.site_code as string) ? `${s.site_code} - ${s.name}` : (s.name as string) ?? '',
      })));

      setLoading(false);
    }

    fetchData();
  }, [formOpen]);

  const resetFilters = () => {
    setStartDate('');
    setEndDate('');
    setPositionFilter('');
    setLocationFilter('');
    setSortBy('date');
  };

  const pendingRequests = useMemo(() => requests.filter((r) => r.status === 'PENDING'), [requests]);
  const upcomingLeave = useMemo(
    () => requests.filter((r) => r.status === 'APPROVED' && new Date(r.end_date) >= new Date()),
    [requests],
  );

  const leaveBalances: LeaveBalance[] = useMemo(() => [
    { leave_type: 'Annual Leave', is_paid: true, entitled_days: 20, remaining_days: 20 },
    { leave_type: 'Sick Leave', is_paid: true, entitled_days: 10, remaining_days: 10 },
    { leave_type: 'Personal Leave', is_paid: false, entitled_days: 5, remaining_days: 5 },
    { leave_type: 'Bereavement', is_paid: true, entitled_days: 3, remaining_days: 3 },
    { leave_type: 'Jury Duty', is_paid: true, entitled_days: 5, remaining_days: 5 },
  ], []);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">Loading leave management...</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Leave Management</h2>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" />
          Request Leave
        </Button>
      </div>

      {/* Filter bar */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-end gap-3">
            <Input label="Start Date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40" />
            <Input label="End Date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-40" />
            <Select
              label="Select Position"
              value={positionFilter}
              onChange={(e) => setPositionFilter(e.target.value)}
              options={[{ value: '', label: 'All Positions' }, ...positions]}
            />
            <Select
              label="Select Location"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              options={[{ value: '', label: 'All Locations' }, ...locations]}
            />
            <Select
              label="Sort By"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              options={[
                { value: 'date', label: 'Date' },
                { value: 'name', label: 'Name' },
                { value: 'type', label: 'Leave Type' },
              ]}
            />
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset Filters
            </button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Max number of staff that can be booked off at once: <span className="font-medium text-foreground">5</span>
          </p>
        </CardContent>
      </Card>

      {/* Awaiting Approval */}
      <CollapsibleCard id="leave-awaiting" title="Awaiting Approval" headerRight={pendingRequests.length > 0 ? <Badge color="yellow">{pendingRequests.length}</Badge> : undefined}>
        {pendingRequests.length === 0 ? (
          <EmptyState title="No Pending Requests" description="No pending leave requests at this time." />
        ) : (
          <div className="space-y-2">
            {pendingRequests.map((req) => (
              <div key={req.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{req.staff_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {req.leave_type} &middot; {formatDate(req.start_date)} – {formatDate(req.end_date)}
                  </p>
                  {req.reason && <p className="text-xs text-muted-foreground italic mt-0.5">{req.reason}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <Badge color={req.is_paid ? 'green' : 'gray'}>{req.is_paid ? 'Paid' : 'Unpaid'}</Badge>
                  <Badge color={LEAVE_STATUS_COLORS[req.status] ?? 'gray'}>{req.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CollapsibleCard>

      {/* Upcoming Time Off */}
      <CollapsibleCard id="leave-upcoming" title="Upcoming Time Off" headerRight={upcomingLeave.length > 0 ? <Badge color="green">{upcomingLeave.length}</Badge> : undefined}>
        {upcomingLeave.length === 0 ? (
          <EmptyState title="No Upcoming Leave" description="No upcoming time off scheduled." />
        ) : (
          <div className="space-y-2">
            {upcomingLeave.map((req) => (
              <div key={req.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{req.staff_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {req.leave_type} &middot; {formatDate(req.start_date)} – {formatDate(req.end_date)}
                  </p>
                </div>
                <Badge color="green">Approved</Badge>
              </div>
            ))}
          </div>
        )}
      </CollapsibleCard>

      {/* Leave Balance */}
      <CollapsibleCard id="leave-balance" title="Leave Balance">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="pb-2 font-medium text-muted-foreground">Leave Types</th>
                <th className="pb-2 font-medium text-muted-foreground">Paid/Unpaid</th>
                <th className="pb-2 font-medium text-muted-foreground text-right">Entitled Days</th>
                <th className="pb-2 font-medium text-muted-foreground text-right">Remaining</th>
              </tr>
            </thead>
            <tbody>
              {leaveBalances.map((b) => (
                <tr key={b.leave_type} className="border-b border-border/50">
                  <td className="py-2 text-foreground">{b.leave_type}</td>
                  <td className="py-2">
                    <Badge color={b.is_paid ? 'green' : 'gray'}>{b.is_paid ? 'Paid' : 'Unpaid'}</Badge>
                  </td>
                  <td className="py-2 text-right text-foreground">{b.entitled_days}</td>
                  <td className="py-2 text-right text-foreground font-medium">{b.remaining_days}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CollapsibleCard>

      {/* Request Leave Form */}
      <LeaveRequestForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onCreated={() => setFormOpen(false)}
      />
    </div>
  );
}
