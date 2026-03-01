'use client';

import { useState } from 'react';
import { Button, CollapsibleCard } from '@gleamops/ui';

interface ToggleSetting {
  key: string;
  label: string;
  description?: string;
  value: boolean;
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

export default function ScheduleSettings() {
  const [subTab, setSubTab] = useState<'frequently-used' | 'advanced'>('frequently-used');
  const [shiftPlanningSettings, setShiftPlanningSettings] = useState(SHIFT_PLANNING_OPTIONS);
  const [shiftPickupSettings, setShiftPickupSettings] = useState(SHIFT_PICKUP_OPTIONS);
  const [workUnitsSettings, setWorkUnitsSettings] = useState(WORK_UNITS_OPTIONS);

  const toggle = (key: string, setFn: React.Dispatch<React.SetStateAction<ToggleSetting[]>>) => {
    setFn((prev) => prev.map((s) => (s.key === key ? { ...s, value: !s.value } : s)));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center rounded-lg border border-border bg-muted p-0.5">
          <button
            type="button"
            onClick={() => setSubTab('frequently-used')}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              subTab === 'frequently-used' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Frequently Used
          </button>
          <button
            type="button"
            onClick={() => setSubTab('advanced')}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              subTab === 'advanced' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Advanced Settings
          </button>
        </div>
        <Button>Save Settings</Button>
      </div>

      <CollapsibleCard id="schedule-shift-planning" title="ShiftPlanning Options">
        <div className="divide-y-0">
          {shiftPlanningSettings.map((s) => (
            <SettingsToggle key={s.key} setting={s} onToggle={(key) => toggle(key, setShiftPlanningSettings)} />
          ))}
        </div>
      </CollapsibleCard>

      <CollapsibleCard id="schedule-shift-pickup" title="Shift Pickup / Trades / Approvals">
        <div className="divide-y-0">
          {shiftPickupSettings.map((s) => (
            <SettingsToggle key={s.key} setting={s} onToggle={(key) => toggle(key, setShiftPickupSettings)} />
          ))}
        </div>
      </CollapsibleCard>

      <CollapsibleCard id="schedule-work-units" title="Work Units">
        <div className="divide-y-0">
          {workUnitsSettings.map((s) => (
            <SettingsToggle key={s.key} setting={s} onToggle={(key) => toggle(key, setWorkUnitsSettings)} />
          ))}
        </div>
      </CollapsibleCard>

      <div className="flex justify-end">
        <Button>Save Settings</Button>
      </div>
    </div>
  );
}
