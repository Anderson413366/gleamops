import { memo } from 'react';
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
  } = props;
  const { positionTypes } = usePositionTypes();
  const theme = resolvePositionTheme(positionType, positionTypes);
  const displaySite = siteCode ? `${siteCode} – ${siteName}` : siteName;

  return (
    <article
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        'rounded-md border px-2 py-1.5 transition-all',
        theme.block,
        isOpenShift && 'ring-2 ring-destructive/40',
        hasConflict && 'ring-2 ring-amber-500/60',
        draggable && 'cursor-grab active:cursor-grabbing',
        className,
      )}
      role="group"
      aria-label={`${theme.label} at ${displaySite} from ${startTime} to ${endTime}`}
    >
      <p className="text-[11px] font-semibold truncate leading-tight">
        {displaySite}
        {hasConflict && (
          <AlertTriangle className="ml-1 inline h-3 w-3 text-amber-500 shrink-0" aria-label="Schedule conflict" />
        )}
      </p>
      <p className="text-[11px] truncate leading-tight opacity-90">{theme.label}</p>
      <p className="text-[11px] font-mono leading-tight opacity-90">{startTime} – {endTime}</p>
    </article>
  );
});

export { POSITION_THEME, resolveTheme, COLOR_TOKEN_MAP };
export type { PositionBlockProps };
