/**
 * Environment-based feature flags for GleamOps.
 *
 * Flags are read from `NEXT_PUBLIC_FF_*` env vars (web/mobile) or `FF_*` (worker).
 * Values are cached on first read — restart the process to pick up changes.
 *
 * Default: most flags disabled. Navigation/scheduling IA flags default enabled.
 */

export type FeatureDomain =
  | 'schema_parity'
  | 'bid_specialization'
  | 'proposal_studio_v2'
  | 'ops_geofence_auto'
  | 'messaging_v1'
  | 'mobile_inspections'
  | 'qbo_timesheet_sync'
  | 'financial_intel_v1'
  | 'schedule_liberation'
  | 'v2_navigation'
  | 'planning_board'
  | 'unified_sales'
  | 'standalone_calculator';

export type FeatureFlags = Record<FeatureDomain, boolean>;

const DOMAIN_TO_ENV: Record<FeatureDomain, string> = {
  schema_parity: 'NEXT_PUBLIC_FF_SCHEMA_PARITY',
  bid_specialization: 'NEXT_PUBLIC_FF_BID_SPECIALIZATION',
  proposal_studio_v2: 'NEXT_PUBLIC_FF_PROPOSAL_STUDIO_V2',
  ops_geofence_auto: 'NEXT_PUBLIC_FF_OPS_GEOFENCE_AUTO',
  messaging_v1: 'NEXT_PUBLIC_FF_MESSAGING_V1',
  mobile_inspections: 'NEXT_PUBLIC_FF_MOBILE_INSPECTIONS',
  qbo_timesheet_sync: 'NEXT_PUBLIC_FF_QBO_TIMESHEET_SYNC',
  financial_intel_v1: 'NEXT_PUBLIC_FF_FINANCIAL_INTEL_V1',
  schedule_liberation: 'NEXT_PUBLIC_FF_SCHEDULE_LIBERATION',
  v2_navigation: 'NEXT_PUBLIC_FF_V2_NAVIGATION',
  planning_board: 'NEXT_PUBLIC_FF_PLANNING_BOARD',
  unified_sales: 'NEXT_PUBLIC_FF_UNIFIED_SALES',
  standalone_calculator: 'NEXT_PUBLIC_FF_STANDALONE_CALCULATOR',
};

/**
 * Worker processes don't use the NEXT_PUBLIC_ prefix.
 * We check both variants so the same code works in web and worker contexts.
 */
const WORKER_ENV: Record<string, string> = {
  NEXT_PUBLIC_FF_BID_SPECIALIZATION: 'FF_BID_SPECIALIZATION',
  NEXT_PUBLIC_FF_PROPOSAL_STUDIO_V2: 'FF_PROPOSAL_STUDIO_V2',
  NEXT_PUBLIC_FF_QBO_TIMESHEET_SYNC: 'FF_QBO_TIMESHEET_SYNC',
  NEXT_PUBLIC_FF_FINANCIAL_INTEL_V1: 'FF_FINANCIAL_INTEL_V1',
  NEXT_PUBLIC_FF_SCHEDULE_LIBERATION: 'FF_SCHEDULE_LIBERATION',
  NEXT_PUBLIC_FF_V2_NAVIGATION: 'FF_V2_NAVIGATION',
  NEXT_PUBLIC_FF_PLANNING_BOARD: 'FF_PLANNING_BOARD',
  NEXT_PUBLIC_FF_UNIFIED_SALES: 'FF_UNIFIED_SALES',
  NEXT_PUBLIC_FF_STANDALONE_CALCULATOR: 'FF_STANDALONE_CALCULATOR',
};

const ALL_DOMAINS: FeatureDomain[] = [
  'schema_parity',
  'bid_specialization',
  'proposal_studio_v2',
  'ops_geofence_auto',
  'messaging_v1',
  'mobile_inspections',
  'qbo_timesheet_sync',
  'financial_intel_v1',
  'schedule_liberation',
  'v2_navigation',
  'planning_board',
  'unified_sales',
  'standalone_calculator',
];

const DOMAIN_DEFAULTS: Partial<FeatureFlags> = {
  // v2 IA is the current default experience; flags act as rollback controls.
  schedule_liberation: true,
  v2_navigation: true,
  unified_sales: true,
  standalone_calculator: true,
};

let _cache: FeatureFlags | null = null;

// Declared locally to avoid requiring @types/node in every consumer package.
declare const process: { env: Record<string, string | undefined> } | undefined;

function readEnvOrDefault(key: string, defaultValue: boolean): boolean {
  if (typeof process === 'undefined' || !process.env) return defaultValue;
  const val = process.env[key] ?? process.env[WORKER_ENV[key] ?? ''];
  if (val == null) return defaultValue;
  return val === 'enabled' || val === 'true' || val === '1';
}

/**
 * Read all feature flags from environment variables.
 * Cached on first call — returns the same object on subsequent calls.
 */
export function getFeatureFlags(): FeatureFlags {
  if (_cache) return _cache;

  const flags = {} as FeatureFlags;
  for (const domain of ALL_DOMAINS) {
    flags[domain] = readEnvOrDefault(DOMAIN_TO_ENV[domain], DOMAIN_DEFAULTS[domain] ?? false);
  }
  _cache = flags;
  return _cache;
}

/**
 * Check if a single feature domain is enabled.
 */
export function isFeatureEnabled(domain: FeatureDomain): boolean {
  return getFeatureFlags()[domain];
}

/**
 * Reset the cache (useful for testing).
 * @internal
 */
export function _resetFlagCache(): void {
  _cache = null;
}
