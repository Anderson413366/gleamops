'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Clock, Crosshair, LogIn, LogOut, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
  EmptyState, Badge, Pagination, TableSkeleton, Button, ExportButton, SlideOver, Select,
} from '@gleamops/ui';
import { TIME_ENTRY_STATUS_COLORS } from '@gleamops/shared';
import type { TimeEntry } from '@gleamops/shared';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';
import { EntityLink } from '@/components/links/entity-link';

interface EntryWithRelations extends TimeEntry {
  staff?: { staff_code: string; full_name: string } | null;
  ticket?: { ticket_code: string } | null;
  site?: { name: string; site_code?: string | null } | null;
}

interface TimeEntriesTableProps {
  search: string;
  onRefresh?: () => void;
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
  site_code: string;
  geofence_center_lat: number | null;
  geofence_center_lng: number | null;
  geofence_radius_meters: number | null;
}

interface OpenEntry {
  id: string;
  start_at: string;
  site_id: string | null;
}

interface VerificationLocation {
  lat: number;
  lng: number;
  accuracy: number;
  capturedAt: string;
  distanceToGeofenceMeters: number | null;
  isWithinGeofence: boolean | null;
}

type VerificationEventType = 'CHECK_IN' | 'CHECK_OUT';

function toRad(value: number): number {
  return (value * Math.PI) / 180;
}

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const earthRadiusMeters = 6_371_000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusMeters * c;
}

