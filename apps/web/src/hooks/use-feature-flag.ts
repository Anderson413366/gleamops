'use client';

import { useMemo } from 'react';
import {
  getFeatureFlags,
  isFeatureEnabled,
  type FeatureDomain,
  type FeatureFlags,
} from '@gleamops/shared';

/**
 * Check if a single feature domain is enabled.
 * Memoized — safe to call in render.
 */
export function useFeatureFlag(domain: FeatureDomain): boolean {
  return useMemo(() => isFeatureEnabled(domain), [domain]);
}

/**
 * Get the full feature flags object.
 * Memoized — safe to call in render.
 */
export function useFeatureFlags(): FeatureFlags {
  return useMemo(() => getFeatureFlags(), []);
}
