'use client';

import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react';
import {
  AlertTriangle,
  Biohazard,
  Camera,
  Clock3,
  Filter,
  FlaskConical,
  Package,
  ShieldAlert,
  Wrench,
} from 'lucide-react';
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
import { SupplyRequestForm } from '@/components/forms/supply-request-form';
import { TimeOffRequestForm } from '@/components/forms/time-off-request-form';
import { EquipmentIssueForm } from '@/components/forms/equipment-issue-form';
import { SiteIssueForm } from '@/components/forms/site-issue-form';
import { BiohazardReportForm } from '@/components/forms/biohazard-report-form';

type SelfServiceType =
  | 'supply'
  | 'time-off'
  | 'equipment'
  | 'site-issue'
  | 'bio-hazard'
  | 'photo-upload'
  | 'chemical-restock'
  | 'vacuum-bag';
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
  { key: 'site-issue', label: 'Site Issue', icon: <ShieldAlert className="h-4 w-4" /> },
  { key: 'bio-hazard', label: 'Bio-Hazard', icon: <Biohazard className="h-4 w-4" /> },
  { key: 'photo-upload', label: 'Photo Upload', icon: <Camera className="h-4 w-4" /> },
  { key: 'chemical-restock', label: 'Chemical Restock', icon: <FlaskConical className="h-4 w-4" /> },
  { key: 'vacuum-bag', label: 'Vacuum Bag', icon: <Filter className="h-4 w-4" /> },
] as const;

const URGENCY_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'asap', label: 'ASAP' },
];

const PHOTO_CATEGORY_OPTIONS = [
  { value: 'site-condition', label: 'Site Condition' },
  { value: 'safety', label: 'Safety' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'other', label: 'Other' },
];

