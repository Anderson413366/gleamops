'use client';

import { useMemo, useEffect, useState } from 'react';
import { DollarSign } from 'lucide-react';
import { cn } from '@gleamops/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { RecurringScheduleRow } from './schedule-list';

interface BudgetOverlayProps {
  rows: RecurringScheduleRow[];
  visibleDates: string[];
  overtimeThreshold?: number;
  overtimeMultiplier?: number;
}

interface StaffPayRate {
  full_name: string;
  pay_rate: number | null;
}

function computeShiftMinutes(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  let minutes = (eh * 60 + em) - (sh * 60 + sm);
  if (minutes <= 0) minutes += 24 * 60;
  return minutes;
}

export function BudgetOverlay({
  rows,
  visibleDates,
  overtimeThreshold = 40,
  overtimeMultiplier = 1.5,
}: BudgetOverlayProps) {
  const [payRates, setPayRates] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    let cancelled = false;

    async function fetchPayRates() {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase
        .from('staff')
        .select('full_name, pay_rate')
        .is('archived_at', null);

      if (!cancelled && data) {
        const map = new Map<string, number>();
        for (const s of data as StaffPayRate[]) {
          if (s.full_name && s.pay_rate) {
            map.set(s.full_name.trim(), s.pay_rate);
          }
        }
        setPayRates(map);
      }
    }

    void fetchPayRates();
    return () => { cancelled = true; };
  }, []);

  const budgetData = useMemo(() => {
    const dateSet = new Set(visibleDates);
    let totalCost = 0;
    let totalHours = 0;
    let overtimeHours = 0;

    // Group by staff to compute weekly hours
    const staffHours = new Map<string, number>();
    const staffCosts = new Map<string, number>();

    for (const row of rows) {
      if (row.staffName === 'Open Shift') continue;
      const shiftMinutes = computeShiftMinutes(row.startTime, row.endTime);
      const daysInRange = row.scheduledDates.filter((d) => dateSet.has(d)).length;
      const hours = (shiftMinutes / 60) * daysInRange;

      const currentHours = staffHours.get(row.staffName) ?? 0;
      staffHours.set(row.staffName, currentHours + hours);
      totalHours += hours;
    }

    for (const [staffName, hours] of staffHours) {
      const rate = payRates.get(staffName) ?? 0;
      if (rate === 0) continue;

      const regularHours = Math.min(hours, overtimeThreshold);
      const otHours = Math.max(0, hours - overtimeThreshold);
      const cost = (regularHours * rate) + (otHours * rate * overtimeMultiplier);

      staffCosts.set(staffName, cost);
      totalCost += cost;
      overtimeHours += otHours;
    }

    return { totalCost, totalHours, overtimeHours, staffCosts, staffHours };
  }, [rows, visibleDates, payRates, overtimeThreshold, overtimeMultiplier]);

  const formatCurrency = (value: number) => `$${value.toFixed(2)}`;

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <DollarSign className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Budget Summary</h3>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-lg font-bold text-foreground">{formatCurrency(budgetData.totalCost)}</p>
          <p className="text-[11px] text-muted-foreground">Total Cost</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-foreground">{budgetData.totalHours.toFixed(1)}h</p>
          <p className="text-[11px] text-muted-foreground">Total Hours</p>
        </div>
        <div className="text-center">
          <p className={cn('text-lg font-bold', budgetData.overtimeHours > 0 ? 'text-destructive' : 'text-foreground')}>
            {budgetData.overtimeHours.toFixed(1)}h
          </p>
          <p className="text-[11px] text-muted-foreground">Overtime ({overtimeMultiplier}x)</p>
        </div>
      </div>

      {budgetData.staffCosts.size > 0 && (
        <div className="space-y-1 pt-2 border-t border-border max-h-40 overflow-y-auto">
          {Array.from(budgetData.staffCosts.entries())
            .sort(([, a], [, b]) => b - a)
            .map(([name, cost]) => {
              const hours = budgetData.staffHours.get(name) ?? 0;
              const isOT = hours > overtimeThreshold;
              return (
                <div key={name} className="flex items-center justify-between text-xs">
                  <span className="text-foreground truncate">{name}</span>
                  <span className={cn('font-mono', isOT && 'text-destructive font-medium')}>
                    {formatCurrency(cost)} ({hours.toFixed(1)}h{isOT ? ' OT' : ''})
                  </span>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
