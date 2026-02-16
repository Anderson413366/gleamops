'use client';

import { useEffect, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Users, Clock, GripVertical } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Button, Skeleton } from '@gleamops/ui';
import type { WorkTicket } from '@gleamops/shared';

interface TicketWithRelations extends WorkTicket {
  job?: { job_code: string } | null;
  site?: { site_code: string; name: string; client?: { name: string } | null } | null;
  assignments?: { staff?: { full_name: string } | null }[];
}

interface WeekCalendarProps {
  onSelectTicket?: (ticket: TicketWithRelations) => void;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  d.setDate(d.getDate() - day + 1); // Monday
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function isToday(d: Date): boolean {
  const today = new Date();
  return d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
}

function formatTime(t: string | null): string {
  if (!t) return '';
  // Handle HH:MM:SS or HH:MM
  const parts = t.split(':');
  const h = parseInt(parts[0], 10);
  const m = parts[1];
  const ampm = h >= 12 ? 'pm' : 'am';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m}${ampm}`;
}

const STATUS_BG: Record<string, string> = {
  SCHEDULED: 'bg-primary/10 border-primary/30 hover:bg-primary/15',
  IN_PROGRESS: 'bg-warning/10 border-warning/30 hover:bg-warning/15',
  COMPLETED: 'bg-success/10 border-success/30 hover:bg-success/15',
  VERIFIED: 'bg-success/10 border-success/30 hover:bg-success/15',
  CANCELED: 'bg-muted border-border hover:bg-muted opacity-60',
};

const STATUS_DOT: Record<string, string> = {
  SCHEDULED: 'bg-primary',
  IN_PROGRESS: 'bg-warning',
  COMPLETED: 'bg-success',
  VERIFIED: 'bg-success',
  CANCELED: 'bg-muted-foreground',
};

export default function WeekCalendar({ onSelectTicket }: WeekCalendarProps) {
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [tickets, setTickets] = useState<TicketWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragTicketId, setDragTicketId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  const weekDays = getWeekDays(weekStart);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 6);
    const { data, error } = await supabase
      .from('work_tickets')
      .select(`
        *,
        job:job_id(job_code),
        site:site_id(site_code, name, client:client_id(name)),
        assignments:ticket_assignments(staff:staff_id(full_name))
      `)
      .is('archived_at', null)
      .gte('scheduled_date', formatDate(weekStart))
      .lte('scheduled_date', formatDate(end))
      .order('start_time', { ascending: true });

    if (!error && data) setTickets(data as unknown as TicketWithRelations[]);
    setLoading(false);
  }, [weekStart]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const goToPrevWeek = () => setWeekStart((prev) => { const d = new Date(prev); d.setDate(d.getDate() - 7); return d; });
  const goToNextWeek = () => setWeekStart((prev) => { const d = new Date(prev); d.setDate(d.getDate() + 7); return d; });
  const goToThisWeek = () => setWeekStart(getWeekStart(new Date()));

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, ticketId: string) => {
    setDragTicketId(ticketId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', ticketId);
  };

  const handleDragOver = (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTarget(dateStr);
  };

  const handleDragLeave = () => setDropTarget(null);

  const handleDrop = async (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    setDropTarget(null);
    const ticketId = e.dataTransfer.getData('text/plain') || dragTicketId;
    if (!ticketId) return;

    const ticket = tickets.find((t) => t.id === ticketId);
    if (!ticket || formatDate(new Date(ticket.scheduled_date)) === dateStr) return;

    // Optimistic update
    setTickets((prev) => prev.map((t) => t.id === ticketId ? { ...t, scheduled_date: dateStr } : t));

    const supabase = getSupabaseBrowserClient();
    await supabase.from('work_tickets').update({ scheduled_date: dateStr }).eq('id', ticketId);
    setDragTicketId(null);
  };

  const handleDragEnd = () => { setDragTicketId(null); setDropTarget(null); };

  // Group tickets by date
  const ticketsByDate = new Map<string, TicketWithRelations[]>();
  for (const day of weekDays) ticketsByDate.set(formatDate(day), []);
  for (const ticket of tickets) {
    const dateStr = ticket.scheduled_date.split('T')[0];
    const existing = ticketsByDate.get(dateStr);
    if (existing) existing.push(ticket);
  }

  // Aggregate stats
  const totalTickets = tickets.length;
  const completedCount = tickets.filter((t) => t.status === 'COMPLETED' || t.status === 'VERIFIED').length;
  const unassignedCount = tickets.filter((t) => !t.assignments || t.assignments.length === 0).length;

  const weekLabel = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  return (
    <div className="space-y-4">
      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={goToPrevWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="secondary" size="sm" onClick={goToThisWeek}>
            Today
          </Button>
          <Button variant="secondary" size="sm" onClick={goToNextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <h3 className="text-sm font-semibold text-foreground">{weekLabel}</h3>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>{totalTickets} tickets</span>
          <span className="text-success">{completedCount} done</span>
          {unassignedCount > 0 && (
            <span className="text-destructive font-medium">{unassignedCount} unassigned</span>
          )}
        </div>
      </div>

      {/* Status legend */}
      <div className="flex items-center gap-4 text-xs">
        {Object.entries(STATUS_DOT).map(([status, dotClass]) => (
          <div key={status} className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${dotClass}`} />
            <span className="text-muted-foreground capitalize">{status.toLowerCase().replace('_', ' ')}</span>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-1 min-h-[500px]">
          {weekDays.map((day) => {
            const dateStr = formatDate(day);
            const dayTickets = ticketsByDate.get(dateStr) ?? [];
            const today = isToday(day);
            const isDropping = dropTarget === dateStr;
            const isPast = day < new Date(new Date().setHours(0, 0, 0, 0)) && !today;

            return (
              <div
                key={dateStr}
                className={`
                  rounded-lg border p-2 transition-colors min-h-[120px] flex flex-col
                  ${today ? 'border-brand-400 bg-brand-50/30 ring-1 ring-brand-200' : 'border-border'}
                  ${isDropping ? 'border-brand-500 bg-brand-50 border-dashed border-2' : ''}
                  ${isPast ? 'bg-muted/50' : ''}
                `}
                onDragOver={(e) => handleDragOver(e, dateStr)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, dateStr)}
              >
                {/* Day header */}
                <div className="text-center mb-2 pb-1 border-b border-border/50">
                  <p className={`text-xs font-medium ${today ? 'text-brand-600' : 'text-muted-foreground'}`}>
                    {DAY_NAMES[day.getDay()]}
                  </p>
                  <p className={`text-lg font-bold leading-tight ${today ? 'text-brand-600' : 'text-foreground'}`}>
                    {day.getDate()}
                  </p>
                  {dayTickets.length > 0 && (
                    <p className="text-[10px] text-muted-foreground">{dayTickets.length} ticket{dayTickets.length > 1 ? 's' : ''}</p>
                  )}
                </div>

                {/* Ticket cards */}
                <div className="space-y-1 flex-1 overflow-y-auto">
                  {dayTickets.map((ticket) => {
                    const assignedNames = ticket.assignments
                      ?.map((a) => a.staff?.full_name?.split(' ')[0])
                      .filter(Boolean) ?? [];
                    const isUnassigned = assignedNames.length === 0;

                    return (
                      <div
                        key={ticket.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, ticket.id)}
                        onDragEnd={handleDragEnd}
                        onClick={() => onSelectTicket?.(ticket)}
                        className={`
                          p-1.5 rounded border text-xs cursor-grab active:cursor-grabbing transition-all relative group
                          ${STATUS_BG[ticket.status] ?? 'bg-muted border-border'}
                          ${dragTicketId === ticket.id ? 'opacity-40 scale-95' : 'opacity-100'}
                          ${isUnassigned ? 'ring-1 ring-destructive/30' : ''}
                        `}
                      >
                        {/* Drag handle */}
                        <GripVertical className="h-3 w-3 text-muted-foreground absolute top-1 right-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />

                        {/* Status dot + site name */}
                        <div className="flex items-center gap-1">
                          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[ticket.status] ?? 'bg-muted-foreground'}`} />
                          <p className="font-medium truncate">{ticket.site?.name ?? ticket.ticket_code}</p>
                        </div>

                        {/* Time */}
                        {ticket.start_time && (
                          <div className="flex items-center gap-0.5 text-muted-foreground mt-0.5">
                            <Clock className="h-2.5 w-2.5" />
                            <span>{formatTime(ticket.start_time)}{ticket.end_time ? `–${formatTime(ticket.end_time)}` : ''}</span>
                          </div>
                        )}

                        {/* Staff */}
                        {assignedNames.length > 0 ? (
                          <div className="flex items-center gap-0.5 text-muted-foreground mt-0.5">
                            <Users className="h-2.5 w-2.5" />
                            <span className="truncate">{assignedNames.join(', ')}</span>
                          </div>
                        ) : (
                          <p className="text-destructive text-[10px] mt-0.5 font-medium">Unassigned</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