const CHEMICAL_UNIT_OPTIONS = [
  { value: 'bottle', label: 'Bottle' },
  { value: 'gallon', label: 'Gallon' },
  { value: 'case', label: 'Case' },
  { value: 'bag', label: 'Bag' },
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

function sanitizeFileBaseName(fileName: string): string {
  const withoutExtension = fileName.replace(/\.[^/.]+$/, '');
  const cleaned = withoutExtension.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  if (!cleaned) return 'photo-upload';
  return cleaned.slice(0, 32);
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

  const [siteIssueLocation, setSiteIssueLocation] = useState('');
  const [siteIssueSeverity, setSiteIssueSeverity] = useState('high');
  const [siteIssueDescription, setSiteIssueDescription] = useState('');
  const [siteIssuePhotoUrl, setSiteIssuePhotoUrl] = useState('');

  const [hazardLocation, setHazardLocation] = useState('');
  const [hazardType, setHazardType] = useState('blood');
  const [hazardExposure, setHazardExposure] = useState('high');
  const [hazardActions, setHazardActions] = useState('');
  const [hazardPhotoUrl, setHazardPhotoUrl] = useState('');

  const [photoSubject, setPhotoSubject] = useState('');
  const [photoCategory, setPhotoCategory] = useState('site-condition');
  const [photoNotes, setPhotoNotes] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoInputKey, setPhotoInputKey] = useState(0);

  const [chemicalName, setChemicalName] = useState('');
  const [chemicalQuantity, setChemicalQuantity] = useState('1');
  const [chemicalUnit, setChemicalUnit] = useState('bottle');
  const [chemicalReason, setChemicalReason] = useState('');

  const [vacuumEquipmentType, setVacuumEquipmentType] = useState('');
  const [vacuumQuantity, setVacuumQuantity] = useState('1');
  const [vacuumNotes, setVacuumNotes] = useState('');

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

  const uploadPhotoToStorage = useCallback(async (file: File, siteCode: string): Promise<{ path: string }> => {
    if (!tenantId) {
      throw new Error('Tenant context is required for upload.');
    }

    const extension = file.name.includes('.')
      ? file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
      : 'jpg';
    const path = `${tenantId}/field-requests/${siteCode}/${Date.now()}-${sanitizeFileBaseName(file.name)}.${extension}`;

    const { error: uploadError } = await supabase
      .storage
      .from('documents')
      .upload(path, file, {
        contentType: file.type || 'image/jpeg',
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Photo upload failed: ${uploadError.message}`);
    }

    return { path };
  }, [supabase, tenantId]);

  const handlePhotoFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      setPhotoFile(null);
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Photo evidence must be an image file.');
      event.target.value = '';
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      toast.error('Photo evidence must be under 8MB.');
      event.target.value = '';
      return;
    }

    setPhotoFile(file);
  };

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

    if (activeForm === 'site-issue') {
      if (!siteIssueLocation.trim() || !siteIssueDescription.trim()) {
        toast.error('Site issue needs location and description.');
        return;
      }
      title = `Site Issue - ${siteIssueLocation.trim()}`;
      details = {
        location: siteIssueLocation.trim(),
        severity: siteIssueSeverity,
        description: siteIssueDescription.trim(),
        photo_url: siteIssuePhotoUrl.trim() || null,
      };
    }

    if (activeForm === 'bio-hazard') {
      if (!hazardLocation.trim() || !hazardActions.trim()) {
        toast.error('Bio-hazard report needs location and containment details.');
        return;
      }
      title = `Bio-Hazard Report - ${hazardLocation.trim()}`;
      details = {
        location: hazardLocation.trim(),
        hazard_type: hazardType,
        exposure_risk: hazardExposure,
        immediate_actions: hazardActions.trim(),
        photo_url: hazardPhotoUrl.trim() || null,
      };
    }

    if (activeForm === 'photo-upload') {
      if (!photoSubject.trim()) {
        toast.error('Photo upload needs a subject.');
        return;
      }
      if (!photoFile) {
        toast.error('Attach a photo before submitting.');
        return;
      }
      let uploadedPhotoPath: string | null = null;
      try {
        const uploaded = await uploadPhotoToStorage(photoFile, selectedSite.site_code);
        uploadedPhotoPath = uploaded.path;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Photo upload failed.';
        toast.error(message);
        return;
      }
      title = `Photo Upload - ${photoSubject.trim()}`;
      details = {
        subject: photoSubject.trim(),
        category: photoCategory,
        notes: photoNotes.trim() || null,
        photo_storage_path: uploadedPhotoPath,
      };
    }

    if (activeForm === 'chemical-restock') {
      const quantity = Number(chemicalQuantity);
      if (!chemicalName.trim() || !Number.isFinite(quantity) || quantity <= 0) {
        toast.error('Chemical restock needs chemical name and quantity.');
        return;
      }
      title = `Chemical Restock - ${chemicalName.trim()}`;
      details = {
        chemical_name: chemicalName.trim(),
        quantity,
        unit: chemicalUnit,
        reason: chemicalReason.trim() || null,
      };
    }

    if (activeForm === 'vacuum-bag') {
      const quantity = Number(vacuumQuantity);
      if (!vacuumEquipmentType.trim() || !Number.isFinite(quantity) || quantity <= 0) {
        toast.error('Vacuum bag request needs equipment type and quantity.');
        return;
      }
      title = `Vacuum Bag Request - ${vacuumEquipmentType.trim()}`;
      details = {
        equipment_type: vacuumEquipmentType.trim(),
        quantity,
        notes: vacuumNotes.trim() || null,
      };
    }

    setSubmitting(true);

    let uploadedPhotoPathForCleanup: string | null = null;
    if (activeForm === 'photo-upload' && details && 'photo_storage_path' in details) {
      uploadedPhotoPathForCleanup = details.photo_storage_path as string;
    }

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

    try {
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

      if (error) {
        throw new Error(error.message);
      }

      toast.success('Field request submitted.');

      setSupplyItem('');
      setSupplyQuantity('1');
      setSupplyNotes('');
      setTimeOffReason('');
      setEquipmentName('');
      setEquipmentDescription('');
      setSiteIssueLocation('');
      setSiteIssueSeverity('high');
      setSiteIssueDescription('');
      setSiteIssuePhotoUrl('');
      setHazardLocation('');
      setHazardType('blood');
      setHazardExposure('high');
      setHazardActions('');
      setHazardPhotoUrl('');
      setPhotoSubject('');
      setPhotoCategory('site-condition');
      setPhotoNotes('');
      setPhotoFile(null);
      setPhotoInputKey((value) => value + 1);
      setChemicalName('');
      setChemicalQuantity('1');
      setChemicalUnit('bottle');
      setChemicalReason('');
      setVacuumEquipmentType('');
      setVacuumQuantity('1');
      setVacuumNotes('');

      await loadData();
    } catch (error) {
      if (uploadedPhotoPathForCleanup) {
        await supabase.storage.from('documents').remove([uploadedPhotoPathForCleanup]);
      }
      const message = error instanceof Error ? error.message : 'Unable to submit request.';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
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
                <SupplyRequestForm
                  item={supplyItem}
                  quantity={supplyQuantity}
                  notes={supplyNotes}
                  onItemChange={setSupplyItem}
                  onQuantityChange={setSupplyQuantity}
                  onNotesChange={setSupplyNotes}
                />
              )}

              {activeForm === 'time-off' && (
                <TimeOffRequestForm
                  startDate={timeOffStart}
                  endDate={timeOffEnd}
                  requestType={timeOffType}
                  reason={timeOffReason}
                  onStartDateChange={setTimeOffStart}
                  onEndDateChange={setTimeOffEnd}
                  onRequestTypeChange={setTimeOffType}
                  onReasonChange={setTimeOffReason}
                />
              )}

              {activeForm === 'equipment' && (
                <EquipmentIssueForm
                  equipmentName={equipmentName}
                  severity={equipmentSeverity}
                  description={equipmentDescription}
                  onEquipmentNameChange={setEquipmentName}
                  onSeverityChange={setEquipmentSeverity}
                  onDescriptionChange={setEquipmentDescription}
                />
              )}

              {activeForm === 'site-issue' && (
                <SiteIssueForm
                  location={siteIssueLocation}
                  severity={siteIssueSeverity}
                  description={siteIssueDescription}
                  photoUrl={siteIssuePhotoUrl}
                  onLocationChange={setSiteIssueLocation}
                  onSeverityChange={setSiteIssueSeverity}
                  onDescriptionChange={setSiteIssueDescription}
                  onPhotoUrlChange={setSiteIssuePhotoUrl}
                />
              )}

              {activeForm === 'bio-hazard' && (
                <BiohazardReportForm
                  location={hazardLocation}
                  hazardType={hazardType}
                  exposureRisk={hazardExposure}
                  immediateActions={hazardActions}
                  photoUrl={hazardPhotoUrl}
                  onLocationChange={setHazardLocation}
                  onHazardTypeChange={setHazardType}
                  onExposureRiskChange={setHazardExposure}
                  onImmediateActionsChange={setHazardActions}
                  onPhotoUrlChange={setHazardPhotoUrl}
                />
              )}

              {activeForm === 'photo-upload' && (
                <div className="space-y-3">
                  <Input
                    label="Photo Subject"
                    value={photoSubject}
                    onChange={(event) => setPhotoSubject(event.target.value)}
                    placeholder="e.g., Damaged floor tile near lobby"
                  />
                  <Select
                    label="Photo Category"
                    value={photoCategory}
                    onChange={(event) => setPhotoCategory(event.target.value)}
                    options={PHOTO_CATEGORY_OPTIONS}
                  />
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-foreground" htmlFor="photo-upload-input">
                      Upload Photo
                    </label>
                    <input
                      key={photoInputKey}
                      id="photo-upload-input"
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handlePhotoFileChange}
                      className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm file:font-medium"
                    />
                    {photoFile ? (
                      <p className="text-xs text-muted-foreground">Attached: {photoFile.name}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground">No file attached yet.</p>
                    )}
                  </div>
                  <Textarea
                    label="Notes"
                    value={photoNotes}
                    onChange={(event) => setPhotoNotes(event.target.value)}
                    placeholder="Add context for the uploaded photo"
                    rows={3}
                  />
                </div>
              )}

              {activeForm === 'chemical-restock' && (
                <div className="space-y-3">
                  <Input
                    label="Chemical Name"
                    value={chemicalName}
                    onChange={(event) => setChemicalName(event.target.value)}
                    placeholder="e.g., Neutral floor cleaner"
                  />
                  <div className="grid gap-3 md:grid-cols-2">
                    <Input
                      label="Quantity Needed"
                      type="number"
                      min={1}
                      value={chemicalQuantity}
                      onChange={(event) => setChemicalQuantity(event.target.value)}
                    />
                    <Select
                      label="Unit"
                      value={chemicalUnit}
                      onChange={(event) => setChemicalUnit(event.target.value)}
                      options={CHEMICAL_UNIT_OPTIONS}
                    />
                  </div>
                  <Textarea
                    label="Reason"
                    value={chemicalReason}
                    onChange={(event) => setChemicalReason(event.target.value)}
                    placeholder="Why this restock is needed"
                    rows={3}
                  />
                </div>
              )}

              {activeForm === 'vacuum-bag' && (
                <div className="space-y-3">
                  <Input
                    label="Vacuum Equipment Type"
                    value={vacuumEquipmentType}
                    onChange={(event) => setVacuumEquipmentType(event.target.value)}
                    placeholder="e.g., Backpack vacuum 10qt"
                  />
                  <Input
                    label="Quantity Needed"
                    type="number"
                    min={1}
                    value={vacuumQuantity}
                    onChange={(event) => setVacuumQuantity(event.target.value)}
                  />
                  <Textarea
                    label="Notes"
                    value={vacuumNotes}
                    onChange={(event) => setVacuumNotes(event.target.value)}
                    placeholder="Bag type, site closet, or urgency details"
                    rows={3}
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
