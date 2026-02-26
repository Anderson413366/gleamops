'use client';

import { Badge, Card, CardContent } from '@gleamops/ui';
import type { StaffPosition } from '@gleamops/shared';

const POSITION_COLORS: string[] = [
  '#00c875',
  '#df2f4a',
  '#579bfc',
  '#ffcb00',
  '#9ca3af',
  '#f97316',
  '#14b8a6',
  '#a855f7',
];

export interface PositionTypeCardGridProps {
  rows: StaffPosition[];
  staffCountByPositionId: Record<string, number>;
  onSelect: (row: StaffPosition) => void;
}

function colorForRow(row: StaffPosition, index: number): string {
  const normalizedCode = row.position_code.toUpperCase();
  if (normalizedCode.includes('FLOOR')) return '#00c875';
  if (normalizedCode.includes('RESTROOM')) return '#df2f4a';
  if (normalizedCode.includes('VACUUM')) return '#579bfc';
  if (normalizedCode.includes('UTILITY')) return '#ffcb00';
  if (normalizedCode.includes('PORTER')) return '#9ca3af';
  return POSITION_COLORS[index % POSITION_COLORS.length] ?? '#a1a1aa';
}

export function PositionTypeCardGrid({ rows, staffCountByPositionId, onSelect }: PositionTypeCardGridProps) {
  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          No position types found.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {rows.map((row, index) => {
        const chipColor = colorForRow(row, index);
        return (
          <button
            key={row.id}
            type="button"
            onClick={() => onSelect(row)}
            className="rounded-xl border border-border bg-card text-left transition hover:border-module-accent/50 hover:shadow-sm"
          >
            <div className="flex items-start justify-between gap-3 px-4 pt-4">
              <div>
                <p className="text-sm font-semibold text-foreground">{row.title}</p>
                <p className="mt-1 font-mono text-xs text-muted-foreground">{row.position_code}</p>
              </div>
              <Badge color={row.is_active ? 'green' : 'gray'}>{row.is_active ? 'Active' : 'Inactive'}</Badge>
            </div>

            <div className="px-4 pb-4 pt-3">
              <div className="mb-3 flex items-center gap-2">
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ backgroundColor: chipColor }}
                  aria-hidden="true"
                />
                <span className="text-xs text-muted-foreground">Shift color indicator</span>
              </div>

              <dl className="space-y-1 text-xs">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Department</dt>
                  <dd className="truncate text-foreground">{row.department?.trim() || 'Not set'}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Pay Grade</dt>
                  <dd className="text-foreground">{row.pay_grade?.trim() || 'Not set'}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Assigned Staff</dt>
                  <dd className="text-foreground">{staffCountByPositionId[row.id] ?? 0}</dd>
                </div>
              </dl>
            </div>
          </button>
        );
      })}
    </div>
  );
}
