'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button, CollapsibleCard } from '@gleamops/ui';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { loadTenantSetting, saveTenantSetting } from '@/lib/admin/tenant-settings-storage';

interface ToggleSetting {
  key: string;
  label: string;
  description?: string;
  value: boolean;
}

type SubTab = 'frequently-used' | 'advanced';
type ToggleGroupKey = 'shiftPlanningSettings' | 'shiftPickupSettings' | 'workUnitsSettings';

interface ScheduleSettingsState {
  subTab: SubTab;
  shiftPlanningSettings: ToggleSetting[];
  shiftPickupSettings: ToggleSetting[];
  workUnitsSettings: ToggleSetting[];
}

const SHIFT_PLANNING_OPTIONS: ToggleSetting[] = [
  { key: 'draft_publish', label: 'Enable Draft/Publish Workflow', description: 'Require managers to publish schedules before they are visible to staff', value: true },
  { key: 'task_feature', label: 'Enable Task Feature', description: 'Allow tasks to be attached to shifts', value: false },
  { key: 'pending_leave', label: 'Show Pending Leave on Schedule', description: 'Display pending leave requests as overlays on the schedule grid', value: true },
  { key: 'employee_view_all', label: 'Employees Can View All Schedules', description: 'Allow non-admin users to view all employee schedules', value: false },
  { key: 'remote_sites', label: 'Enable Remote Sites', description: 'Allow shifts to be assigned to remote/secondary sites', value: false },
  { key: 'same_position_shifts', label: 'Allow Same-Position Shifts', description: 'Allow multiple shifts for the same position at the same time', value: true },
  { key: 'on_call', label: 'Enable On-Call Shifts', description: 'Allow creation of on-call shift types', value: false },
  { key: 'coworker_vacations', label: 'Show Co-worker Vacations', description: 'Display co-worker vacation dates when viewing schedule', value: true },
];

const SHIFT_PICKUP_OPTIONS: ToggleSetting[] = [
  { key: 'disable_cross_position', label: 'Disable Cross-Position Trades', description: 'Prevent staff from trading shifts across different positions', value: false },
  { key: 'manager_confirm_trades', label: 'Manager Confirms Trades', description: 'Require manager approval for all shift trades', value: true },
  { key: 'shift_acknowledgment', label: 'Shift Acknowledgment', description: 'Require staff to acknowledge assigned shifts', value: false },
  { key: 'drop_shifts', label: 'Allow Drop Shifts', description: 'Allow staff to drop shifts back to the open pool', value: false },
  { key: 'auto_approve_pickup', label: 'Auto-Approve Shift Pickup', description: 'Automatically approve when staff picks up open shifts', value: false },
  { key: 'partial_pickup', label: 'Allow Partial Pickup', description: 'Allow staff to pick up part of a multi-day shift', value: false },
  { key: 'request_after_declined', label: 'Allow Request After Declined', description: 'Allow staff to re-request a shift after being declined', value: true },
];

const WORK_UNITS_OPTIONS: ToggleSetting[] = [
  { key: 'enable_work_units', label: 'Enable Work Units', description: 'Track work output in units (e.g., floors cleaned, rooms serviced)', value: false },
];

const STORAGE_KEY = 'settings:schedule-settings';

function cloneToggleSettings(source: ToggleSetting[]): ToggleSetting[] {
  return source.map((item) => ({ ...item }));
}

function createDefaultSettings(): ScheduleSettingsState {
  return {
    subTab: 'frequently-used',
    shiftPlanningSettings: cloneToggleSettings(SHIFT_PLANNING_OPTIONS),
    shiftPickupSettings: cloneToggleSettings(SHIFT_PICKUP_OPTIONS),
    workUnitsSettings: cloneToggleSettings(WORK_UNITS_OPTIONS),
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

function normalizeSettings(raw: unknown): ScheduleSettingsState {
  const defaults = createDefaultSettings();
  if (!raw || typeof raw !== 'object') return defaults;

  const incoming = raw as Partial<ScheduleSettingsState>;
  return {
    subTab: incoming.subTab === 'advanced' ? 'advanced' : 'frequently-used',
    shiftPlanningSettings: mergeToggleSettings(defaults.shiftPlanningSettings, incoming.shiftPlanningSettings),
    shiftPickupSettings: mergeToggleSettings(defaults.shiftPickupSettings, incoming.shiftPickupSettings),
    workUnitsSettings: mergeToggleSettings(defaults.workUnitsSettings, incoming.workUnitsSettings),
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

export default function ScheduleSettings() {
  const { tenantId } = useAuth();
  const [settings, setSettings] = useState<ScheduleSettingsState>(() => createDefaultSettings());
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
      toast.success('Schedule settings saved.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save schedule settings.';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {loading && (
        <p className="text-sm text-muted-foreground">Loading schedule settings...</p>
      )}
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center rounded-lg border border-border bg-muted p-0.5">
          <button
            type="button"
            onClick={() => setSettings((prev) => ({ ...prev, subTab: 'frequently-used' }))}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              settings.subTab === 'frequently-used' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Frequently Used
          </button>
          <button
            type="button"
            onClick={() => setSettings((prev) => ({ ...prev, subTab: 'advanced' }))}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              settings.subTab === 'advanced' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Advanced Settings
          </button>
        </div>
        <Button onClick={handleSave} loading={saving} disabled={loading || !isDirty}>
          Save Settings
        </Button>
      </div>

      <CollapsibleCard id="schedule-shift-planning" title="ShiftPlanning Options">
        <div className="divide-y-0">
          {settings.shiftPlanningSettings.map((s) => (
            <SettingsToggle key={s.key} setting={s} onToggle={(key) => toggle('shiftPlanningSettings', key)} />
          ))}
        </div>
      </CollapsibleCard>

      <CollapsibleCard id="schedule-shift-pickup" title="Shift Pickup / Trades / Approvals">
        <div className="divide-y-0">
          {settings.shiftPickupSettings.map((s) => (
            <SettingsToggle key={s.key} setting={s} onToggle={(key) => toggle('shiftPickupSettings', key)} />
          ))}
        </div>
      </CollapsibleCard>

      <CollapsibleCard id="schedule-work-units" title="Work Units">
        <div className="divide-y-0">
          {settings.workUnitsSettings.map((s) => (
            <SettingsToggle key={s.key} setting={s} onToggle={(key) => toggle('workUnitsSettings', key)} />
          ))}
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
