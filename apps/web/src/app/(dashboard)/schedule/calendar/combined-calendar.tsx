'use client';

import type { ComponentProps } from 'react';
import WeekCalendar from './week-calendar';

type CombinedCalendarProps = ComponentProps<typeof WeekCalendar>;

/**
 * Combined recurring + work-order calendar view.
 * Wraps the shared calendar implementation so the route-level API matches the plan artifact map.
 */
export function CombinedCalendar({ onSelectTicket, onCreatedTicket }: CombinedCalendarProps) {
  return <WeekCalendar onSelectTicket={onSelectTicket} onCreatedTicket={onCreatedTicket} />;
}
