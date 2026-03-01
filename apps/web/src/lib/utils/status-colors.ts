/**
 * Maps a status string to semantic CSS color classes for status filter pills.
 * When a status pill is active, it uses the semantic color for that status
 * (green for Active, red for Cancelled, etc.) instead of always using blue.
 */

const STATUS_COLOR_MAP: Record<string, { bg: string; text: string }> = {
  // Active / Success / Healthy
  ACTIVE: { bg: 'bg-emerald-600', text: 'text-white' },
  GOOD: { bg: 'bg-emerald-600', text: 'text-white' },
  COMPLETED: { bg: 'bg-emerald-600', text: 'text-white' },
  VERIFIED: { bg: 'bg-emerald-600', text: 'text-white' },
  APPROVED: { bg: 'bg-emerald-600', text: 'text-white' },
  PASS: { bg: 'bg-emerald-600', text: 'text-white' },

  // Info / Scheduled / Pending
  SCHEDULED: { bg: 'bg-blue-600', text: 'text-white' },
  DRAFT: { bg: 'bg-blue-600', text: 'text-white' },
  PENDING: { bg: 'bg-blue-600', text: 'text-white' },
  PROSPECT: { bg: 'bg-blue-600', text: 'text-white' },
  NEW: { bg: 'bg-blue-600', text: 'text-white' },

  // In Progress / Working
  IN_PROGRESS: { bg: 'bg-violet-600', text: 'text-white' },
  WORKING: { bg: 'bg-violet-600', text: 'text-white' },
  SUBMITTED: { bg: 'bg-violet-600', text: 'text-white' },

  // Warning / On Hold
  ON_HOLD: { bg: 'bg-amber-500', text: 'text-white' },
  FAIR: { bg: 'bg-amber-500', text: 'text-white' },
  EXPIRING: { bg: 'bg-amber-500', text: 'text-white' },
  STALE: { bg: 'bg-amber-500', text: 'text-white' },
  ON_LEAVE: { bg: 'bg-amber-500', text: 'text-white' },

  // Inactive / Discontinued
  INACTIVE: { bg: 'bg-slate-500', text: 'text-white' },
  DISCONTINUED: { bg: 'bg-slate-500', text: 'text-white' },

  // Danger / Expired / Cancelled
  CANCELLED: { bg: 'bg-red-600', text: 'text-white' },
  CANCELED: { bg: 'bg-red-600', text: 'text-white' },
  TERMINATED: { bg: 'bg-red-600', text: 'text-white' },
  EXPIRED: { bg: 'bg-red-600', text: 'text-white' },
  REVOKED: { bg: 'bg-red-600', text: 'text-white' },
  POOR: { bg: 'bg-red-600', text: 'text-white' },
  OUT_OF_SERVICE: { bg: 'bg-red-600', text: 'text-white' },
  LOST: { bg: 'bg-red-600', text: 'text-white' },
  REJECTED: { bg: 'bg-red-600', text: 'text-white' },
  FAIL: { bg: 'bg-red-600', text: 'text-white' },

  // "All" filter — brand primary
  all: { bg: 'bg-primary', text: 'text-primary-foreground' },
};

/** Returns the active pill classes for a given status key. */
export function getStatusPillColor(status: string): string {
  const entry = STATUS_COLOR_MAP[status];
  if (entry) return `${entry.bg} ${entry.text}`;
  // Fallback: use primary (brand blue)
  return 'bg-primary text-primary-foreground';
}

/** Inactive pill classes (same for all statuses). */
export const STATUS_PILL_INACTIVE = 'bg-muted text-muted-foreground hover:bg-muted/80';
