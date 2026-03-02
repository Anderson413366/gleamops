'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Clock, MapPin, Users } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useRealtime } from '@/hooks/use-realtime';
import { Badge, EmptyState, TableSkeleton } from '@gleamops/ui';

interface ClockedInEntry {
  id: string;
  staff_id: string;
  site_id: string | null;
  start_at: string;
  break_minutes: number;
  clock_in_location: Record<string, unknown> | null;
  staff?: { full_name: string; staff_code: string; photo_url: string | null } | null;
  site?: { name: string; site_code: string } | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getGpsStatus(clockInLocation: Record<string, unknown> | null): 'in' | 'out' | 'none' {
  if (!clockInLocation) return 'none';
  const checkIn = clockInLocation.check_in;
  if (!isRecord(checkIn)) return 'none';
  if (typeof checkIn.isWithinGeofence === 'boolean') {
    return checkIn.isWithinGeofence ? 'in' : 'out';
  }
  if (typeof checkIn.is_within_geofence === 'boolean') {
    return checkIn.is_within_geofence ? 'in' : 'out';
  }
  return 'none';
}

function formatElapsed(startAt: string): string {
  const diffMs = Date.now() - new Date(startAt).getTime();
  if (diffMs <= 0) return '0m';
  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

interface ClockedInListProps {
  search: string;
}

export default function ClockedInList({ search }: ClockedInListProps) {
  const [rows, setRows] = useState<ClockedInEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const fetchData = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('time_entries')
      .select(`
        id, staff_id, site_id, start_at, break_minutes, clock_in_location,
        staff:staff_id(full_name, staff_code, photo_url),
        site:site_id(name, site_code)
      `)
      .eq('status', 'OPEN')
      .is('archived_at', null)
      .order('start_at', { ascending: false });

    if (!error && data) setRows(data as unknown as ClockedInEntry[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Live elapsed duration ticker — every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(interval);
  }, []);

  // Realtime subscription for INSERT/UPDATE on time_entries
  useRealtime({
    table: 'time_entries',
    event: '*',
    onData: () => {
      fetchData();
    },
  });

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.staff?.full_name?.toLowerCase().includes(q) ||
        r.staff?.staff_code?.toLowerCase().includes(q) ||
        r.site?.name?.toLowerCase().includes(q) ||
        r.site?.site_code?.toLowerCase().includes(q)
    );
  }, [rows, search]);

  if (loading) return <TableSkeleton rows={4} cols={3} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Badge color="green">{filtered.length}</Badge>
        <span className="text-sm text-muted-foreground">
          staff on the clock
        </span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Users className="h-12 w-12" />}
          title="No staff currently clocked in"
          description="When staff clock in, they will appear here in real-time."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((entry) => {
            const gps = getGpsStatus(entry.clock_in_location);
            // Use tick to force re-render of elapsed duration
            const elapsed = formatElapsed(entry.start_at);
            void tick;

            return (
              <div
                key={entry.id}
                className="rounded-lg border border-border bg-card p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {entry.staff?.full_name ?? 'Unknown'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {entry.staff?.staff_code ?? '—'}
                    </p>
                  </div>
                  <Badge color="green" className="shrink-0">{elapsed}</Badge>
                </div>

                <div className="space-y-1.5 text-xs">
                  {entry.site && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{entry.site.name}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="h-3 w-3 shrink-0" />
                    <span>
                      Clocked in {new Date(entry.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span
                      className={`inline-block h-2 w-2 rounded-full shrink-0 ${
                        gps === 'in'
                          ? 'bg-green-500'
                          : gps === 'out'
                            ? 'bg-red-500'
                            : 'bg-gray-400'
                      }`}
                    />
                    <span className="text-muted-foreground">
                      {gps === 'in'
                        ? 'Within geofence'
                        : gps === 'out'
                          ? 'Outside geofence'
                          : 'No GPS data'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
