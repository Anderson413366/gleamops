export type BreakEventType = 'BREAK_START' | 'BREAK_END';

export interface BreakEventRow {
  event_type: BreakEventType;
  recorded_at: string;
}

export interface BreakSummary {
  completedMinutes: number;
  activeStartAt: string | null;
  activeMinutes: number;
  totalMinutes: number;
  onBreak: boolean;
}

export type TimeEventNotesValue = string | Record<string, unknown> | null | undefined;

export const EMPTY_BREAK_SUMMARY: BreakSummary = {
  completedMinutes: 0,
  activeStartAt: null,
  activeMinutes: 0,
  totalMinutes: 0,
  onBreak: false,
};

function safeTimestamp(value: string): number | null {
  const ts = new Date(value).getTime();
  return Number.isFinite(ts) ? ts : null;
}

export function diffMinutes(startIso: string, endIso: string): number {
  const start = safeTimestamp(startIso);
  const end = safeTimestamp(endIso);
  if (start == null || end == null) return 0;
  if (end <= start) return 0;
  return Math.max(0, Math.round((end - start) / 60000));
}

export function summarizeBreaks(events: BreakEventRow[], nowIso = new Date().toISOString()): BreakSummary {
  if (!events.length) {
    return EMPTY_BREAK_SUMMARY;
  }

  const sorted = [...events]
    .filter((event) => event.event_type === 'BREAK_START' || event.event_type === 'BREAK_END')
    .sort((left, right) => {
      const l = safeTimestamp(left.recorded_at) ?? 0;
      const r = safeTimestamp(right.recorded_at) ?? 0;
      return l - r;
    });

  let completedMinutes = 0;
  let activeStartAt: string | null = null;

  for (const event of sorted) {
    if (event.event_type === 'BREAK_START') {
      if (!activeStartAt) {
        activeStartAt = event.recorded_at;
      }
      continue;
    }

    if (activeStartAt) {
      completedMinutes += diffMinutes(activeStartAt, event.recorded_at);
      activeStartAt = null;
    }
  }

  const activeMinutes = activeStartAt ? diffMinutes(activeStartAt, nowIso) : 0;
  const totalMinutes = completedMinutes + activeMinutes;

  return {
    completedMinutes,
    activeStartAt,
    activeMinutes,
    totalMinutes,
    onBreak: Boolean(activeStartAt),
  };
}

export function formatTimeEventNotes(value: TimeEventNotesValue): string | null {
  if (value == null) return null;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}
