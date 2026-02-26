'use client';

import { Camera, CarFront, TriangleAlert } from 'lucide-react';
import { Badge } from '@gleamops/ui';
import type { NightBridgeSummaryItem } from '@gleamops/shared';

interface ShiftSummaryCardProps {
  item: NightBridgeSummaryItem;
  onSelect: (routeId: string) => void;
}

function badgeColor(status: NightBridgeSummaryItem['shift_review_status']) {
  switch (status) {
    case 'REVIEWED':
      return 'green';
    case 'NEEDS_FOLLOWUP':
      return 'red';
    default:
      return 'yellow';
  }
}

function cardTone(urgency: NightBridgeSummaryItem['urgency']) {
  switch (urgency) {
    case 'GREEN':
      return 'border-success/40 bg-success/5';
    case 'YELLOW':
      return 'border-warning/40 bg-warning/10';
    case 'RED':
      return 'border-destructive/40 bg-destructive/5';
    default:
      return 'border-border bg-card';
  }
}

function formatMileage(start: number | null, end: number | null) {
  if (start == null || end == null) return 'Mileage: N/A';
  return `Mileage: ${start.toLocaleString()} -> ${end.toLocaleString()} = ${(end - start).toLocaleString()} miles`;
}

export function ShiftSummaryCard({ item, onSelect }: ShiftSummaryCardProps) {
  const done = item.stops_completed;
  const total = item.stops_total;
  const skipped = item.stops_skipped;
  const issues = item.issues_count;

  return (
    <button
      type="button"
      onClick={() => onSelect(item.route_id)}
      className={`w-full rounded-lg border p-4 text-left shadow-sm transition-all duration-200 ease-in-out hover:shadow-md ${cardTone(item.urgency)}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-foreground">
            {item.floater_name ?? item.floater_code ?? 'Unassigned floater'}
          </p>
          <p className="text-xs text-muted-foreground">
            {(item.vehicle_name ?? item.vehicle_code ?? 'No vehicle')} • {new Date(`${item.route_date}T00:00:00`).toLocaleDateString()}
          </p>
        </div>
        <Badge color={badgeColor(item.shift_review_status)}>{item.shift_review_status}</Badge>
      </div>

      <div className="mt-4 space-y-2 text-sm text-foreground">
        <p>
          {done}/{total} stops
          {skipped > 0 ? ` (${skipped} skipped)` : ''}
        </p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Camera className="h-3.5 w-3.5" />
          <span>{item.photos_uploaded} photos</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <CarFront className="h-3.5 w-3.5" />
          <span>{formatMileage(item.mileage_start, item.mileage_end)}</span>
        </div>
      </div>

      {issues > 0 ? (
        <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-warning/20 px-2.5 py-1 text-xs font-semibold text-warning">
          <TriangleAlert className="h-3.5 w-3.5" />
          {issues} issue{issues === 1 ? '' : 's'}
        </div>
      ) : null}
    </button>
  );
}
