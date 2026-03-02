/** Canonical priority values — enforced by DB constraints */
export const PRIORITY_VALUES = ['LOW', 'NORMAL', 'HIGH', 'CRITICAL'] as const;
export type Priority = (typeof PRIORITY_VALUES)[number];

export const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Low',
  NORMAL: 'Normal',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

export const PRIORITY_COLORS: Record<string, string> = {
  LOW: '#6B7280',
  NORMAL: '#3B82F6',
  HIGH: '#F59E0B',
  CRITICAL: '#EF4444',
};

export const PRIORITY_OPTIONS = PRIORITY_VALUES.map((v) => ({
  value: v,
  label: PRIORITY_LABELS[v],
}));

/** Map legacy priority strings to canonical values */
export function normalizePriority(value: string | null | undefined): Priority | null {
  if (!value) return null;
  const upper = value.toUpperCase().trim();
  const map: Record<string, Priority> = {
    ROUTINE: 'LOW',
    LOW: 'LOW',
    MEDIUM: 'NORMAL',
    NORMAL: 'NORMAL',
    STANDARD: 'NORMAL',
    HIGH: 'HIGH',
    URGENT: 'HIGH',
    CRITICAL: 'CRITICAL',
    EMERGENCY: 'CRITICAL',
    ASAP: 'CRITICAL',
  };
  return map[upper] ?? null;
}
