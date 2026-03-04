'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button, CollapsibleCard, Select } from '@gleamops/ui';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { loadTenantSetting, saveTenantSetting } from '@/lib/admin/tenant-settings-storage';

interface ToggleSetting {
  key: string;
  label: string;
  description?: string;
  value: boolean;
}

type ToggleGroupKey = 'timeClockSettings' | 'timesheetSettings';

interface TimeClockSettingsState {
  timeClockSettings: ToggleSetting[];
  timesheetSettings: ToggleSetting[];
  rounding: string;
  lateReminders: string[];
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

const ROUNDING_OPTIONS = ['none', '5', '10', '15', '30'] as const;
const STORAGE_KEY = 'settings:time-clock-settings';

function cloneToggleSettings(source: ToggleSetting[]): ToggleSetting[] {
  return source.map((item) => ({ ...item }));
}

function createDefaultSettings(): TimeClockSettingsState {
  return {
    timeClockSettings: cloneToggleSettings(TIME_CLOCK_SETTINGS),
    timesheetSettings: cloneToggleSettings(TIMESHEET_SETTINGS),
    rounding: 'none',
    lateReminders: ['15 minutes late'],
  };
}

function mergeToggleSettings(defaults: ToggleSetting[], incoming: unknown): ToggleSetting[] {
  if (!Array.isArray(incoming)) return defaults;

  const incomingMap = new Map<string, boolean>();
  incoming.forEach((item) => {
    if (!item || typeof item !== 'object') return;
    const row = item as { key?: unknown; value?: unknown };
    if (typeof row.key === 'string' && typeof row.value === 'boolean') {
      incomingMap.set(row.key, row.value);
    }
  });

  return defaults.map((item) => ({
    ...item,
    value: incomingMap.has(item.key) ? Boolean(incomingMap.get(item.key)) : item.value,
  }));
}

function normalizeSettings(raw: unknown): TimeClockSettingsState {
  const defaults = createDefaultSettings();
  if (!raw || typeof raw !== 'object') return defaults;

  const incoming = raw as Partial<TimeClockSettingsState>;
  const reminders = Array.isArray(incoming.lateReminders)
    ? incoming.lateReminders.filter(
        (value): value is string => typeof value === 'string' && NOTIFICATION_OPTIONS.includes(value),
      )
    : [];
  const rounding = typeof incoming.rounding === 'string' && ROUNDING_OPTIONS.includes(incoming.rounding as typeof ROUNDING_OPTIONS[number])
    ? incoming.rounding
    : defaults.rounding;

  return {
    timeClockSettings: mergeToggleSettings(defaults.timeClockSettings, incoming.timeClockSettings),
    timesheetSettings: mergeToggleSettings(defaults.timesheetSettings, incoming.timesheetSettings),
    rounding,
    lateReminders: Array.isArray(incoming.lateReminders) ? reminders : defaults.lateReminders,
  };
}

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
        role="switch"
        aria-checked={setting.value}
        aria-label={setting.label}
        onClick={() => onToggle(setting.key)}
        className={`relative ml-4 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
          setting.value ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
        }`}
      >
        <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${setting.value ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );
}

export default function TimeClockSettings() {
  const { tenantId } = useAuth();
  const [settings, setSettings] = useState<TimeClockSettingsState>(() => createDefaultSettings());
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState(() => JSON.stringify(createDefaultSettings()));

  useEffect(() => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    const loaded = loadTenantSetting<unknown>(tenantId, STORAGE_KEY, createDefaultSettings());
    const normalized = normalizeSettings(loaded);
    setSettings(normalized);
    setLastSavedSnapshot(JSON.stringify(normalized));
    setLoading(false);
  }, [tenantId]);

  const isDirty = useMemo(
    () => JSON.stringify(settings) !== lastSavedSnapshot,
    [settings, lastSavedSnapshot],
  );

  const toggle = (group: ToggleGroupKey, key: string) => {
    setSettings((prev) => ({
      ...prev,
      [group]: prev[group].map((item) => (item.key === key ? { ...item, value: !item.value } : item)),
    }));
  };

  const handleSave = () => {
    if (!tenantId) {
      toast.error('Tenant context is missing.');
      return;
    }

    setSaving(true);
    try {
      saveTenantSetting(tenantId, STORAGE_KEY, settings);
      const nextSnapshot = JSON.stringify(settings);
      setLastSavedSnapshot(nextSnapshot);
      toast.success('Time clock settings saved.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save time clock settings.';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {loading && (
        <p className="text-sm text-muted-foreground">Loading time clock settings...</p>
      )}
      <div className="flex items-center justify-end">
        <Button onClick={handleSave} loading={saving} disabled={loading || !isDirty}>
          Save Settings
        </Button>
      </div>

      <CollapsibleCard id="timeclock-settings" title="Time Clock Settings">
        <div className="divide-y-0">
          {settings.timeClockSettings.map((s) => (
            <SettingsToggle key={s.key} setting={s} onToggle={(key) => toggle('timeClockSettings', key)} />
          ))}
        </div>
      </CollapsibleCard>

      <CollapsibleCard id="timeclock-rounding" title="Rounding">
        <div className="max-w-xs">
          <Select
            label="Round time entries to nearest"
            value={settings.rounding}
            onChange={(e) => setSettings((prev) => ({ ...prev, rounding: e.target.value }))}
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
          {settings.timesheetSettings.map((s) => (
            <SettingsToggle key={s.key} setting={s} onToggle={(key) => toggle('timesheetSettings', key)} />
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
                  checked={settings.lateReminders.includes(opt)}
                  onChange={() => {
                    setSettings((prev) => ({
                      ...prev,
                      lateReminders: prev.lateReminders.includes(opt)
                        ? prev.lateReminders.filter((item) => item !== opt)
                        : [...prev.lateReminders, opt],
                    }));
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
        <Button onClick={handleSave} loading={saving} disabled={loading || !isDirty}>
          Save Settings
        </Button>
      </div>
    </div>
  );
}
