'use client';

import { useNeuroPreferences } from '@/hooks/use-neuro-preferences';

// Compatibility alias retained for existing imports.
export function useUiPreferences() {
  return useNeuroPreferences();
}
