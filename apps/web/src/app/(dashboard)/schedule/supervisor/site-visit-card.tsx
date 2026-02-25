'use client';

import { Clock3, Lock, MapPin, Navigation, Route } from 'lucide-react';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@gleamops/ui';
import type { SupervisorStopView } from './types';

interface SiteVisitCardProps {
  stop: SupervisorStopView;
  saving: boolean;
  onCheckIn: (stop: SupervisorStopView) => void;
  onCheckOut: (stop: SupervisorStopView) => void;
}

function toneForStop(stop: SupervisorStopView): 'blue' | 'green' | 'gray' {
  if (stop.checkOutAt) return 'green';
  if (stop.checkInAt) return 'blue';
  return 'gray';
}

function statusLabel(stop: SupervisorStopView): string {
  if (stop.checkOutAt) return 'Checked Out';
  if (stop.checkInAt) return 'On Site';
  return 'Pending';
}

function formatTime(value: string | null) {
  if (!value) return 'Not Set';
  const [hourRaw, minuteRaw] = value.split(':');
  const hour = Number(hourRaw);
  if (!Number.isFinite(hour)) return value;
  const minute = minuteRaw ?? '00';
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minute} ${suffix}`;
}

function formatDateTime(value: string | null) {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not recorded';
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function SiteVisitCard({ stop, saving, onCheckIn, onCheckOut }: SiteVisitCardProps) {
  const canCheckIn = !stop.checkInAt;
  const canCheckOut = !!stop.checkInAt && !stop.checkOutAt;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">
              Stop {stop.stopOrder}: {stop.siteCode ? `${stop.siteCode} - ${stop.siteName}` : stop.siteName}
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              {stop.jobCode ? `Job ${stop.jobCode}` : 'No job code'} · {formatTime(stop.startTime)} - {formatTime(stop.endTime)}
            </p>
          </div>
          <Badge color={toneForStop(stop)}>{statusLabel(stop)}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex flex-wrap items-center gap-3 text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {stop.siteAddress || 'Address not available'}
          </span>
          <span className="inline-flex items-center gap-1">
            <Route className="h-3.5 w-3.5" />
            {stop.estimatedTravelMinutes != null ? `${stop.estimatedTravelMinutes}m planned travel` : 'Travel not estimated'}
          </span>
          {stop.driveFromPreviousMinutes != null ? (
            <span className="inline-flex items-center gap-1">
              <Navigation className="h-3.5 w-3.5" />
              {stop.driveFromPreviousMinutes}m actual drive
            </span>
          ) : null}
          {stop.isLocked ? (
            <span className="inline-flex items-center gap-1">
              <Lock className="h-3.5 w-3.5" />
              Locked stop
            </span>
          ) : null}
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2">
            <p className="text-xs text-muted-foreground">Check In</p>
            <p className="font-medium">{formatDateTime(stop.checkInAt)}</p>
          </div>
          <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2">
            <p className="text-xs text-muted-foreground">Check Out</p>
            <p className="font-medium">{formatDateTime(stop.checkOutAt)}</p>
          </div>
        </div>

        <div>
          <p className="text-xs text-muted-foreground">Assigned Staff Tonight</p>
          <p className="font-medium">
            {stop.assignedStaff.length ? stop.assignedStaff.join(', ') : 'No assigned staff found for this site today'}
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            onClick={() => onCheckIn(stop)}
            disabled={!canCheckIn}
            loading={saving && canCheckIn}
          >
            <Clock3 className="h-4 w-4" />
            Check In
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => onCheckOut(stop)}
            disabled={!canCheckOut}
            loading={saving && canCheckOut}
          >
            <Clock3 className="h-4 w-4" />
            Check Out
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
