'use client';

import { Building2, ClipboardList } from 'lucide-react';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@gleamops/ui';
import type { RecurringScheduleRow } from './schedule-list';

interface SiteBlueprintViewProps {
  row: RecurringScheduleRow | null;
  onClear: () => void;
}

function detailValue(value: string | null | undefined) {
  return value && value.trim().length > 0 ? value : 'Not Set';
}

export function SiteBlueprintView({ row, onClear }: SiteBlueprintViewProps) {
  if (!row) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4 text-module-accent" />
            Site Blueprint
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Select a recurring assignment block to view site blueprint details.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="inline-flex items-center gap-2 text-base">
            <ClipboardList className="h-4 w-4 text-module-accent" />
            Site Blueprint
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            {row.siteCode ? `${row.siteCode} - ${row.siteName}` : row.siteName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge color={row.status === 'open' ? 'red' : 'blue'}>{row.status.toUpperCase()}</Badge>
          <Button type="button" variant="secondary" size="sm" onClick={onClear}>
            Clear
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm md:grid-cols-2">
        <div>
          <p className="text-xs text-muted-foreground">Position</p>
          <p className="font-medium">{detailValue(row.positionType)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Shift Window</p>
          <p className="font-medium">{row.startTime} - {row.endTime}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Janitorial Closet</p>
          <p className="font-medium">{detailValue(row.blueprint?.janitorialClosetLocation)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Supply Storage</p>
          <p className="font-medium">{detailValue(row.blueprint?.supplyStorageLocation)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Water Source</p>
          <p className="font-medium">{detailValue(row.blueprint?.waterSourceLocation)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Dumpster</p>
          <p className="font-medium">{detailValue(row.blueprint?.dumpsterLocation)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Security Protocol</p>
          <p className="font-medium whitespace-pre-wrap">{detailValue(row.blueprint?.securityProtocol)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Entry Instructions</p>
          <p className="font-medium whitespace-pre-wrap">{detailValue(row.blueprint?.entryInstructions)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Parking Instructions</p>
          <p className="font-medium whitespace-pre-wrap">{detailValue(row.blueprint?.parkingInstructions)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Access Notes</p>
          <p className="font-medium whitespace-pre-wrap">{detailValue(row.blueprint?.accessNotes)}</p>
        </div>
      </CardContent>
    </Card>
  );
}
