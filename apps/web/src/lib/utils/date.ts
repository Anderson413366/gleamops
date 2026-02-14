/**
 * Timezone-safe date formatting utilities for GleamOps.
 *
 * Problem: `new Date('2025-01-15')` is parsed as UTC midnight. When displayed
 * via `toLocaleDateString()` in a timezone behind UTC (e.g. US Eastern),
 * it shows January 14 instead of January 15 (off-by-one).
 *
 * Solution: All functions parse date-only strings (YYYY-MM-DD) using local
 * year/month/day components, which creates a local-time Date object.
 */

const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Safely parse a date string, avoiding timezone-induced off-by-one errors.
 * Date-only strings (YYYY-MM-DD) are treated as local midnight.
 * Full ISO timestamps are parsed normally.
 */
export function toSafeDate(d: string): Date {
  const m = d.match(DATE_ONLY_RE);
  if (m) {
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }
  return new Date(d);
}

// Reusable Intl formatters (created once, used everywhere)
const shortDateFmt = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

const longDateFmt = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
});

const dateTimeFmt = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

const timeFmt = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

/**
 * Format a date as "Jan 15, 2025". Returns em-dash for null/undefined.
 */
export function formatDate(d: string | null | undefined): string {
  if (!d) return '\u2014';
  return shortDateFmt.format(toSafeDate(d));
}

/**
 * Format a date as "Monday, January 15, 2025". Returns em-dash for null/undefined.
 */
export function formatDateLong(d: string | null | undefined): string {
  if (!d) return '\u2014';
  return longDateFmt.format(toSafeDate(d));
}

/**
 * Format a timestamp as "Jan 15, 2025, 3:30 PM". Returns em-dash for null/undefined.
 */
export function formatDateTime(d: string | null | undefined): string {
  if (!d) return '\u2014';
  return dateTimeFmt.format(toSafeDate(d));
}

/**
 * Format a timestamp as "3:30 PM". Returns em-dash for null/undefined.
 */
export function formatTime(d: string | null | undefined): string {
  if (!d) return '\u2014';
  return timeFmt.format(toSafeDate(d));
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Format a timestamp as relative time: "2 min ago", "3 hr ago", "5 days ago".
 * Falls back to short date for anything older than 30 days.
 */
export function formatRelative(d: string | null | undefined): string {
  if (!d) return '\u2014';
  const date = toSafeDate(d);
  const diff = Date.now() - date.getTime();

  if (diff < 0) return 'just now';
  if (diff < MINUTE) return 'just now';
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)} min ago`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)} hr ago`;
  if (diff < 30 * DAY) return `${Math.floor(diff / DAY)} days ago`;
  return shortDateFmt.format(date);
}
