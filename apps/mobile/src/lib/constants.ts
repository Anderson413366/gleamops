// Theme colors matching the web app's gleam (emerald) palette
export const Colors = {
  light: {
    primary: '#10B981',
    primaryDark: '#059669',
    background: '#FFFFFF',
    surface: '#F9FAFB',
    text: '#111827',
    textSecondary: '#6B7280',
    border: '#E5E7EB',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
  },
  dark: {
    primary: '#34D399',
    primaryDark: '#10B981',
    background: '#111827',
    surface: '#1F2937',
    text: '#F9FAFB',
    textSecondary: '#9CA3AF',
    border: '#374151',
    success: '#34D399',
    warning: '#FBBF24',
    error: '#F87171',
    info: '#60A5FA',
  },
} as const;

/**
 * Return today's date as YYYY-MM-DD in the device's local timezone.
 * Avoids the UTC-midnight bug where `new Date().toISOString().split('T')[0]`
 * can return yesterday's or tomorrow's date depending on timezone offset.
 */
export function localDateIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: '#3B82F6',
  IN_PROGRESS: '#F59E0B',
  COMPLETED: '#10B981',
  VERIFIED: '#059669',
  CANCELED: '#9CA3AF',
};
