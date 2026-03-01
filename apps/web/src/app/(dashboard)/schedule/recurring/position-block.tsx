import { memo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@gleamops/ui';
import { usePositionTypes, resolvePositionTheme, COLOR_TOKEN_MAP } from '@/hooks/use-position-types';

/**
 * @deprecated Use `usePositionTypes()` + `resolvePositionTheme()` for dynamic colors.
 * Kept for backward compatibility with any external references.
 */
const POSITION_THEME: Record<string, { label: string; block: string; badge: 'green' | 'red' | 'blue' | 'yellow' | 'gray' }> = {
  FLOOR_SPECIALIST: {
    label: 'Floor Specialist',
    block: 'border-green-300/70 bg-green-50 text-green-900',
    badge: 'green',
  },
  RESTROOM_SPECIALIST: {
    label: 'Restroom Specialist',
    block: 'border-red-300/70 bg-red-50 text-red-900',
    badge: 'red',
  },
  VACUUM_SPECIALIST: {
    label: 'Vacuum Specialist',
    block: 'border-blue-300/70 bg-blue-50 text-blue-900',
    badge: 'blue',
  },
  UTILITY_SPECIALIST: {
    label: 'Utility Specialist',
    block: 'border-yellow-300/70 bg-yellow-50 text-yellow-900',
    badge: 'yellow',
  },
  DAY_PORTER: {
    label: 'Day Porter',
    block: 'border-slate-300/70 bg-slate-50 text-slate-900',
    badge: 'gray',
  },
};

/** @deprecated Use `resolvePositionTheme()` from use-position-types hook. */
function resolveTheme(positionType?: string) {
  if (!positionType) {
    return {
      label: 'Unassigned Position',
      block: 'border-slate-300/70 bg-slate-50 text-slate-900',
      badge: 'gray' as const,
    };
  }
  return POSITION_THEME[positionType] ?? {
    label: positionType.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase()),
    block: 'border-slate-300/70 bg-slate-50 text-slate-900',
    badge: 'gray' as const,
  };
}

interface PositionBlockProps {
  positionType?: string;
  siteName: string;
  startTime: string;
  endTime: string;
  staffName?: string | null;
  siteCode?: string | null;
  isOpenShift?: boolean;
  isPublished?: boolean;
  hasConflict?: boolean;
  className?: string;
  draggable?: boolean;
  onDragStart?: (event: React.DragEvent) => void;
  onDragEnd?: (event: React.DragEvent) => void;
  /** Shift code/ID for display (e.g. "1142") */
  shiftCode?: string | null;
  /** Number of assigned staff */
  staffCount?: number;
  /** Shift status: open, draft, confirmed */
  shiftStatus?: 'open' | 'draft' | 'confirmed' | null;
  /** Callback when clicking the card */
  onClick?: () => void;
}

export const PositionBlock = memo(function PositionBlock(props: PositionBlockProps) {
  const {
    positionType,
    siteName,
    startTime,
    endTime,
    siteCode,
    isOpenShift = false,
    hasConflict = false,
    className,
    draggable,
    onDragStart,
    onDragEnd,
    shiftCode,
    staffCount,
    shiftStatus,
    onClick,
  } = props;
  const { positionTypes } = usePositionTypes();
  const theme = resolvePositionTheme(positionType, positionTypes);
  const displaySite = siteCode ? `${siteCode} – ${siteName}` : siteName;
  const [hovered, setHovered] = useState(false);

  const statusBadgeColor = shiftStatus === 'confirmed' ? 'bg-green-500' : shiftStatus === 'draft' ? 'bg-gray-400' : 'bg-red-400';

  return (
    <article
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        'rounded-md border px-2 py-1.5 transition-all relative group',
        theme.block,
        isOpenShift && 'ring-2 ring-destructive/40',
        hasConflict && 'ring-2 ring-amber-500/60',
        draggable && 'cursor-grab active:cursor-grabbing',
        onClick && 'cursor-pointer',
        className,
      )}
      role="group"
      aria-label={`${theme.label} at ${displaySite} from ${startTime} to ${endTime}`}
    >
      <div className="flex items-start justify-between gap-1">
        <p className="text-[11px] font-semibold truncate leading-tight flex-1">
          {displaySite}
          {hasConflict && (
            <AlertTriangle className="ml-1 inline h-3 w-3 text-amber-500 shrink-0" aria-label="Schedule conflict" />
          )}
        </p>
        <div className="flex items-center gap-1 shrink-0">
          {shiftCode && (
            <span className="text-[9px] font-mono text-muted-foreground">{shiftCode}</span>
          )}
          {staffCount != null && staffCount > 0 && (
            <span className="text-[9px] text-muted-foreground">&#9873; {staffCount}</span>
          )}
          {shiftStatus && (
            <span className={cn('h-1.5 w-1.5 rounded-full', statusBadgeColor)} />
          )}
        </div>
      </div>
      <p className="text-[11px] truncate leading-tight opacity-90">{theme.label}</p>
      <p className="text-[11px] font-mono leading-tight opacity-90">{startTime} – {endTime}</p>

      {/* Hover action toolbar */}
      {hovered && onClick && (
        <div className="absolute -top-1 -right-1 flex items-center gap-0.5 rounded-md border border-border bg-card p-0.5 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
          <button type="button" className="rounded p-0.5 hover:bg-muted text-muted-foreground text-[11px]" title="Edit">
            &#9998;
          </button>
          <button type="button" className="rounded p-0.5 hover:bg-muted text-muted-foreground text-[11px]" title="Copy">
            &#x2398;
          </button>
        </div>
      )}
    </article>
  );
});

export { POSITION_THEME, resolveTheme, COLOR_TOKEN_MAP };
export type { PositionBlockProps };
