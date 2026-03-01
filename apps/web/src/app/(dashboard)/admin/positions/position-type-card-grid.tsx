'use client';

import { Badge, Card, CardContent } from '@gleamops/ui';
import type { StaffPosition } from '@gleamops/shared';

const TOKEN_TO_HEX: Record<string, string> = {
  green: '#00c875',
  red: '#df2f4a',
  blue: '#579bfc',
  yellow: '#ffcb00',
  pink: '#ec4899',
  purple: '#a855f7',
  indigo: '#6366f1',
  orange: '#f97316',
  teal: '#14b8a6',
  emerald: '#10b981',
  amber: '#f59e0b',
  cyan: '#06b6d4',
  gray: '#9ca3af',
  slate: '#94a3b8',
};

export interface PositionTypeCardGridProps {
  rows: StaffPosition[];
  staffCountByPositionId: Record<string, number>;
  onSelect: (row: StaffPosition) => void;
}

function colorForRow(row: StaffPosition): string {
  return TOKEN_TO_HEX[row.color_token] ?? '#94a3b8';
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
      {rows.map((row) => {
        const chipColor = colorForRow(row);
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
