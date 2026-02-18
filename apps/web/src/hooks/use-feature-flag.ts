'use client';

import { useMemo } from 'react';
import {
  isFeatureEnabled,
  type FeatureDomain,
} from '@gleamops/shared';

/**
 * Check if a single feature domain is enabled.
 * Memoized — safe to call in render.
 */
export function useFeatureFlag(domain: FeatureDomain): boolean {
  return useMemo(() => isFeatureEnabled(domain), [domain]);
}

