'use client';

import { Info } from 'lucide-react';
import { Input, Select, CollapsibleCard } from '@gleamops/ui';
import {
  DAYS_OF_WEEK,
  TIME_OPTIONS,
  BREAK_OPTIONS,
  TRAVEL_OPTIONS,
} from '@gleamops/shared';
import type { DayOfWeekCode } from '@gleamops/shared';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface ServiceWindow {
  start_time: string;
  break_minutes: number;
  travel_minutes: number;
}

export interface ScheduleStepProps {
  selectedDays: DayOfWeekCode[];
  onSelectedDaysChange: (days: DayOfWeekCode[]) => void;
  serviceWindow: ServiceWindow;
  onServiceWindowChange: (window: ServiceWindow) => void;
  visitsPerDay: number;
  onVisitsPerDayChange: (v: number) => void;
  hoursPerShift: number;
  onHoursPerShiftChange: (v: number) => void;
  leadRequired: boolean;
  onLeadRequiredChange: (v: boolean) => void;
  supervisorHoursWeek: number;
  onSupervisorHoursWeekChange: (v: number) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function ScheduleStep({
  selectedDays,
  onSelectedDaysChange,
  serviceWindow,
  onServiceWindowChange,
  visitsPerDay,
  onVisitsPerDayChange,
  hoursPerShift,
  onHoursPerShiftChange,
  leadRequired,
  onLeadRequiredChange,
  supervisorHoursWeek,
  onSupervisorHoursWeekChange,
}: ScheduleStepProps) {
  const toggleDay = (code: DayOfWeekCode) => {
    const next = selectedDays.includes(code)
      ? selectedDays.filter((d) => d !== code)
      : [...selectedDays, code];
    onSelectedDaysChange(next);
  };

  const setWindow = (patch: Partial<ServiceWindow>) =>
    onServiceWindowChange({ ...serviceWindow, ...patch });

  const isNightShift =
    serviceWindow.start_time >= '18:00' || serviceWindow.start_time <= '05:30';

  return (
    <div className="space-y-4">
      {/* Day Picker — 7 circular toggle buttons */}
      <div>
        <p className="text-sm font-medium text-foreground mb-3">Service Days</p>
        <div className="flex gap-2">
          {DAYS_OF_WEEK.map((day) => {
            const isOn = selectedDays.includes(day.code);
            return (
              <button
                key={day.code}
                type="button"
                onClick={() => toggleDay(day.code)}
                title={day.full}
                className={`h-10 w-10 rounded-full text-sm font-medium transition-all duration-200 ease-in-out
                  ${isOn
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
              >
                {day.label}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {selectedDays.length} day{selectedDays.length !== 1 ? 's' : ''}/week
        </p>
      </div>

      {/* Service Window */}
      <CollapsibleCard
        id="bid-service-window"
        title="Service Window"
        description="When cleaning takes place"
        defaultOpen
      >
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <Select
              label="Start Time"
              value={serviceWindow.start_time}
              onChange={(e) => setWindow({ start_time: e.target.value })}
              options={TIME_OPTIONS.map((t) => ({ value: t.value, label: t.label }))}
            />
            <Select
              label="Break"
              value={String(serviceWindow.break_minutes)}
              onChange={(e) => setWindow({ break_minutes: Number(e.target.value) })}
              options={BREAK_OPTIONS.map((b) => ({ value: String(b.value), label: b.label }))}
            />
            <Select
              label="Travel"
              value={String(serviceWindow.travel_minutes)}
              onChange={(e) => setWindow({ travel_minutes: Number(e.target.value) })}
              options={TRAVEL_OPTIONS.map((t) => ({ value: String(t.value), label: t.label }))}
            />
          </div>

          {/* Night shift hint */}
          {isNightShift && (
            <div className="flex items-center gap-2 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 px-3 py-2">
              <Info className="h-3.5 w-3.5 text-blue-500 shrink-0" />
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Evening/Night shift — shift differential may apply
              </p>
            </div>
          )}
        </div>
      </CollapsibleCard>

      {/* Visits + Hours */}
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Visits per Day"
          type="number"
          value={visitsPerDay}
          onChange={(e) => onVisitsPerDayChange(Number(e.target.value))}
        />
        <Input
          label="Hours per Shift"
          type="number"
          value={hoursPerShift}
          onChange={(e) => onHoursPerShiftChange(Number(e.target.value))}
        />
      </div>

      {/* Lead Cleaner */}
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={leadRequired}
          onChange={(e) => onLeadRequiredChange(e.target.checked)}
          className="rounded border-border"
        />
        <span className="font-medium">Lead cleaner required</span>
      </label>
      {leadRequired && (
        <Input
          label="Supervisor Hours / Week"
          type="number"
          value={supervisorHoursWeek}
          onChange={(e) => onSupervisorHoursWeekChange(Number(e.target.value))}
        />
      )}
    </div>
  );
}
