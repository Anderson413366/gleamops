export type EnforcementMode = 'warn' | 'block' | 'override_required';

export interface SchedulePolicy {
  id: string;
  tenant_id: string;
  site_id: string | null;
  min_rest_hours: number;
  max_weekly_hours: number;
  overtime_warning_at_hours: number;
  rest_enforcement: EnforcementMode;
  weekly_hours_enforcement: EnforcementMode;
  subcontractor_capacity_enforcement: EnforcementMode;
  availability_enforcement: EnforcementMode;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  version_etag: string;
}

export interface PolicyResolution {
  severity: 'INFO' | 'WARNING' | 'ERROR';
  is_blocking: boolean;
  requires_override: boolean;
}

export function resolvePolicy(enforcement: EnforcementMode): PolicyResolution {
  if (enforcement === 'warn') {
    return { severity: 'WARNING', is_blocking: false, requires_override: false };
  }
  if (enforcement === 'block') {
    return { severity: 'ERROR', is_blocking: true, requires_override: false };
  }
  return { severity: 'ERROR', is_blocking: true, requires_override: true };
}
