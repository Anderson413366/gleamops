'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Crosshair, LogIn, LogOut, PauseCircle, PlayCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Input, Select, SlideOver, Textarea } from '@gleamops/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { resolveCurrentStaff } from '@/lib/staff/resolve-current-staff';
import {
  diffMinutes,
  EMPTY_BREAK_SUMMARY,
  formatTimeEventNotes,
  summarizeBreaks,
  type BreakEventRow,
  type BreakSummary,
} from '@/lib/timekeeping/breaks';
import { useCamera } from '@/hooks/use-camera';
import { useGeolocation } from '@/hooks/use-geolocation';
import { GpsLocationBadge } from './gps-location-badge';

interface ClockInButtonProps {
  onStatusChange?: () => void;
}

interface StaffContext {
  id: string;
  tenant_id: string;
  full_name: string;
  staff_code: string;
}

interface SiteOption {
  id: string;
  name: string;
  site_code: string | null;
  geofence_center_lat: number | null;
  geofence_center_lng: number | null;
  geofence_radius_meters: number | null;
}

interface OpenEntry {
  id: string;
  start_at: string;
  site_id: string | null;
  break_minutes: number;
}

type VerificationType = 'CHECK_IN' | 'CHECK_OUT';

function formatMinutes(totalMinutes: number): string {
  const minutes = Math.max(0, Math.round(totalMinutes));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (remainder === 0) return `${hours}h`;
  return `${hours}h ${remainder}m`;
}

