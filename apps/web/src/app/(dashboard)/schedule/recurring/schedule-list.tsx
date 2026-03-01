'use client';

import { useMemo } from 'react';
import { CalendarClock } from 'lucide-react';
import {
  Badge,
  EmptyState,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableSkeleton,
  cn,
} from '@gleamops/ui';
import { usePagination } from '@/hooks/use-pagination';
import { useTableSort } from '@/hooks/use-table-sort';

export interface RecurringScheduleRow {
  id: string;
  staffName: string;
  positionType: string;
  siteName: string;
  siteCode?: string | null;
  clientName?: string | null;
  clientId?: string | null;
  clientCode?: string | null;
  startTime: string;
  endTime: string;
  scheduledDates: string[];
  scheduleDays: string[];
  status: 'assigned' | 'open' | 'pending';
  blueprint?: {
    janitorialClosetLocation?: string | null;
    supplyStorageLocation?: string | null;
    waterSourceLocation?: string | null;
    dumpsterLocation?: string | null;
    securityProtocol?: string | null;
    entryInstructions?: string | null;
    parkingInstructions?: string | null;
    accessNotes?: string | null;
  } | null;
}

interface ScheduleListProps {
  rows: RecurringScheduleRow[];
  search?: string;
  loading?: boolean;
  onSelect?: (row: RecurringScheduleRow) => void;
}

const STATUS_BADGE: Record<RecurringScheduleRow['status'], 'green' | 'yellow' | 'red'> = {
  assigned: 'green',
  pending: 'yellow',
  open: 'red',
};

const WEEKDAY_ORDER = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

function normalizeDays(days: string[]) {
  const sorted = [...days].sort((a, b) => WEEKDAY_ORDER.indexOf(a) - WEEKDAY_ORDER.indexOf(b));
  if (sorted.length === 7) return 'Daily';
  if (sorted.join(',') === 'MON,TUE,WED,THU,FRI') return 'Weekdays';
  return sorted.map((day) => day.slice(0, 3)).join(', ');
}

export function ScheduleList({ rows, search = '', loading = false, onSelect }: ScheduleListProps) {
  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const query = search.toLowerCase();
    return rows.filter((row) => (
      row.staffName.toLowerCase().includes(query)
      || row.positionType.toLowerCase().includes(query)
      || row.siteName.toLowerCase().includes(query)
      || row.status.toLowerCase().includes(query)
      || row.scheduleDays.join(',').toLowerCase().includes(query)
    ));
  }, [rows, search]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    filtered as unknown as Record<string, unknown>[],
    'staffName',
    'asc',
  );
  const sortedRows = sorted as unknown as RecurringScheduleRow[];
  const pagination = usePagination(sortedRows, 25);

  if (loading) {
    return <TableSkeleton rows={8} cols={7} />;
  }

  if (filtered.length === 0) {
    return (
      <EmptyState
        icon={<CalendarClock className="h-12 w-12" />}
        title="No recurring schedule rows"
        description={
          search
            ? 'Try a different search term.'
            : 'Create position blocks, then assign specialists to publish the schedule.'
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="w-full overflow-x-auto">
        <Table>
          <TableHeader>
            <tr>
              <TableHead sortable sorted={sortKey === 'staffName' && sortDir} onSort={() => onSort('staffName')}>
                Staff
              </TableHead>
              <TableHead sortable sorted={sortKey === 'positionType' && sortDir} onSort={() => onSort('positionType')}>
                Position
              </TableHead>
              <TableHead sortable sorted={sortKey === 'siteName' && sortDir} onSort={() => onSort('siteName')}>
                Site
              </TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Days</TableHead>
              <TableHead sortable sorted={sortKey === 'status' && sortDir} onSort={() => onSort('status')}>
                Status
              </TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {pagination.page.map((row) => (
              <TableRow
                key={row.id}
                onClick={() => onSelect?.(row)}
                className={cn(onSelect && 'cursor-pointer')}
              >
                <TableCell className="font-medium">{row.staffName}</TableCell>
                <TableCell>{row.positionType}</TableCell>
                <TableCell>{row.siteName}</TableCell>
                <TableCell className="font-mono text-xs">{row.startTime} - {row.endTime}</TableCell>
                <TableCell className="text-muted-foreground">{normalizeDays(row.scheduleDays)}</TableCell>
                <TableCell>
                  <Badge color={STATUS_BADGE[row.status]}>{row.status.toUpperCase()}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Pagination
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        totalItems={pagination.totalItems}
        pageSize={pagination.pageSize}
        hasNext={pagination.hasNext}
        hasPrev={pagination.hasPrev}
        onNext={pagination.nextPage}
        onPrev={pagination.prevPage}
      />
    </div>
  );
}