function formatDurationFromStart(startAt: string): string {
  const diffMs = Date.now() - new Date(startAt).getTime();
  if (diffMs <= 0) return '0m';
  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

export default function TimeEntriesTable({ search, onRefresh }: TimeEntriesTableProps) {
  const [rows, setRows] = useState<EntryWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<EntryWithRelations | null>(null);

  const [currentStaff, setCurrentStaff] = useState<StaffContext | null>(null);
  const [openEntry, setOpenEntry] = useState<OpenEntry | null>(null);
  const [sites, setSites] = useState<SiteOption[]>([]);

  const [verificationOpen, setVerificationOpen] = useState(false);
  const [verificationType, setVerificationType] = useState<VerificationEventType>('CHECK_IN');
  const [verificationSiteId, setVerificationSiteId] = useState('');
  const [verificationLocation, setVerificationLocation] = useState<VerificationLocation | null>(null);
  const [verificationSelfie, setVerificationSelfie] = useState<File | null>(null);
  const [verificationSelfiePreview, setVerificationSelfiePreview] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [submittingVerification, setSubmittingVerification] = useState(false);

  const clearSelfiePreview = useCallback(() => {
    setVerificationSelfiePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, []);

  const resetVerificationState = useCallback(() => {
    setVerificationSiteId('');
    setVerificationLocation(null);
    setVerificationSelfie(null);
    setLocationError(null);
    clearSelfiePreview();
  }, [clearSelfiePreview]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    let staffContext: StaffContext | null = null;

    if (user) {
      const { data: staffRow } = await supabase
        .from('staff')
        .select('id, tenant_id, full_name, staff_code')
        .eq('user_id', user.id)
        .is('archived_at', null)
        .maybeSingle();

      if (staffRow) {
        staffContext = staffRow as StaffContext;
      }
    }

    setCurrentStaff(staffContext);

    const [entriesRes, sitesRes, openRes] = await Promise.all([
      supabase
        .from('time_entries')
        .select(`
          *,
          staff:staff_id(staff_code, full_name),
          ticket:ticket_id(ticket_code),
          site:site_id(name, site_code)
        `)
        .is('archived_at', null)
        .order('start_at', { ascending: false })
        .limit(200),
      supabase
        .from('sites')
        .select('id, name, site_code, geofence_center_lat, geofence_center_lng, geofence_radius_meters')
        .is('archived_at', null)
        .order('name', { ascending: true }),
      staffContext
        ? supabase
          .from('time_entries')
          .select('id, start_at, site_id')
          .eq('staff_id', staffContext.id)
          .eq('status', 'OPEN')
          .is('archived_at', null)
          .order('start_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

    if (!entriesRes.error && entriesRes.data) {
      setRows(entriesRes.data as unknown as EntryWithRelations[]);
    } else {
      setRows([]);
    }

    if (!sitesRes.error && sitesRes.data) {
      setSites(sitesRes.data as unknown as SiteOption[]);
    } else {
      setSites([]);
    }

    if (openRes && !openRes.error && openRes.data) {
      setOpenEntry(openRes.data as OpenEntry);
    } else {
      setOpenEntry(null);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    return () => {
      if (verificationSelfiePreview) {
        URL.revokeObjectURL(verificationSelfiePreview);
      }
    };
  }, [verificationSelfiePreview]);

  const selectedSite = useMemo(
    () => sites.find((site) => site.id === verificationSiteId) ?? null,
    [sites, verificationSiteId]
  );

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.staff?.full_name?.toLowerCase().includes(q)
        || r.staff?.staff_code?.toLowerCase().includes(q)
        || r.ticket?.ticket_code?.toLowerCase().includes(q)
        || r.site?.name?.toLowerCase().includes(q)
        || r.status.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    filtered as unknown as Record<string, unknown>[],
    'start_at',
    'asc'
  );
  const sortedRows = sorted as unknown as EntryWithRelations[];
  const pag = usePagination(sortedRows, 25);

  const openVerification = (type: VerificationEventType) => {
    setVerificationType(type);
    resetVerificationState();

    if (type === 'CHECK_OUT' && openEntry?.site_id) {
      setVerificationSiteId(openEntry.site_id);
    }

    setVerificationOpen(true);
  };

  const captureLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not available in this browser.');
      return;
    }

    setLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        let distanceToGeofenceMeters: number | null = null;
        let isWithinGeofence: boolean | null = null;

        if (
          selectedSite
          && selectedSite.geofence_center_lat != null
          && selectedSite.geofence_center_lng != null
          && selectedSite.geofence_radius_meters != null
        ) {
          distanceToGeofenceMeters = haversineMeters(
            position.coords.latitude,
            position.coords.longitude,
            selectedSite.geofence_center_lat,
            selectedSite.geofence_center_lng,
          );
          isWithinGeofence = distanceToGeofenceMeters <= selectedSite.geofence_radius_meters;
        }

        setVerificationLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          capturedAt: new Date().toISOString(),
          distanceToGeofenceMeters,
          isWithinGeofence,
        });

        setLocating(false);
      },
      (error) => {
        setLocationError(error.message || 'Unable to capture GPS location.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  }, [selectedSite]);

  const handleSelfieChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      setVerificationSelfie(null);
      clearSelfiePreview();
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Selfie must be an image file.');
      event.target.value = '';
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      toast.error('Selfie must be under 8MB.');
      event.target.value = '';
      return;
    }

    clearSelfiePreview();
    const preview = URL.createObjectURL(file);
    setVerificationSelfie(file);
    setVerificationSelfiePreview(preview);
  };

  const submitVerification = async () => {
    if (!currentStaff) {
      toast.error('Your user is not linked to an active staff profile.');
      return;
    }

    if (!verificationLocation) {
      toast.error('Capture GPS location before submitting.');
      return;
    }

    if (!verificationSelfie) {
      toast.error('Capture a selfie before submitting.');
      return;
    }

    if (verificationType === 'CHECK_OUT' && !openEntry) {
      toast.error('No open time entry found to clock out.');
      return;
    }

    setSubmittingVerification(true);
    let uploadedSelfiePath: string | null = null;

    try {
      const supabase = getSupabaseBrowserClient();
      const now = new Date().toISOString();
      const siteId = verificationSiteId || openEntry?.site_id || null;

      const selfieExt = verificationSelfie.name.includes('.')
        ? verificationSelfie.name.split('.').pop()?.toLowerCase() ?? 'jpg'
        : 'jpg';
      const selfiePath = `timekeeping/${currentStaff.tenant_id}/${currentStaff.id}/${Date.now()}-${verificationType.toLowerCase()}.${selfieExt}`;

      const { error: selfieUploadError } = await supabase
        .storage
        .from('time-verification-selfies')
        .upload(selfiePath, verificationSelfie, {
          contentType: verificationSelfie.type || 'image/jpeg',
          upsert: false,
        });

      if (selfieUploadError) {
        throw new Error(`Unable to upload selfie evidence: ${selfieUploadError.message}`);
      }
      uploadedSelfiePath = selfiePath;

      const verificationNotes = {
        verification_mode: 'SELFIE_GPS',
        selfie: {
          file_name: verificationSelfie.name,
          mime_type: verificationSelfie.type,
          size_bytes: verificationSelfie.size,
          storage_bucket: 'time-verification-selfies',
          storage_path: selfiePath,
        },
        gps: {
          lat: verificationLocation.lat,
          lng: verificationLocation.lng,
          accuracy_meters: verificationLocation.accuracy,
          captured_at: verificationLocation.capturedAt,
          is_within_geofence: verificationLocation.isWithinGeofence,
          distance_to_geofence_meters: verificationLocation.distanceToGeofenceMeters,
        },
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      };

      const { data: timeEvent, error: eventError } = await supabase
        .from('time_events')
        .insert({
          tenant_id: currentStaff.tenant_id,
          staff_id: currentStaff.id,
          site_id: siteId,
          event_type: verificationType,
          recorded_at: now,
          lat: verificationLocation.lat,
          lng: verificationLocation.lng,
          accuracy_meters: verificationLocation.accuracy,
          is_within_geofence: verificationLocation.isWithinGeofence,
          pin_used: false,
          notes: verificationNotes,
        })
        .select('id')
        .single();

      if (eventError || !timeEvent) {
        throw new Error(eventError?.message ?? 'Unable to write time event.');
      }

      if (verificationType === 'CHECK_IN') {
        const { error: entryInsertError } = await supabase
          .from('time_entries')
          .insert({
            tenant_id: currentStaff.tenant_id,
            staff_id: currentStaff.id,
            site_id: siteId,
            check_in_event_id: timeEvent.id,
            start_at: now,
            break_minutes: 0,
            status: 'OPEN',
          });

        if (entryInsertError) {
          throw new Error(entryInsertError.message);
        }
      } else if (openEntry) {
        const durationMinutes = Math.max(
          0,
          Math.round((new Date(now).getTime() - new Date(openEntry.start_at).getTime()) / 60000)
        );

        const { error: entryUpdateError } = await supabase
          .from('time_entries')
          .update({
            check_out_event_id: timeEvent.id,
            end_at: now,
            duration_minutes: durationMinutes,
            status: 'CLOSED',
          })
          .eq('id', openEntry.id);

        if (entryUpdateError) {
          throw new Error(entryUpdateError.message);
        }
      }

      toast.success(verificationType === 'CHECK_IN' ? 'Clock in recorded.' : 'Clock out recorded.');
      setVerificationOpen(false);
      resetVerificationState();
      await fetchData();
      onRefresh?.();
    } catch (error) {
      if (uploadedSelfiePath) {
        const supabase = getSupabaseBrowserClient();
        await supabase.storage.from('time-verification-selfies').remove([uploadedSelfiePath]);
      }
      const message = error instanceof Error ? error.message : 'Unable to submit verification.';
      toast.error(message);
    } finally {
      setSubmittingVerification(false);
    }
  };

  const closeVerification = () => {
    if (submittingVerification) return;
    setVerificationOpen(false);
    resetVerificationState();
  };

  if (loading) return <TableSkeleton rows={6} cols={7} />;

  const isClockedIn = Boolean(openEntry);
  const actionLabel = isClockedIn ? 'Clock Out' : 'Clock In';

  return (
    <div>
      <div className="mb-4 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
        <div className="rounded-xl border border-border bg-muted/20 p-4 sm:p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Clock-In Verification</p>
          <h3 className="mt-1 text-base font-semibold text-foreground">
            {currentStaff ? `Active for ${currentStaff.full_name}` : 'Staff Profile Required'}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {isClockedIn && openEntry
              ? `Currently clocked in for ${formatDurationFromStart(openEntry.start_at)}.`
              : 'Currently off the clock.'}
          </p>

          <Button
            className="mt-4 h-16 w-full justify-center text-lg font-semibold sm:w-72"
            variant={isClockedIn ? 'secondary' : 'primary'}
            onClick={() => openVerification(isClockedIn ? 'CHECK_OUT' : 'CHECK_IN')}
            disabled={!currentStaff || submittingVerification}
          >
            {isClockedIn ? <LogOut className="mr-2 h-5 w-5" /> : <LogIn className="mr-2 h-5 w-5" />}
            {actionLabel}
          </Button>

          <p className="mt-2 text-xs text-muted-foreground">
            Requires GPS capture and selfie verification before event submission.
          </p>
        </div>

        <div className="flex items-center justify-end">
          <ExportButton
            data={filtered as unknown as Record<string, unknown>[]}
            filename="time-entries"
            columns={[
              { key: 'start_at', label: 'Start' },
              { key: 'end_at', label: 'End' },
              { key: 'duration_minutes', label: 'Duration (min)' },
              { key: 'status', label: 'Status' },
            ]}
            onExported={(count, file) => toast.success(`Exported ${count} records to ${file}`)}
          />
        </div>
      </div>

      <div className="w-full overflow-x-auto">
        <Table className="w-full min-w-full">
          <TableHeader>
            <tr>
              <TableHead sortable sorted={sortKey === 'start_at' && sortDir} onSort={() => onSort('start_at')}>Date</TableHead>
              <TableHead>Staff</TableHead>
              <TableHead>Ticket</TableHead>
              <TableHead>Site</TableHead>
              <TableHead>Start</TableHead>
              <TableHead>End</TableHead>
              <TableHead>Duration</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {pag.page.map((row) => (
              <TableRow key={row.id} className="cursor-pointer" onClick={() => setSelected(row)}>
                <TableCell>{new Date(row.start_at).toLocaleDateString()}</TableCell>
                <TableCell className="font-medium">
                  {row.staff?.staff_code ? (
                    <EntityLink
                      entityType="staff"
                      code={row.staff.staff_code}
                      name={row.staff.full_name ?? row.staff.staff_code}
                      showCode={false}
                      stopPropagation
                    />
                  ) : (
                    row.staff?.full_name ?? '—'
                  )}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {row.ticket?.ticket_code ? (
                    <Link
                      href={`/operations/tickets/${encodeURIComponent(row.ticket.ticket_code)}`}
                      className="text-blue-600 hover:text-blue-800 hover:underline"
                      onClick={(event) => event.stopPropagation()}
                    >
                      {row.ticket.ticket_code}
                    </Link>
                  ) : '—'}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {row.site?.site_code ? (
                    <EntityLink
                      entityType="site"
                      code={row.site.site_code}
                      name={row.site.name ?? row.site.site_code}
                      showCode={false}
                      stopPropagation
                    />
                  ) : (
                    row.site?.name ?? '—'
                  )}
                </TableCell>
                <TableCell className="text-xs">{new Date(row.start_at).toLocaleTimeString()}</TableCell>
                <TableCell className="text-xs">{row.end_at ? new Date(row.end_at).toLocaleTimeString() : '—'}</TableCell>
                <TableCell>
                  {row.duration_minutes != null
                    ? `${Math.floor(row.duration_minutes / 60)}h ${row.duration_minutes % 60}m`
                    : '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {filtered.length === 0 && (
        <div className="mt-4">
          <EmptyState
            icon={<Clock className="h-12 w-12" />}
            title="No time entries"
            description={search ? 'Try a different search term.' : 'Clock in to start tracking time.'}
          />
        </div>
      )}
      {filtered.length > 0 && (
        <Pagination
          currentPage={pag.currentPage}
          totalPages={pag.totalPages}
          totalItems={pag.totalItems}
          pageSize={pag.pageSize}
          hasNext={pag.hasNext}
          hasPrev={pag.hasPrev}
          onNext={pag.nextPage}
          onPrev={pag.prevPage}
        />
      )}

      <SlideOver
        open={verificationOpen}
        onClose={closeVerification}
        title={verificationType === 'CHECK_IN' ? 'Clock In Verification' : 'Clock Out Verification'}
        subtitle="GPS + selfie verification"
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/20 p-3 text-sm text-muted-foreground">
            <div className="inline-flex items-center gap-1.5 text-foreground">
              <ShieldCheck className="h-4 w-4" />
              <span className="font-medium">Verification required</span>
            </div>
            <p className="mt-1">Capture GPS and selfie before submitting this time event.</p>
          </div>

          <Select
            label="Site"
            value={verificationSiteId}
            onChange={(event) => {
              setVerificationSiteId(event.target.value);
              setVerificationLocation(null);
              setLocationError(null);
            }}
            options={[
              { value: '', label: verificationType === 'CHECK_OUT' ? 'Use active entry site' : 'No site selected' },
              ...sites.map((site) => ({
                value: site.id,
                label: `${site.site_code} - ${site.name}`,
              })),
            ]}
          />

          <div className="space-y-2 rounded-lg border border-border p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">GPS Capture</p>
              <Button type="button" variant="secondary" onClick={() => void captureLocation()} disabled={locating}>
                <Crosshair className="mr-1.5 h-4 w-4" />
                {locating ? 'Capturing...' : 'Capture GPS'}
              </Button>
            </div>

            {verificationLocation ? (
              <div className="rounded-md bg-muted/30 p-2 text-xs text-muted-foreground">
                <p>
                  Lat {verificationLocation.lat.toFixed(6)}, Lng {verificationLocation.lng.toFixed(6)}
                  {' '}({`±${verificationLocation.accuracy.toFixed(1)}m`})
                </p>
                {verificationLocation.distanceToGeofenceMeters != null && verificationLocation.isWithinGeofence != null && (
                  <p className={verificationLocation.isWithinGeofence ? 'text-green-700 dark:text-green-400' : 'text-amber-700 dark:text-amber-400'}>
                    {verificationLocation.isWithinGeofence ? 'Within geofence' : 'Outside geofence'}
                    {' '}by {verificationLocation.distanceToGeofenceMeters.toFixed(1)}m
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No GPS captured yet.</p>
            )}

            {locationError && <p className="text-xs text-destructive">{locationError}</p>}
          </div>

          <div className="space-y-2 rounded-lg border border-border p-3">
            <label className="text-sm font-medium text-foreground" htmlFor="timekeeping-selfie-input">
              Selfie Verification
            </label>
            <input
              id="timekeeping-selfie-input"
              type="file"
              accept="image/*"
              capture="user"
              onChange={handleSelfieChange}
              className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm file:font-medium"
            />
            {verificationSelfiePreview ? (
              <Image
                src={verificationSelfiePreview}
                alt="Selfie preview"
                className="h-44 w-full rounded-md border border-border object-cover"
                width={640}
                height={352}
                unoptimized
              />
            ) : (
              <p className="text-xs text-muted-foreground">No selfie captured yet.</p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={closeVerification} disabled={submittingVerification}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void submitVerification()} loading={submittingVerification}>
              {verificationType === 'CHECK_IN' ? 'Confirm Clock In' : 'Confirm Clock Out'}
            </Button>
          </div>
        </div>
      </SlideOver>

      <SlideOver
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `Time Entry ${selected.staff?.full_name ?? ''}`.trim() : 'Time Entry'}
        subtitle={selected?.ticket?.ticket_code ? `Ticket ${selected.ticket.ticket_code}` : undefined}
      >
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Status</span>
                <Badge color={TIME_ENTRY_STATUS_COLORS[selected.status] ?? 'gray'}>{selected.status}</Badge>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Site</span>
                <span className="font-medium text-right">
                  {selected.site?.site_code ? (
                    <EntityLink
                      entityType="site"
                      code={selected.site.site_code}
                      name={selected.site.name ?? selected.site.site_code}
                      showCode={false}
                    />
                  ) : (
                    selected.site?.name ?? '—'
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Start</span>
                <span className="font-medium text-right">{new Date(selected.start_at).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">End</span>
                <span className="font-medium text-right">{selected.end_at ? new Date(selected.end_at).toLocaleString() : '—'}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Duration</span>
                <span className="font-medium text-right">
                  {selected.duration_minutes != null
                    ? `${Math.floor(selected.duration_minutes / 60)}h ${selected.duration_minutes % 60}m`
                    : '—'}
                </span>
              </div>
            </div>
          </div>
        )}
      </SlideOver>
    </div>
  );
}
