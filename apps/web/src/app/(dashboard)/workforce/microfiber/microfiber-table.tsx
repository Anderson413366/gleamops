'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Droplets } from 'lucide-react';
import { toast } from 'sonner';
import {
  Badge,
  Button,
  EmptyState,
  ExportButton,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableSkeleton,
  ViewToggle,
  cn,
} from '@gleamops/ui';
import type { MicrofiberEnrollmentListItem } from '@gleamops/shared';
import { usePagination } from '@/hooks/use-pagination';
import { useTableSort } from '@/hooks/use-table-sort';
import { useViewPreference } from '@/hooks/use-view-preference';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

interface MicrofiberTableProps {
  search: string;
}

type StatusFilter = 'all' | 'enrolled' | 'not-enrolled' | 'exited';

type StaffAssignmentRow = {
  staff_id: string;
  end_date: string | null;
  job?: {
    status?: string | null;
    site?: {
      name?: string | null;
      site_code?: string | null;
    } | null;
  } | null;
};

type MicrofiberRow = MicrofiberEnrollmentListItem & {
  sites: string[];
};

const STATUS_FILTERS: Array<{ key: StatusFilter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'enrolled', label: 'Enrolled' },
  { key: 'not-enrolled', label: 'Not Enrolled' },
  { key: 'exited', label: 'Exited' },
];

function statusFor(row: MicrofiberEnrollmentListItem): StatusFilter {
  if (row.microfiber_enrolled) return 'enrolled';
  if (row.microfiber_exited_at) return 'exited';
  return 'not-enrolled';
}

