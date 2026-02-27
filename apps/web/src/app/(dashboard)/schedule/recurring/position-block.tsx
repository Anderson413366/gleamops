import { UserCircle2, MapPin, Clock4, AlertTriangle } from 'lucide-react';
import { Badge, cn } from '@gleamops/ui';

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
  isOpenShift?: boolean;
  hasConflict?: boolean;
  className?: string;
}

export function PositionBlock({
  positionType,
  siteName,
  startTime,
  endTime,
  staffName,
  isOpenShift = false,
  hasConflict = false,
  className,
}: PositionBlockProps) {
  const theme = resolveTheme(positionType);

  return (
    <article
      className={cn(
        'rounded-xl border p-3 shadow-sm transition-all',
        theme.block,
        isOpenShift && 'ring-2 ring-destructive/40',
        hasConflict && 'ring-2 ring-amber-500/60',
        className,
      )}
      role="group"
      aria-label={`${theme.label} at ${siteName} from ${startTime} to ${endTime}`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <Badge color={theme.badge}>{theme.label}</Badge>
        {isOpenShift && <Badge color="red">Open Shift</Badge>}
        {hasConflict && (
          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" aria-label="Schedule conflict" />
        )}
      </div>

      <div className="space-y-1 text-sm">
        <p className="inline-flex items-center gap-1.5 font-medium">
          <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
          {siteName}
        </p>
        <p className="inline-flex items-center gap-1.5 text-xs opacity-90">
          <Clock4 className="h-3.5 w-3.5" aria-hidden="true" />
          {startTime} - {endTime}
        </p>
        <p className="inline-flex items-center gap-1.5 text-xs opacity-90">
          <UserCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
          {staffName?.trim() ? staffName : 'Not assigned'}
        </p>
      </div>
    </article>
  );
}

export type { PositionBlockProps };
