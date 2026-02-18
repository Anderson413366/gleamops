'use client';

import { useContext } from 'react';
import { NeuroPreferencesContext, useLocalNeuroPreferenceStore } from '@/contexts/neuro-preferences-context';

export function useNeuroPreferences() {
  const context = useContext(NeuroPreferencesContext);
  const fallback = useLocalNeuroPreferenceStore(!context);
  return context ?? fallback;
}
