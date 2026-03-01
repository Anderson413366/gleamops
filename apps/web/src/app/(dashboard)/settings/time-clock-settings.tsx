'use client';

import { useState } from 'react';
import { Button, CollapsibleCard, Select } from '@gleamops/ui';

interface ToggleSetting {
  key: string;
  label: string;
  description?: string;
  value: boolean;
}

const TIME_CLOCK_SETTINGS: ToggleSetting[] = [
  { key: 'module_enabled', label: 'Enable Time Clock Module', description: 'Allow staff to clock in/out from the app', value: true },
  { key: 'webcam_capture', label: 'Require Webcam Photo', description: 'Capture a photo when clocking in/out for verification', value: false },
  { key: 'gps_tracking', label: 'Enable GPS Tracking', description: 'Track GPS location during clock in/out', value: true },
  { key: 'gps_fallback', label: 'GPS Fallback to IP', description: 'Use IP-based location when GPS is unavailable', value: true },
  { key: 'restrict_clock', label: 'Restrict Clock to Geofence', description: 'Only allow clock in/out within site geofence', value: false },
  { key: 'enable_breaks', label: 'Enable Break Tracking', description: 'Allow staff to log breaks during shifts', value: true },
  { key: 'auto_clock_out', label: 'Auto-Clock Out', description: 'Automatically clock out staff after a set number of hours', value: false },
  { key: 'timeclock_tips', label: 'Show Time Clock Tips', description: 'Display helpful tips on the time clock screen', value: true },
];

const TIMESHEET_SETTINGS: ToggleSetting[] = [
  { key: 'import_timesheets', label: 'Allow Timesheet Import', description: 'Enable importing timesheets from CSV/Excel', value: false },
  { key: 'manual_add', label: 'Allow Manual Time Entry', description: 'Allow managers to manually add time entries', value: true },
];

const NOTIFICATION_OPTIONS = [
  '5 minutes late',
  '10 minutes late',
  '15 minutes late',
  '30 minutes late',
  '1 hour late',
];

function SettingsToggle({ setting, onToggle }: { setting: ToggleSetting; onToggle: (key: string) => void }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{setting.label}</p>
        {setting.description && (
          <p className="text-xs text-muted-foreground mt-0.5">{setting.description}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onToggle(setting.key)}
        className={`relative ml-4 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
          setting.value ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
        }`}
      >
        <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${setting.value ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );
}

export default function TimeClockSettings() {
  const [timeClockSettings, setTimeClockSettings] = useState(TIME_CLOCK_SETTINGS);
  const [timesheetSettings, setTimesheetSettings] = useState(TIMESHEET_SETTINGS);
  const [rounding, setRounding] = useState('none');
  const [lateReminders, setLateReminders] = useState<string[]>(['15 minutes late']);

  const toggle = (key: string, setFn: React.Dispatch<React.SetStateAction<ToggleSetting[]>>) => {
    setFn((prev) => prev.map((s) => (s.key === key ? { ...s, value: !s.value } : s)));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button>Save Settings</Button>
      </div>

      <CollapsibleCard id="timeclock-settings" title="Time Clock Settings">
        <div className="divide-y-0">
          {timeClockSettings.map((s) => (
            <SettingsToggle key={s.key} setting={s} onToggle={(key) => toggle(key, setTimeClockSettings)} />
          ))}
        </div>
      </CollapsibleCard>

      <CollapsibleCard id="timeclock-rounding" title="Rounding">
        <div className="max-w-xs">
          <Select
            label="Round time entries to nearest"
            value={rounding}
            onChange={(e) => setRounding(e.target.value)}
            options={[
              { value: 'none', label: "Don't round" },
              { value: '5', label: '5 minutes' },
              { value: '10', label: '10 minutes' },
              { value: '15', label: '15 minutes' },
              { value: '30', label: '30 minutes' },
            ]}
          />
        </div>
      </CollapsibleCard>

      <CollapsibleCard id="timeclock-timesheets" title="Time Sheets">
        <div className="divide-y-0">
          {timesheetSettings.map((s) => (
            <SettingsToggle key={s.key} setting={s} onToggle={(key) => toggle(key, setTimesheetSettings)} />
          ))}
        </div>
      </CollapsibleCard>

      <CollapsibleCard id="timeclock-notifications" title="Notifications">
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Late Reminder Intervals</p>
          <p className="text-xs text-muted-foreground">Select when to send late-for-work notifications</p>
          <div className="space-y-1.5 mt-2">
            {NOTIFICATION_OPTIONS.map((opt) => (
              <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={lateReminders.includes(opt)}
                  onChange={() => {
                    setLateReminders((prev) =>
                      prev.includes(opt) ? prev.filter((r) => r !== opt) : [...prev, opt],
                    );
                  }}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-foreground">{opt}</span>
              </label>
            ))}
          </div>
        </div>
      </CollapsibleCard>

      <div className="flex justify-end">
        <Button>Save Settings</Button>
      </div>
    </div>
  );
}
