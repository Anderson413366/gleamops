'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Select, Textarea } from '@gleamops/ui';
import { useAuth } from '@/hooks/use-auth';
import { loadTenantSetting, saveTenantSetting } from '@/lib/admin/tenant-settings-storage';

interface ScheduleSettingsState {
  cadenceWeeks: '1' | '2' | '3' | '4';
  rolloverDay: 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
  publishDeadlineDay: 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
  publishDeadlineTime: string;
  maxHoursPerWeek: number;
  breakRequiredAfterHours: number;
  breakMinutes: number;
  coverageMinimumPerShift: number;
  holidayCalendar: string;
}

const STORAGE_KEY = 'admin:schedule-settings';

const DEFAULT_SETTINGS: ScheduleSettingsState = {
  cadenceWeeks: '2',
  rolloverDay: 'WEDNESDAY',
  publishDeadlineDay: 'THURSDAY',
  publishDeadlineTime: '17:00',
  maxHoursPerWeek: 40,
  breakRequiredAfterHours: 6,
  breakMinutes: 30,
  coverageMinimumPerShift: 1,
  holidayCalendar: '',
};

const WEEKDAY_OPTIONS = [
  { value: 'MONDAY', label: 'Monday' },
  { value: 'TUESDAY', label: 'Tuesday' },
  { value: 'WEDNESDAY', label: 'Wednesday' },
  { value: 'THURSDAY', label: 'Thursday' },
  { value: 'FRIDAY', label: 'Friday' },
  { value: 'SATURDAY', label: 'Saturday' },
  { value: 'SUNDAY', label: 'Sunday' },
] as const;

export default function ScheduleSettings() {
  const { tenantId } = useAuth();
  const [values, setValues] = useState<ScheduleSettingsState>(DEFAULT_SETTINGS);

  useEffect(() => {
    if (!tenantId) return;
    setValues(loadTenantSetting(tenantId, STORAGE_KEY, DEFAULT_SETTINGS));
  }, [tenantId]);

  const totalHolidayLines = useMemo(() => {
    if (!values.holidayCalendar.trim()) return 0;
    return values.holidayCalendar.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).length;
  }, [values.holidayCalendar]);

  const setNumber = (field: keyof ScheduleSettingsState, nextValue: string) => {
    const parsed = Number(nextValue);
    setValues((prev) => ({
      ...prev,
      [field]: Number.isFinite(parsed) ? parsed : 0,
    }));
  };

  const handleSave = () => {
    if (!tenantId) {
      toast.error('Tenant context is missing.');
      return;
    }
    saveTenantSetting(tenantId, STORAGE_KEY, values);
    toast.success('Schedule settings saved.');
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            Schedule Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Select
            label="Planning Cadence"
            value={values.cadenceWeeks}
            onChange={(event) => setValues((prev) => ({ ...prev, cadenceWeeks: event.target.value as ScheduleSettingsState['cadenceWeeks'] }))}
            options={[
              { value: '1', label: '1 week' },
              { value: '2', label: '2 weeks' },
              { value: '3', label: '3 weeks' },
              { value: '4', label: '4 weeks' },
            ]}
          />

          <Select
            label="Rollover Day"
            value={values.rolloverDay}
            onChange={(event) => setValues((prev) => ({ ...prev, rolloverDay: event.target.value as ScheduleSettingsState['rolloverDay'] }))}
            options={[...WEEKDAY_OPTIONS]}
          />

          <Select
            label="Publish Deadline Day"
            value={values.publishDeadlineDay}
            onChange={(event) => setValues((prev) => ({ ...prev, publishDeadlineDay: event.target.value as ScheduleSettingsState['publishDeadlineDay'] }))}
            options={[...WEEKDAY_OPTIONS]}
          />

          <Input
            label="Publish Deadline Time"
            type="time"
            value={values.publishDeadlineTime}
            onChange={(event) => setValues((prev) => ({ ...prev, publishDeadlineTime: event.target.value }))}
          />

          <Input
            label="Max Hours / Week"
            type="number"
            min={1}
            max={80}
            value={String(values.maxHoursPerWeek)}
            onChange={(event) => setNumber('maxHoursPerWeek', event.target.value)}
          />

          <Input
            label="Coverage Minimum / Shift"
            type="number"
            min={1}
            max={50}
            value={String(values.coverageMinimumPerShift)}
            onChange={(event) => setNumber('coverageMinimumPerShift', event.target.value)}
          />

          <Input
            label="Break Required After (hours)"
            type="number"
            min={1}
            max={16}
            value={String(values.breakRequiredAfterHours)}
            onChange={(event) => setNumber('breakRequiredAfterHours', event.target.value)}
          />

          <Input
            label="Break Minutes"
            type="number"
            min={0}
            max={120}
            value={String(values.breakMinutes)}
            onChange={(event) => setNumber('breakMinutes', event.target.value)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Holiday Calendar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Textarea
            label="One holiday per line (example: 2026-12-25 Christmas Day)"
            value={values.holidayCalendar}
            onChange={(event) => setValues((prev) => ({ ...prev, holidayCalendar: event.target.value }))}
            rows={6}
          />
          <p className="text-xs text-muted-foreground">{totalHolidayLines} holiday entries configured.</p>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave}>
          <Save className="h-4 w-4" />
          Save Schedule Settings
        </Button>
      </div>
    </div>
  );
}
