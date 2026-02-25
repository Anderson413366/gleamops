'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Clock3, Package, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ChipTabs,
  Input,
  Select,
  Textarea,
} from '@gleamops/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';

type SelfServiceType = 'supply' | 'time-off' | 'equipment';
type RequestUrgency = 'asap' | 'high' | 'normal';

interface FormsHubProps {
  search: string;
}

interface SiteOption {
  id: string;
  name: string;
  site_code: string;
}

interface RecentRequest {
  id: string;
  title: string;
  siteName: string;
  submittedBy: string;
  urgency: RequestUrgency;
  createdAt: string;
}

const FORM_TABS = [
  { key: 'supply', label: 'Supply Request', icon: <Package className="h-4 w-4" /> },
  { key: 'time-off', label: 'Time Off Request', icon: <Clock3 className="h-4 w-4" /> },
  { key: 'equipment', label: 'Equipment Issue', icon: <Wrench className="h-4 w-4" /> },
] as const;

const URGENCY_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'asap', label: 'ASAP' },
];

const TIME_OFF_TYPE_OPTIONS = [
  { value: 'PTO', label: 'PTO' },
  { value: 'SICK', label: 'Sick' },
  { value: 'PERSONAL', label: 'Personal' },
];

function urgencyToSeverity(urgency: RequestUrgency): 'INFO' | 'WARNING' | 'CRITICAL' {
  if (urgency === 'asap') return 'CRITICAL';
  if (urgency === 'high') return 'WARNING';
  return 'INFO';
}

function urgencyTone(urgency: RequestUrgency): 'red' | 'yellow' | 'blue' {
  if (urgency === 'asap') return 'red';
  if (urgency === 'high') return 'yellow';
  return 'blue';
}

