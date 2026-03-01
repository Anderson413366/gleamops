'use client';

import { Clock } from 'lucide-react';
import { Input, Card, CardContent, CardHeader, CardTitle } from '@gleamops/ui';
import type { DayPorterConfig } from '@gleamops/cleanflow';
import { calculateDayPorter } from '@gleamops/cleanflow';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface DayPorterStepProps {
  config: DayPorterConfig;
  onChange: (config: DayPorterConfig) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function DayPorterStep({ config, onChange }: DayPorterStepProps) {
  const set = (patch: Partial<DayPorterConfig>) => onChange({ ...config, ...patch });
  const result = config.enabled ? calculateDayPorter(config) : null;
  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <CardTitle>Day Porter Add-On</CardTitle>
        </div>
        <p className="text-xs text-muted-foreground">
          Optional daytime porter presence. Adds to labor cost.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) => set({ enabled: e.target.checked })}
            className="rounded border-border"
          />
          <span className="font-medium">Enable day porter</span>
        </label>

        {config.enabled && (
          <>
            <div className="grid grid-cols-3 gap-3">
              <Input
                label="Days/week"
                type="number"
                value={config.days_per_week}
                onChange={(e) => set({ days_per_week: Number(e.target.value) })}
              />
              <Input
                label="Hours/day"
                type="number"
                value={config.hours_per_day}
                onChange={(e) => set({ hours_per_day: Number(e.target.value) })}
              />
              <Input
                label="Rate ($/hr)"
                type="number"
                value={config.hourly_rate}
                onChange={(e) => set({ hourly_rate: Number(e.target.value) })}
              />
            </div>

            {result && result.monthly_cost > 0 && (
              <div className="rounded-lg bg-muted/50 p-3 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[11px] text-muted-foreground">Monthly Hours</p>
                  <p className="text-sm font-bold">{result.monthly_hours.toFixed(1)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Monthly Cost</p>
                  <p className="text-sm font-bold">{fmt(result.monthly_cost)}</p>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
