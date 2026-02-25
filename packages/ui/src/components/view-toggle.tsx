'use client';

import { List, LayoutGrid, CalendarDays } from 'lucide-react';
import { cn } from '../utils';

type BaseView = 'list' | 'card';
type CalendarView = BaseView | 'calendar';

interface BaseViewToggleProps {
  view: 'list' | 'card';
  onChange: (view: 'list' | 'card') => void;
  allowCalendar?: false;
  hideOnMobile?: boolean;
}

interface CalendarViewToggleProps {
  view: CalendarView;
  onChange: (view: CalendarView) => void;
  allowCalendar: true;
  hideOnMobile?: boolean;
}

type ViewToggleProps = BaseViewToggleProps | CalendarViewToggleProps;

export function ViewToggle({
  view,
  onChange,
  allowCalendar = false,
  hideOnMobile = true,
}: ViewToggleProps) {
  const onCalendarChange = onChange as (view: CalendarView) => void;

  return (
    <div className={cn(
      'inline-flex items-center rounded-lg border border-border bg-muted p-0.5',
      hideOnMobile && 'hidden md:inline-flex'
    )}>
      <button
        type="button"
        onClick={() => onChange('list')}
        className={cn(
          'inline-flex items-center justify-center rounded-md px-2 py-1.5 text-sm transition-colors',
          view === 'list'
            ? 'bg-card text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
        aria-label="List view"
      >
        <List className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onChange('card')}
        className={cn(
          'inline-flex items-center justify-center rounded-md px-2 py-1.5 text-sm transition-colors',
          view === 'card'
            ? 'bg-card text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
        aria-label="Card view"
      >
        <LayoutGrid className="h-4 w-4" />
      </button>
      {allowCalendar && (
        <button
          type="button"
          onClick={() => onCalendarChange('calendar')}
          className={cn(
            'inline-flex items-center justify-center rounded-md px-2 py-1.5 text-sm transition-colors',
            view === 'calendar'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
          aria-label="Calendar view"
        >
          <CalendarDays className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