function formatDate(value: string | null) {
  if (!value) return '—';
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function statusBadge(status: StatusFilter): { label: string; color: 'green' | 'orange' | 'gray' } {
  if (status === 'enrolled') return { label: 'Enrolled', color: 'green' };
  if (status === 'exited') return { label: 'Exited', color: 'orange' };
  return { label: 'Not Enrolled', color: 'gray' };
}

async function authHeaders(): Promise<Record<string, string>> {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export default function MicrofiberTable({ search }: MicrofiberTableProps) {
  const router = useRouter();
  const { view, setView } = useViewPreference('workforce-microfiber');

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<MicrofiberRow[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('enrolled');
  const [defaultRate, setDefaultRate] = useState(5);
  const [savingStaffId, setSavingStaffId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/workforce/microfiber', {
        headers: await authHeaders(),
        cache: 'no-store',
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !Array.isArray(body?.data)) {
        throw new Error(body?.detail ?? body?.title ?? 'Failed to load microfiber roster');
      }

      const staffRows = body.data as MicrofiberEnrollmentListItem[];
      const staffIds = staffRows.map((row) => row.id);
      const siteNamesByStaff = new Map<string, Set<string>>();

      if (staffIds.length > 0) {
        const supabase = getSupabaseBrowserClient();
        const { data: assignments } = await supabase
          .from('job_staff_assignments')
          .select('staff_id, end_date, job:job_id!job_staff_assignments_job_id_fkey(status, site:site_id!site_jobs_site_id_fkey(name, site_code))')
          .in('staff_id', staffIds)
          .is('archived_at', null);

        for (const raw of (assignments ?? []) as unknown as StaffAssignmentRow[]) {
          const activeAssignment = !raw.end_date;
          const activeJob = ['ACTIVE', 'IN_PROGRESS'].includes(String(raw.job?.status ?? '').toUpperCase());
          if (!activeAssignment || !activeJob) continue;
          const siteName = raw.job?.site?.name ?? raw.job?.site?.site_code;
          if (!siteName) continue;
          if (!siteNamesByStaff.has(raw.staff_id)) {
            siteNamesByStaff.set(raw.staff_id, new Set<string>());
          }
          siteNamesByStaff.get(raw.staff_id)?.add(siteName);
        }
      }

      setRows(staffRows.map((row) => ({
        ...row,
        sites: Array.from(siteNamesByStaff.get(row.id) ?? []),
      })));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load microfiber roster');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      const rowStatus = statusFor(row);
      if (statusFilter !== 'all' && rowStatus !== statusFilter) return false;
      if (!query) return true;

      return (
        (row.full_name ?? '').toLowerCase().includes(query)
        || row.staff_code.toLowerCase().includes(query)
        || (row.role ?? '').toLowerCase().includes(query)
        || row.sites.some((site) => site.toLowerCase().includes(query))
      );
    });
  }, [rows, search, statusFilter]);

  const statusCounts = useMemo(() => {
    const counts: Record<StatusFilter, number> = { all: rows.length, enrolled: 0, 'not-enrolled': 0, exited: 0 };
    for (const row of rows) {
      counts[statusFor(row)] += 1;
    }
    return counts;
  }, [rows]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    filtered as unknown as Record<string, unknown>[],
    'full_name',
    'asc',
  );
  const sortedRows = sorted as unknown as MicrofiberRow[];
  const pag = usePagination(sortedRows, 25);

  const enroll = async (row: MicrofiberRow) => {
    setSavingStaffId(row.id);
    try {
      const response = await fetch(`/api/workforce/microfiber/${row.id}/enroll`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(await authHeaders()),
        },
        body: JSON.stringify({ microfiber_rate_per_set: defaultRate }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.detail ?? body?.title ?? 'Failed to enroll specialist');
      toast.success(`${row.full_name ?? row.staff_code} enrolled`);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to enroll specialist');
    } finally {
      setSavingStaffId(null);
    }
  };

  const exit = async (row: MicrofiberRow) => {
    setSavingStaffId(row.id);
    try {
      const response = await fetch(`/api/workforce/microfiber/${row.id}/exit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(await authHeaders()),
        },
        body: JSON.stringify({}),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.detail ?? body?.title ?? 'Failed to remove specialist');
      toast.success(`${row.full_name ?? row.staff_code} removed from microfiber`);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove specialist');
    } finally {
      setSavingStaffId(null);
    }
  };

  if (loading) {
    return <TableSkeleton rows={6} cols={6} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => setStatusFilter(filter.key)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all duration-200 ease-in-out',
                statusFilter === filter.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80',
              )}
            >
              {filter.label}
              <span className={cn(
                'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                statusFilter === filter.key ? 'bg-primary-foreground/20' : 'bg-background',
              )}
              >
                {statusCounts[filter.key]}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            Default Rate
            <input
              type="number"
              min={0}
              step={0.5}
              value={defaultRate}
              onChange={(event) => setDefaultRate(Number(event.target.value || 0))}
              className="h-9 w-20 rounded-lg border border-border bg-background px-2 text-sm"
            />
          </label>
          <ViewToggle view={view} onChange={setView} />
          <ExportButton
            data={filtered.map((row) => ({
              staff_code: row.staff_code,
              full_name: row.full_name ?? '',
              role: row.role ?? '',
              sites: row.sites.join('; '),
              microfiber_rate_per_set: row.microfiber_rate_per_set ?? '',
              microfiber_enrolled_at: row.microfiber_enrolled_at ?? '',
              status: statusBadge(statusFor(row)).label,
            })) as unknown as Record<string, unknown>[]}
            filename="microfiber-roster"
            columns={[
              { key: 'staff_code', label: 'Staff Code' },
              { key: 'full_name', label: 'Staff Name' },
              { key: 'role', label: 'Role' },
              { key: 'sites', label: 'Sites' },
              { key: 'microfiber_rate_per_set', label: 'Rate Per Set' },
              { key: 'microfiber_enrolled_at', label: 'Enrolled Date' },
              { key: 'status', label: 'Status' },
            ]}
          />
        </div>
      </div>

      {view === 'card' ? (
        filtered.length === 0 ? (
          <EmptyState
            icon={<Droplets className="h-12 w-12" />}
            title="No microfiber specialists"
            description="Enroll specialists to start tracking wash payouts."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {pag.page.map((row) => {
              const status = statusFor(row);
              const badge = statusBadge(status);
              return (
                <div
                  key={row.id}
                  className="rounded-lg border border-border bg-card p-4 shadow-sm transition-all duration-200 ease-in-out hover:border-primary/40"
                >
                  <button
                    type="button"
                    onClick={() => router.push(`/team/staff/${encodeURIComponent(row.staff_code || row.id)}`)}
                    className="w-full text-left"
                  >
                    <p className="text-sm font-semibold">{row.full_name ?? row.staff_code}</p>
                    <p className="text-xs text-muted-foreground">{row.staff_code}</p>
                  </button>
                  <div className="mt-2">
                    <Badge color={badge.color}>{badge.label}</Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">Rate: ${(row.microfiber_rate_per_set ?? 0).toFixed(2)}/set</p>
                  <p className="text-xs text-muted-foreground">Enrolled: {formatDate(row.microfiber_enrolled_at)}</p>
                  <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                    Sites: {row.sites.length > 0 ? row.sites.join(', ') : '—'}
                  </p>
                  <div className="mt-3">
                    {status === 'enrolled' ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={savingStaffId === row.id}
                        onClick={() => void exit(row)}
                      >
                        Remove
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        disabled={savingStaffId === row.id}
                        onClick={() => void enroll(row)}
                      >
                        Enroll
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        <>
          <div className="w-full overflow-x-auto">
            <Table className="w-full min-w-full">
              <TableHeader>
                <tr>
                  <TableHead sortable sorted={sortKey === 'staff_code' && sortDir} onSort={() => onSort('staff_code')}>Staff</TableHead>
                  <TableHead>Sites</TableHead>
                  <TableHead sortable sorted={sortKey === 'microfiber_rate_per_set' && sortDir} onSort={() => onSort('microfiber_rate_per_set')}>Rate / Set</TableHead>
                  <TableHead sortable sorted={sortKey === 'microfiber_enrolled_at' && sortDir} onSort={() => onSort('microfiber_enrolled_at')}>Enrolled Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </tr>
              </TableHeader>
              <TableBody>
                {pag.page.map((row) => {
                  const status = statusFor(row);
                  const badge = statusBadge(status);
                  return (
                    <TableRow
                      key={row.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/team/staff/${encodeURIComponent(row.staff_code || row.id)}`)}
                    >
                      <TableCell>
                        <p className="font-medium">{row.full_name ?? row.staff_code}</p>
                        <p className="text-xs text-muted-foreground">{row.staff_code} · {row.role ?? '—'}</p>
                      </TableCell>
                      <TableCell className="max-w-[320px] truncate">{row.sites.length > 0 ? row.sites.join(', ') : '—'}</TableCell>
                      <TableCell>${(row.microfiber_rate_per_set ?? 0).toFixed(2)}</TableCell>
                      <TableCell>{formatDate(row.microfiber_enrolled_at)}</TableCell>
                      <TableCell><Badge color={badge.color}>{badge.label}</Badge></TableCell>
                      <TableCell>
                        {status === 'enrolled' ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={savingStaffId === row.id}
                            onClick={(event) => {
                              event.stopPropagation();
                              void exit(row);
                            }}
                          >
                            Remove
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            disabled={savingStaffId === row.id}
                            onClick={(event) => {
                              event.stopPropagation();
                              void enroll(row);
                            }}
                          >
                            Enroll
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={<Droplets className="h-12 w-12" />}
              title="No microfiber specialists"
              description="Enroll specialists to start tracking wash payouts."
            />
          ) : null}
        </>
      )}

      <Pagination
        currentPage={pag.currentPage}
        totalPages={pag.totalPages}
        totalItems={pag.totalItems}
        pageSize={pag.pageSize}
        hasNext={pag.hasNext}
        hasPrev={pag.hasPrev}
        onNext={pag.nextPage}
        onPrev={pag.prevPage}
      />
    </div>
  );
}