export function ClockInButton({ onStatusChange }: ClockInButtonProps) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [staff, setStaff] = useState<StaffContext | null>(null);
  const [sites, setSites] = useState<SiteOption[]>([]);
  const [openEntry, setOpenEntry] = useState<OpenEntry | null>(null);
  const [breakSummary, setBreakSummary] = useState<BreakSummary>(EMPTY_BREAK_SUMMARY);
  const [breakEvents, setBreakEvents] = useState<BreakEventRow[]>([]);
  const [breakSubmitting, setBreakSubmitting] = useState(false);
  const [breakNow, setBreakNow] = useState(() => new Date().toISOString());
  const [siteId, setSiteId] = useState('');
  const [notes, setNotes] = useState('');

  const geolocation = useGeolocation();
  const camera = useCamera();

  const verificationType: VerificationType = openEntry ? 'CHECK_OUT' : 'CHECK_IN';
  const isClockedIn = verificationType === 'CHECK_OUT';

  const selectedSite = useMemo(
    () => sites.find((site) => site.id === siteId) ?? null,
    [siteId, sites],
  );
  const activeSite = useMemo(
    () => sites.find((site) => site.id === openEntry?.site_id) ?? selectedSite ?? null,
    [openEntry?.site_id, selectedSite, sites],
  );

  const loadContext = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();

    try {
      const { user, staff: staffRow } = await resolveCurrentStaff<StaffContext>(
        supabase,
        'id, tenant_id, full_name, staff_code',
      );

      if (!user) {
        setStaff(null);
        setSites([]);
        setOpenEntry(null);
        setLoading(false);
        return;
      }

      if (!staffRow) {
        setStaff(null);
        setSites([]);
        setOpenEntry(null);
        setLoading(false);
        return;
      }

      const parsedStaff = staffRow as StaffContext;
      setStaff(parsedStaff);

      const [sitesRes, openEntryRes] = await Promise.all([
        supabase
          .from('sites')
          .select('id, name, site_code, geofence_center_lat, geofence_center_lng, geofence_radius_meters')
          .is('archived_at', null)
          .order('name', { ascending: true }),
        supabase
          .from('time_entries')
          .select('id, start_at, site_id, break_minutes')
          .eq('staff_id', parsedStaff.id)
          .eq('status', 'OPEN')
          .is('archived_at', null)
          .order('start_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      setSites((sitesRes.data ?? []) as SiteOption[]);
      const currentOpenEntry = (openEntryRes.data as OpenEntry | null) ?? null;
      setOpenEntry(currentOpenEntry);

      if (openEntryRes.data?.site_id) {
        setSiteId(openEntryRes.data.site_id as string);
      } else if ((sitesRes.data ?? []).length > 0) {
        setSiteId((sitesRes.data as SiteOption[])[0]?.id ?? '');
      } else {
        setSiteId('');
      }

      if (currentOpenEntry) {
        const { data: breakRowsData, error: breakRowsError } = await supabase
          .from('time_events')
          .select('event_type, recorded_at')
          .eq('staff_id', parsedStaff.id)
          .in('event_type', ['BREAK_START', 'BREAK_END'])
          .gte('recorded_at', currentOpenEntry.start_at)
          .order('recorded_at', { ascending: true });

        if (!breakRowsError) {
          const parsedBreakRows = (breakRowsData ?? []) as BreakEventRow[];
          const summary = summarizeBreaks(parsedBreakRows);
          setBreakEvents(parsedBreakRows);
          setBreakSummary(summary);
          setBreakNow(new Date().toISOString());
          if (currentOpenEntry.break_minutes !== summary.completedMinutes) {
            await supabase
              .from('time_entries')
              .update({ break_minutes: summary.completedMinutes })
              .eq('id', currentOpenEntry.id);
          }
        } else {
          setBreakEvents([]);
          setBreakSummary(EMPTY_BREAK_SUMMARY);
        }
      } else {
        setBreakEvents([]);
        setBreakSummary(EMPTY_BREAK_SUMMARY);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadContext();
  }, [loadContext]);

  useEffect(() => {
    if (!breakSummary.onBreak) return;
    const interval = setInterval(() => {
      setBreakNow(new Date().toISOString());
    }, 30_000);
    return () => clearInterval(interval);
  }, [breakSummary.onBreak]);

  const activeBreakMinutes = useMemo(() => {
    if (!breakSummary.onBreak || !breakSummary.activeStartAt) return 0;
    return diffMinutes(breakSummary.activeStartAt, breakNow);
  }, [breakNow, breakSummary.activeStartAt, breakSummary.onBreak]);

  const totalBreakMinutesLive = useMemo(
    () => breakSummary.completedMinutes + activeBreakMinutes,
    [activeBreakMinutes, breakSummary.completedMinutes],
  );

  const openVerificationDrawer = useCallback(() => {
    const nextType: VerificationType = openEntry ? 'CHECK_OUT' : 'CHECK_IN';
    if (nextType === 'CHECK_OUT' && openEntry?.site_id) {
      setSiteId(openEntry.site_id);
    } else if (!siteId && sites.length > 0) {
      setSiteId(sites[0]!.id);
    }

    setNotes('');
    geolocation.clear();
    camera.clear();
    setDrawerOpen(true);
  }, [camera, geolocation, openEntry, siteId, sites]);

  const closeVerificationDrawer = useCallback(() => {
    if (submitting) return;
    setDrawerOpen(false);
    setNotes('');
    geolocation.clear();
    camera.clear();
  }, [camera, geolocation, submitting]);

  const captureLocation = useCallback(async () => {
    try {
      await geolocation.capture({
        geofence: selectedSite
          ? {
            lat: selectedSite.geofence_center_lat,
            lng: selectedSite.geofence_center_lng,
            radiusMeters: selectedSite.geofence_radius_meters,
          }
          : null,
      });
      toast.success('GPS location captured.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to capture GPS location.';
      toast.error(message);
    }
  }, [geolocation, selectedSite]);

  const handleSubmit = useCallback(async () => {
    if (!staff) {
      toast.error('No staff profile found for this user.');
      return;
    }

    if (!geolocation.reading) {
      toast.error('Capture GPS location before submitting.');
      return;
    }

    if (!camera.file) {
      toast.error('Capture a selfie before submitting.');
      return;
    }

    if (verificationType === 'CHECK_IN' && !siteId) {
      toast.error('Select a site before clocking in.');
      return;
    }

    if (verificationType === 'CHECK_OUT' && !openEntry) {
      toast.error('No active time entry found.');
      return;
    }

    const supabase = getSupabaseBrowserClient();
    const now = new Date().toISOString();
    const targetSiteId = verificationType === 'CHECK_OUT'
      ? ((openEntry?.site_id ?? siteId) || null)
      : (siteId || null);

    setSubmitting(true);
    let uploadedSelfiePath: string | null = null;
    const createdEventIds: string[] = [];

    try {
      const fileExtension = camera.file.name.includes('.')
        ? camera.file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
        : 'jpg';

      uploadedSelfiePath = `timekeeping/${staff.tenant_id}/${staff.id}/${Date.now()}-${verificationType.toLowerCase()}.${fileExtension}`;

      const { error: uploadError } = await supabase
        .storage
        .from('time-verification-selfies')
        .upload(uploadedSelfiePath, camera.file, {
          cacheControl: '3600',
          upsert: false,
          contentType: camera.file.type || undefined,
        });

      if (uploadError) {
        throw new Error(`Unable to upload selfie evidence: ${uploadError.message}`);
      }

      const locationPayload = {
        lat: geolocation.reading.lat,
        lng: geolocation.reading.lng,
        accuracy_meters: geolocation.reading.accuracy,
        captured_at: now,
        distance_to_geofence_meters: geolocation.reading.distanceToGeofenceMeters,
        is_within_geofence: geolocation.reading.isWithinGeofence,
        selfie: {
          storage_bucket: 'time-verification-selfies',
          storage_path: uploadedSelfiePath,
          original_filename: camera.file.name,
          mime_type: camera.file.type,
        },
      };

      let checkoutBreakSummary = breakSummary;

      if (verificationType === 'CHECK_OUT' && openEntry && checkoutBreakSummary.onBreak) {
        const { data: autoBreakEndEvent, error: autoBreakEndError } = await supabase
          .from('time_events')
          .insert({
            tenant_id: staff.tenant_id,
            staff_id: staff.id,
            site_id: targetSiteId,
            event_type: 'BREAK_END',
            recorded_at: now,
            lat: geolocation.reading.lat,
            lng: geolocation.reading.lng,
            accuracy_meters: geolocation.reading.accuracy,
            is_within_geofence: geolocation.reading.isWithinGeofence,
            pin_used: false,
            notes: formatTimeEventNotes({
              source: 'STAFF_HOME',
              action: 'AUTO_END_ON_CLOCK_OUT',
            }),
          })
          .select('id')
          .single();

        if (autoBreakEndError || !autoBreakEndEvent) {
          throw new Error(autoBreakEndError?.message ?? 'Unable to close active break before clock out.');
        }
        createdEventIds.push(autoBreakEndEvent.id);
        const eventsWithAutoClose: BreakEventRow[] = [...breakEvents, { event_type: 'BREAK_END', recorded_at: now }];
        checkoutBreakSummary = summarizeBreaks(eventsWithAutoClose, now);
        setBreakEvents(eventsWithAutoClose);
        setBreakSummary(checkoutBreakSummary);
      }

      const { data: timeEvent, error: eventError } = await supabase
        .from('time_events')
        .insert({
          tenant_id: staff.tenant_id,
          staff_id: staff.id,
          site_id: targetSiteId,
          event_type: verificationType,
          recorded_at: now,
          lat: geolocation.reading.lat,
          lng: geolocation.reading.lng,
          accuracy_meters: geolocation.reading.accuracy,
          is_within_geofence: geolocation.reading.isWithinGeofence,
          pin_used: false,
          notes: formatTimeEventNotes(notes),
        })
        .select('id')
        .single();

      if (eventError || !timeEvent) {
        throw new Error(eventError?.message ?? 'Unable to write time event.');
      }
      createdEventIds.push(timeEvent.id);

      if (verificationType === 'CHECK_IN') {
        const { error: insertError } = await supabase
          .from('time_entries')
          .insert({
            tenant_id: staff.tenant_id,
            staff_id: staff.id,
            site_id: targetSiteId,
            check_in_event_id: timeEvent.id,
            start_at: now,
            break_minutes: 0,
            status: 'OPEN',
            clock_in: now,
            clock_in_at: now,
            clock_in_location: {
              check_in: locationPayload,
            },
          });

        if (insertError) {
          throw new Error(insertError.message);
        }
      } else if (openEntry) {
        const shiftMinutes = Math.max(
          0,
          Math.round((new Date(now).getTime() - new Date(openEntry.start_at).getTime()) / 60_000),
        );
        const totalBreakMinutesAtCheckout = checkoutBreakSummary.totalMinutes;
        const durationMinutes = Math.max(0, shiftMinutes - totalBreakMinutesAtCheckout);

        const { error: updateError } = await supabase
          .from('time_entries')
          .update({
            check_out_event_id: timeEvent.id,
            end_at: now,
            break_minutes: totalBreakMinutesAtCheckout,
            duration_minutes: durationMinutes,
            status: 'CLOSED',
            clock_out: now,
            clock_out_at: now,
            clock_out_location: locationPayload,
          })
          .eq('id', openEntry.id);

        if (updateError) {
          throw new Error(updateError.message);
        }
        setBreakEvents([]);
        setBreakSummary(EMPTY_BREAK_SUMMARY);
      }

      toast.success(verificationType === 'CHECK_IN' ? 'Clock in recorded.' : 'Clock out recorded.');
      closeVerificationDrawer();
      await loadContext();
      onStatusChange?.();
    } catch (error) {
      if (uploadedSelfiePath) {
        await supabase.storage.from('time-verification-selfies').remove([uploadedSelfiePath]);
      }
      if (createdEventIds.length) {
        await supabase.from('time_events').delete().in('id', createdEventIds);
      }
      const message = error instanceof Error ? error.message : 'Unable to submit verification.';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }, [
    camera.file,
    closeVerificationDrawer,
    geolocation.reading,
    loadContext,
    notes,
    onStatusChange,
    breakEvents,
    breakSummary,
    openEntry,
    siteId,
    staff,
    verificationType,
  ]);

  const handleBreakAction = useCallback(async (action: 'START' | 'END') => {
    if (!staff || !openEntry) {
      toast.error('Clock in before recording breaks.');
      return;
    }

    if (action === 'START' && breakSummary.onBreak) {
      toast.error('A break is already active.');
      return;
    }

    if (action === 'END' && !breakSummary.onBreak) {
      toast.error('No active break to end.');
      return;
    }

    setBreakSubmitting(true);
    const supabase = getSupabaseBrowserClient();
    const now = new Date().toISOString();

    let location = null as {
      lat: number;
      lng: number;
      accuracy: number;
      isWithinGeofence: boolean | null;
    } | null;

    try {
      const reading = await geolocation.capture({
        geofence: activeSite
          ? {
            lat: activeSite.geofence_center_lat,
            lng: activeSite.geofence_center_lng,
            radiusMeters: activeSite.geofence_radius_meters,
          }
          : null,
      });

      location = {
        lat: reading.lat,
        lng: reading.lng,
        accuracy: reading.accuracy,
        isWithinGeofence: reading.isWithinGeofence,
      };
    } catch {
      location = null;
    }

    try {
      const eventType: BreakEventRow['event_type'] = action === 'START' ? 'BREAK_START' : 'BREAK_END';
      const { error: breakEventError } = await supabase
        .from('time_events')
        .insert({
          tenant_id: staff.tenant_id,
          staff_id: staff.id,
          site_id: openEntry.site_id,
          event_type: eventType,
          recorded_at: now,
          lat: location?.lat ?? null,
          lng: location?.lng ?? null,
          accuracy_meters: location?.accuracy ?? null,
          is_within_geofence: location?.isWithinGeofence ?? null,
          pin_used: false,
          notes: formatTimeEventNotes({
            source: 'STAFF_HOME',
            action,
          }),
        });

      if (breakEventError) {
        throw new Error(breakEventError.message);
      }

      const nextBreakEvents: BreakEventRow[] = [...breakEvents, { event_type: eventType, recorded_at: now }];
      const nextSummary = summarizeBreaks(nextBreakEvents, now);
      const { error: updateError } = await supabase
        .from('time_entries')
        .update({ break_minutes: nextSummary.completedMinutes })
        .eq('id', openEntry.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      setBreakEvents(nextBreakEvents);
      setBreakSummary(nextSummary);
      setBreakNow(now);
      toast.success(action === 'START' ? 'Break started.' : 'Break ended.');
      await loadContext();
      onStatusChange?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to record break event.';
      toast.error(message);
    } finally {
      setBreakSubmitting(false);
    }
  }, [activeSite, breakEvents, breakSummary.onBreak, geolocation, loadContext, onStatusChange, openEntry, staff]);

  const siteOptions = useMemo(
    () => sites.map((site) => ({
      value: site.id,
      label: site.site_code ? `${site.site_code} - ${site.name}` : site.name,
    })),
    [sites],
  );

  return (
    <>
      <Button
        onClick={openVerificationDrawer}
        disabled={loading || !staff || breakSubmitting}
        className={[
          'h-16 w-full text-base font-semibold sm:text-lg',
          isClockedIn
            ? 'bg-red-600 text-white hover:bg-red-500'
            : 'bg-green-600 text-white hover:bg-green-500',
        ].join(' ')}
      >
        {isClockedIn ? <LogOut className="h-5 w-5" /> : <LogIn className="h-5 w-5" />}
        {isClockedIn ? 'Clock Out' : 'Clock In'}
      </Button>

      <p className="mt-2 text-center text-xs text-muted-foreground">
        {loading
          ? 'Loading timekeeping status...'
          : !staff
            ? 'No staff profile linked to this account.'
            : isClockedIn
              ? `Active shift started at ${new Date(openEntry?.start_at ?? '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              : 'Ready to start your shift'}
      </p>

      {isClockedIn ? (
        <div className="mt-3 space-y-2">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => void handleBreakAction('START')}
              disabled={breakSummary.onBreak || breakSubmitting || submitting}
            >
              <PauseCircle className="mr-1.5 h-4 w-4" />
              Start Break
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => void handleBreakAction('END')}
              disabled={!breakSummary.onBreak || breakSubmitting || submitting}
            >
              <PlayCircle className="mr-1.5 h-4 w-4" />
              End Break
            </Button>
          </div>
          <p className="text-xs text-center text-muted-foreground">
            {breakSummary.onBreak
              ? `On break for ${formatMinutes(activeBreakMinutes)} · total break ${formatMinutes(totalBreakMinutesLive)}`
              : `Total break time this shift: ${formatMinutes(totalBreakMinutesLive)}`}
          </p>
        </div>
      ) : null}

      <SlideOver
        open={drawerOpen}
        onClose={closeVerificationDrawer}
        title={verificationType === 'CHECK_IN' ? 'Clock In Verification' : 'Clock Out Verification'}
        subtitle={staff ? `${staff.full_name} (${staff.staff_code})` : undefined}
      >
        <div className="space-y-4">
          {verificationType === 'CHECK_IN' ? (
            <Select
              label="Site"
              value={siteId}
              onChange={(event) => setSiteId(event.target.value)}
              options={siteOptions}
              required
            />
          ) : (
            <Input
              label="Site"
              value={selectedSite?.site_code ? `${selectedSite.site_code} - ${selectedSite.name}` : selectedSite?.name ?? 'No site'}
              readOnly
            />
          )}

          <div className="rounded-xl border border-border bg-muted/10 p-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-foreground">GPS Verification</h3>
              <GpsLocationBadge reading={geolocation.reading} capturing={geolocation.capturing} error={geolocation.error} />
            </div>

            <p className="mt-2 text-xs text-muted-foreground">
              Capture your live location to verify this clock event.
            </p>

            <Button
              type="button"
              variant="secondary"
              className="mt-3 w-full"
              onClick={() => void captureLocation()}
              loading={geolocation.capturing}
            >
              <Crosshair className="h-4 w-4" />
              Capture GPS
            </Button>
          </div>

          <div className="rounded-xl border border-border bg-muted/10 p-3">
            <h3 className="text-sm font-semibold text-foreground">Selfie Verification</h3>
            <p className="mt-2 text-xs text-muted-foreground">
              Required for clock-in and clock-out verification.
            </p>
            <Input
              className="mt-3"
              type="file"
              accept="image/*"
              capture="user"
              onChange={camera.handleFileInputChange}
            />
            {camera.error ? (
              <p className="mt-2 text-xs font-medium text-destructive">{camera.error}</p>
            ) : null}

            {camera.previewUrl ? (
              <div className="relative mt-3 h-36 w-28 overflow-hidden rounded-lg border border-border">
                <Image src={camera.previewUrl} alt="Selfie preview" fill className="object-cover" unoptimized />
              </div>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">No selfie captured yet.</p>
            )}
          </div>

          <Textarea
            label="Notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Optional note for this clock event..."
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={closeVerificationDrawer} disabled={submitting}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleSubmit()} loading={submitting}>
              {verificationType === 'CHECK_IN' ? 'Confirm Clock In' : 'Confirm Clock Out'}
            </Button>
          </div>
        </div>
      </SlideOver>
    </>
  );
}
