'use client';

import { CheckCircle2 } from 'lucide-react';
import { Card, CardContent, Button } from '@gleamops/ui';
import type { PlanningTicket } from './planning-card';

interface HandoffSummaryProps {
  tickets: PlanningTicket[];
  selectedDate: string;
  onPublish?: () => void;
  busy?: boolean;
}

export function HandoffSummary({
  tickets,
  selectedDate,
  onPublish,
  busy = false,
}: HandoffSummaryProps) {
  const totalTickets = tickets.length;
  const readyCount = tickets.filter((t) => t.planning_status === 'READY').length;
  const allReady = totalTickets > 0 && readyCount === totalTickets;

  const uniqueSites = new Set(tickets.map((t) => t.site?.id).filter(Boolean)).size;
  const uniqueStaff = new Set(
    tickets.flatMap((t) =>
      (t.assignments ?? [])
        .filter((a) => !a.assignment_status || a.assignment_status === 'ASSIGNED')
        .map((a) => a.staff_id)
        .filter(Boolean)
    )
  ).size;

  const gapCount = tickets.filter((t) => {
    const active = (t.assignments ?? []).filter(
      (a) => !a.assignment_status || a.assignment_status === 'ASSIGNED'
    );
    return active.length < (t.required_staff_count ?? 1);
  }).length;

  if (!allReady) return null;

  const dateLabel = new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Card className="border-success/40 bg-success/5">
      <CardContent className="py-6 text-center space-y-3">
        <CheckCircle2 className="h-10 w-10 text-success mx-auto" />
        <h3 className="text-lg font-semibold text-foreground">
          {dateLabel} is Ready
        </h3>
        <p className="text-sm text-muted-foreground">
          {totalTickets} tickets · {uniqueSites} sites · {uniqueStaff} staff assigned
          {gapCount === 0
            ? ' · 0 coverage gaps'
            : ` · ${gapCount} coverage gap${gapCount > 1 ? 's' : ''}`}
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          {onPublish && (
            <Button onClick={onPublish} disabled={busy}>
              Publish Schedule
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
