import type { EnforcementMode, PolicyResolution } from '@gleamops/shared';

export function evaluateEnforcementMode(mode: EnforcementMode): PolicyResolution {
  if (mode === 'warn') {
    return { severity: 'WARNING', is_blocking: false, requires_override: false };
  }
  if (mode === 'block') {
    return { severity: 'ERROR', is_blocking: true, requires_override: false };
  }
  return { severity: 'ERROR', is_blocking: true, requires_override: true };
}