function parseRequestBody(body: string | null): Record<string, unknown> {
  if (!body) return {};
  try {
    const parsed = JSON.parse(body);
    return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

export function FormsHub({ search }: FormsHubProps) {
  const { tenantId, user } = useAuth();
  const [activeForm, setActiveForm] = useState<SelfServiceType>('supply');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const [sites, setSites] = useState<SiteOption[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState('');

  const [supplyItem, setSupplyItem] = useState('');
  const [supplyQuantity, setSupplyQuantity] = useState('1');
  const [supplyNotes, setSupplyNotes] = useState('');

  const [timeOffStart, setTimeOffStart] = useState('');
  const [timeOffEnd, setTimeOffEnd] = useState('');
  const [timeOffType, setTimeOffType] = useState('PTO');
  const [timeOffReason, setTimeOffReason] = useState('');

  const [equipmentName, setEquipmentName] = useState('');
  const [equipmentSeverity, setEquipmentSeverity] = useState('high');
  const [equipmentDescription, setEquipmentDescription] = useState('');

  const [urgency, setUrgency] = useState<RequestUrgency>('normal');
  const [recentRequests, setRecentRequests] = useState<RecentRequest[]>([]);

  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const loadData = useCallback(async () => {
    setLoading(true);

    const [sitesRes, requestsRes] = await Promise.all([
      supabase
        .from('sites')
        .select('id, name, site_code')
        .is('archived_at', null)
        .order('name', { ascending: true }),
      supabase
        .from('alerts')
        .select('id, title, body, created_at, severity')
        .eq('alert_type', 'FIELD_REQUEST')
        .is('dismissed_at', null)
        .order('created_at', { ascending: false })
        .limit(12),
    ]);

    if (!sitesRes.error && sitesRes.data) {
      const siteRows = sitesRes.data as SiteOption[];
      setSites(siteRows);
      if (!selectedSiteId && siteRows.length > 0) {
        setSelectedSiteId(siteRows[0].id);
      }
    }

    if (!requestsRes.error && requestsRes.data) {
      const mapped = (requestsRes.data as Array<{ id: string; title: string; body: string | null; created_at: string; severity: string | null }>)
        .map((row) => {
          const parsed = parseRequestBody(row.body);
          const urgencyValue = (parsed.urgency as RequestUrgency | undefined) ?? (
            row.severity === 'CRITICAL'
              ? 'asap'
              : row.severity === 'WARNING'
                ? 'high'
                : 'normal'
          );

          return {
            id: row.id,
            title: row.title,
            siteName: String(parsed.site_name ?? 'Unknown Site'),
            submittedBy: String(parsed.submitted_by ?? 'Unknown'),
            urgency: urgencyValue,
            createdAt: row.created_at,
          };
        });
      setRecentRequests(mapped);
    }

    setLoading(false);
  }, [selectedSiteId, supabase]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredRecent = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return recentRequests;
    return recentRequests.filter((request) => (
      request.title.toLowerCase().includes(q)
      || request.siteName.toLowerCase().includes(q)
      || request.submittedBy.toLowerCase().includes(q)
    ));
  }, [recentRequests, search]);

  const handleSubmit = async () => {
    if (!tenantId) {
      toast.error('Tenant context is required to submit a request.');
      return;
    }
    if (!selectedSiteId) {
      toast.error('Choose a site before submitting.');
      return;
    }

    const selectedSite = sites.find((site) => site.id === selectedSiteId);
    if (!selectedSite) {
      toast.error('Selected site is invalid.');
      return;
    }

    let title = '';
    let details: Record<string, unknown> = {};

    if (activeForm === 'supply') {
      const quantity = Number(supplyQuantity);
      if (!supplyItem.trim() || !Number.isFinite(quantity) || quantity <= 0) {
        toast.error('Supply request needs item name and quantity.');
        return;
      }
      title = `Supply Request - ${supplyItem.trim()}`;
      details = {
        item: supplyItem.trim(),
        quantity,
        notes: supplyNotes.trim() || null,
      };
    }

    if (activeForm === 'time-off') {
      if (!timeOffStart || !timeOffEnd) {
        toast.error('Time off request needs start and end dates.');
        return;
      }
      if (timeOffEnd < timeOffStart) {
        toast.error('End date must be after start date.');
        return;
      }
      title = `Time Off Request - ${timeOffType}`;
      details = {
        start_date: timeOffStart,
        end_date: timeOffEnd,
        time_off_type: timeOffType,
        reason: timeOffReason.trim() || null,
      };
    }

    if (activeForm === 'equipment') {
      if (!equipmentName.trim() || !equipmentDescription.trim()) {
        toast.error('Equipment issue needs equipment name and description.');
        return;
      }
      title = `Equipment Issue - ${equipmentName.trim()}`;
      details = {
        equipment: equipmentName.trim(),
        severity: equipmentSeverity,
        description: equipmentDescription.trim(),
      };
    }

    setSubmitting(true);

    const body = {
      request_type: activeForm,
      urgency,
      site_id: selectedSite.id,
      site_name: `${selectedSite.site_code} - ${selectedSite.name}`,
      submitted_by: user?.email ?? 'in-app-user',
      submitted_at: new Date().toISOString(),
      source: 'in_app_schedule_forms',
      details,
    };

    const { error } = await supabase
      .from('alerts')
      .insert({
        tenant_id: tenantId,
        alert_type: 'FIELD_REQUEST',
        severity: urgencyToSeverity(urgency),
        title,
        body: JSON.stringify(body),
        entity_type: 'site',
        entity_id: selectedSite.id,
      });

    setSubmitting(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success('Field request submitted.');

    setSupplyItem('');
    setSupplyQuantity('1');
    setSupplyNotes('');
    setTimeOffReason('');
    setEquipmentName('');
    setEquipmentDescription('');

    await loadData();
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(320px,420px)_1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Self-Service Forms</CardTitle>
          <CardDescription>Submit field requests from schedule context.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ChipTabs
            tabs={FORM_TABS as unknown as Array<{ key: string; label: string; icon?: React.ReactNode }>}
            active={activeForm}
            onChange={(key) => setActiveForm(key as SelfServiceType)}
          />

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading request context...</p>
          ) : (
            <>
              <Select
                label="Site"
                value={selectedSiteId}
                onChange={(event) => setSelectedSiteId(event.target.value)}
                options={[
                  { value: '', label: 'Select site...' },
                  ...sites.map((site) => ({
                    value: site.id,
                    label: `${site.site_code} - ${site.name}`,
                  })),
                ]}
              />

              <Select
                label="Urgency"
                value={urgency}
                onChange={(event) => setUrgency(event.target.value as RequestUrgency)}
                options={URGENCY_OPTIONS}
              />

              {activeForm === 'supply' && (
                <div className="space-y-3">
                  <Input
                    label="Item Needed"
                    value={supplyItem}
                    onChange={(event) => setSupplyItem(event.target.value)}
                    placeholder="e.g., Restroom paper"
                  />
                  <Input
                    label="Quantity"
                    type="number"
                    min={1}
                    value={supplyQuantity}
                    onChange={(event) => setSupplyQuantity(event.target.value)}
                  />
                  <Textarea
                    label="Notes"
                    value={supplyNotes}
                    onChange={(event) => setSupplyNotes(event.target.value)}
                    placeholder="Optional notes for purchasing/stocking"
                    rows={3}
                  />
                </div>
              )}

              {activeForm === 'time-off' && (
                <div className="space-y-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <Input
                      type="date"
                      label="Start Date"
                      value={timeOffStart}
                      onChange={(event) => setTimeOffStart(event.target.value)}
                    />
                    <Input
                      type="date"
                      label="End Date"
                      value={timeOffEnd}
                      onChange={(event) => setTimeOffEnd(event.target.value)}
                    />
                  </div>
                  <Select
                    label="Type"
                    value={timeOffType}
                    onChange={(event) => setTimeOffType(event.target.value)}
                    options={TIME_OFF_TYPE_OPTIONS}
                  />
                  <Textarea
                    label="Reason"
                    value={timeOffReason}
                    onChange={(event) => setTimeOffReason(event.target.value)}
                    placeholder="Reason for time off"
                    rows={3}
                  />
                </div>
              )}

              {activeForm === 'equipment' && (
                <div className="space-y-3">
                  <Input
                    label="Equipment"
                    value={equipmentName}
                    onChange={(event) => setEquipmentName(event.target.value)}
                    placeholder="e.g., Vacuum 03"
                  />
                  <Select
                    label="Issue Severity"
                    value={equipmentSeverity}
                    onChange={(event) => setEquipmentSeverity(event.target.value)}
                    options={[
                      { value: 'low', label: 'Low' },
                      { value: 'medium', label: 'Medium' },
                      { value: 'high', label: 'High' },
                    ]}
                  />
                  <Textarea
                    label="Description"
                    value={equipmentDescription}
                    onChange={(event) => setEquipmentDescription(event.target.value)}
                    placeholder="Describe the issue and impact on shift"
                    rows={4}
                  />
                </div>
              )}

              <Button onClick={() => void handleSubmit()} loading={submitting} className="w-full">
                Submit Request
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Field Requests</CardTitle>
          <CardDescription>Live request alerts from submitted specialist forms.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {!filteredRecent.length ? (
            <p className="text-sm text-muted-foreground">No recent requests for the current filter.</p>
          ) : (
            filteredRecent.map((request) => (
              <div key={request.id} className="rounded-lg border border-border/70 bg-muted/40 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">{request.title}</p>
                  <Badge color={urgencyTone(request.urgency)}>
                    {request.urgency.toUpperCase()}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{request.siteName}</p>
                <p className="text-xs text-muted-foreground">
                  Submitted by {request.submittedBy} at {new Date(request.createdAt).toLocaleString()}
                </p>
              </div>
            ))
          )}

          <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <AlertTriangle className="h-3.5 w-3.5" />
            Requests submitted with `ASAP` urgency are surfaced as critical command-center alerts.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
