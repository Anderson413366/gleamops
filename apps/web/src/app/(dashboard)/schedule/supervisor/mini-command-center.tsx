'use client';

import { Clock3, MapPinned, Route, TimerReset } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@gleamops/ui';
import type { SupervisorStopView } from './types';

interface MiniCommandCenterProps {
  dateLabel: string;
  stops: SupervisorStopView[];
}

function sumDriveMinutes(stops: SupervisorStopView[]): number {
  return stops.reduce((total, stop) => total + (stop.driveFromPreviousMinutes ?? 0), 0);
}

function nextPendingStop(stops: SupervisorStopView[]): SupervisorStopView | null {
  return stops.find((stop) => !stop.checkOutAt) ?? null;
}

export function MiniCommandCenter({ dateLabel, stops }: MiniCommandCenterProps) {
  const totalStops = stops.length;
  const checkedIn = stops.filter((stop) => !!stop.checkInAt).length;
  const checkedOut = stops.filter((stop) => !!stop.checkOutAt).length;
  const driveMinutes = sumDriveMinutes(stops);
  const nextStop = nextPendingStop(stops);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Supervisor Mini Command Center</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">Route progress for {dateLabel}</p>

        <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
          <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2">
            <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
              <MapPinned className="h-3.5 w-3.5" />
              Stops
            </p>
            <p className="text-lg font-semibold">{totalStops}</p>
          </div>
          <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2">
            <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
              <Clock3 className="h-3.5 w-3.5" />
              Checked In
            </p>
            <p className="text-lg font-semibold">{checkedIn}</p>
          </div>
          <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2">
            <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
              <TimerReset className="h-3.5 w-3.5" />
              Checked Out
            </p>
            <p className="text-lg font-semibold">{checkedOut}</p>
          </div>
          <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2">
            <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
              <Route className="h-3.5 w-3.5" />
              Drive Time
            </p>
            <p className="text-lg font-semibold">{driveMinutes}m</p>
          </div>
        </div>

        <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-sm">
          <p className="text-xs text-muted-foreground">Next Stop</p>
          <p className="font-medium">
            {nextStop
              ? `${nextStop.stopOrder}. ${nextStop.siteCode ? `${nextStop.siteCode} - ` : ''}${nextStop.siteName}`
              : 'All route stops completed'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
