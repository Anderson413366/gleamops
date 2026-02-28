import { memo } from 'react';
import { UserCircle2, MapPin, Clock4, AlertTriangle, Lock } from 'lucide-react';
import { Badge, cn } from '@gleamops/ui';
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

function computeDuration(startTime: string, endTime: string): string {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  let totalMinutes = (eh * 60 + em) - (sh * 60 + sm);
  if (totalMinutes <= 0) totalMinutes += 24 * 60;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

interface PositionBlockProps {
  positionType?: string;
  siteName: string;
  startTime: string;
  endTime: string;
  staffName?: string | null;
  clientCode?: string | null;
  isOpenShift?: boolean;
  isPublished?: boolean;
  hasConflict?: boolean;
  className?: string;
  draggable?: boolean;
  onDragStart?: (event: React.DragEvent) => void;
  onDragEnd?: (event: React.DragEvent) => void;
}

export const PositionBlock = memo(function PositionBlock({
  positionType,
  siteName,
  startTime,
  endTime,
  staffName,
  clientCode,
  isOpenShift = false,
  isPublished = false,
  hasConflict = false,
  className,
  draggable,
  onDragStart,
  onDragEnd,
}: PositionBlockProps) {
  const { positionTypes } = usePositionTypes();
  const theme = resolvePositionTheme(positionType, positionTypes);
  const duration = computeDuration(startTime, endTime);
  const displaySite = clientCode ? `${clientCode} ${siteName}` : siteName;

  return (
    <article
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        'rounded-xl border p-3 shadow-sm transition-all',
        theme.block,
        isOpenShift && 'ring-2 ring-destructive/40',
        hasConflict && 'ring-2 ring-amber-500/60',
        draggable && 'cursor-grab active:cursor-grabbing',
        className,
      )}
      role="group"
      aria-label={`${theme.label} at ${displaySite} from ${startTime} to ${endTime}`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <Badge color={theme.badge}>{theme.label}</Badge>
        <div className="flex items-center gap-1">
          {isOpenShift && <Badge color="red">Open</Badge>}
          {hasConflict && (
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" aria-label="Schedule conflict" />
          )}
          {isPublished && (
            <Lock className="h-3.5 w-3.5 opacity-50 shrink-0" aria-label="Published (locked)" />
          )}
        </div>
      </div>

      <div className="space-y-1 text-sm">
        <p className="inline-flex items-center gap-1.5 font-medium truncate max-w-full">
          <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {displaySite}
        </p>
        <p className="inline-flex items-center gap-1.5 text-xs opacity-90">
          <Clock4 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {startTime} - {endTime}
          <span className="font-medium ml-0.5">{duration}</span>
        </p>
        <p className="inline-flex items-center gap-1.5 text-xs opacity-90">
          <UserCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {staffName?.trim() ? staffName : 'Not assigned'}
        </p>
      </div>
    </article>
  );
});

export { POSITION_THEME, resolveTheme, COLOR_TOKEN_MAP };
export type { PositionBlockProps };
