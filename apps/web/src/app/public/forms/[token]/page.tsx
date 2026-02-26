'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  AlertTriangle,
  Biohazard,
  Camera,
  Clock3,
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

type RequestType =
  | 'supply'
  | 'time-off'
  | 'equipment'
  | 'site-issue'
  | 'bio-hazard'
  | 'photo-upload'
  | 'chemical-restock';
type RequestUrgency = 'normal' | 'high' | 'asap';

interface SiteContext {
  id: string;
  name: string;
  site_code: string;
}

interface PublicFormContext {
  mode: 'universal' | 'site';
  site: SiteContext | null;
  sites: SiteContext[];
}

const REQUEST_TABS = [
  { key: 'supply', label: 'Supply Request', icon: <Package className="h-4 w-4" /> },
  { key: 'time-off', label: 'Time Off Request', icon: <Clock3 className="h-4 w-4" /> },
  { key: 'equipment', label: 'Equipment Issue', icon: <Wrench className="h-4 w-4" /> },
  { key: 'site-issue', label: 'Site Issue', icon: <ShieldAlert className="h-4 w-4" /> },
  { key: 'bio-hazard', label: 'Bio-Hazard', icon: <Biohazard className="h-4 w-4" /> },
  { key: 'photo-upload', label: 'Photo Upload', icon: <Camera className="h-4 w-4" /> },
  { key: 'chemical-restock', label: 'Chemical Restock', icon: <FlaskConical className="h-4 w-4" /> },
] as const;

const URGENCY_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'asap', label: 'ASAP' },
];

const TIME_OFF_TYPES = [
  { value: 'PTO', label: 'PTO' },
  { value: 'SICK', label: 'Sick' },
  { value: 'PERSONAL', label: 'Personal' },
];

const HAZARD_TYPE_OPTIONS = [
  { value: 'blood', label: 'Blood' },
  { value: 'bodily_fluid', label: 'Bodily Fluid' },
  { value: 'sharps', label: 'Sharps' },
  { value: 'unknown', label: 'Unknown' },
];

const HAZARD_EXPOSURE_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
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

function urgencyTone(urgency: RequestUrgency): 'blue' | 'yellow' | 'red' {
  if (urgency === 'asap') return 'red';
  if (urgency === 'high') return 'yellow';
  return 'blue';
}

export default function PublicFormsTokenPage() {
  const { token } = useParams<{ token: string }>();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [context, setContext] = useState<PublicFormContext | null>(null);
  const [activeType, setActiveType] = useState<RequestType>('supply');
  const [urgency, setUrgency] = useState<RequestUrgency>('normal');
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [submittedBy, setSubmittedBy] = useState('');

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

  const [photoSubject, setPhotoSubject] = useState('');
  const [photoCategory, setPhotoCategory] = useState('site-condition');
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoNotes, setPhotoNotes] = useState('');

  const [chemicalName, setChemicalName] = useState('');
  const [chemicalQuantity, setChemicalQuantity] = useState('1');
  const [chemicalUnit, setChemicalUnit] = useState('bottle');
  const [chemicalReason, setChemicalReason] = useState('');

  const selectedSite = useMemo(
    () => context?.sites.find((site) => site.id === selectedSiteId) ?? context?.site ?? null,
    [context, selectedSiteId]
  );

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    async function loadContext() {
      setLoading(true);
      const response = await fetch(`/api/public/forms/${encodeURIComponent(token)}`);
      const payload = await response.json();

      if (cancelled) return;

      if (!response.ok) {
        toast.error(payload.error ?? 'Form link is invalid.');
        setContext(null);
        setLoading(false);
        return;
      }

      const nextContext = payload as PublicFormContext;
      setContext(nextContext);

      if (nextContext.site?.id) {
        setSelectedSiteId(nextContext.site.id);
      } else if (nextContext.sites.length > 0) {
        setSelectedSiteId(nextContext.sites[0].id);
      }

      setLoading(false);
    }

    void loadContext();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const submit = async () => {
    if (!context) return;

    if (context.mode === 'universal' && !selectedSiteId) {
      toast.error('Please choose a site.');
      return;
    }

    let details: Record<string, unknown> = {};
    let title = '';

    if (activeType === 'supply') {
      const quantity = Number(supplyQuantity);
      if (!supplyItem.trim() || !Number.isFinite(quantity) || quantity <= 0) {
        toast.error('Supply request needs item and quantity.');
        return;
      }
      title = `Supply Request - ${supplyItem.trim()}`;
      details = {
        item: supplyItem.trim(),
        quantity,
        notes: supplyNotes.trim() || null,
      };
    }

    if (activeType === 'time-off') {
      if (!timeOffStart || !timeOffEnd || timeOffEnd < timeOffStart) {
        toast.error('Provide a valid time-off date range.');
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

    if (activeType === 'equipment') {
      if (!equipmentName.trim() || !equipmentDescription.trim()) {
        toast.error('Equipment request needs equipment and description.');
        return;
      }
      title = `Equipment Issue - ${equipmentName.trim()}`;
      details = {
        equipment: equipmentName.trim(),
        severity: equipmentSeverity,
        description: equipmentDescription.trim(),
      };
    }

    if (activeType === 'site-issue') {
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

    if (activeType === 'bio-hazard') {
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
      };
    }

    if (activeType === 'photo-upload') {
      if (!photoSubject.trim() || !photoUrl.trim()) {
        toast.error('Photo upload needs a subject and photo URL.');
        return;
      }
      title = `Photo Upload - ${photoSubject.trim()}`;
      details = {
        subject: photoSubject.trim(),
        category: photoCategory,
        photo_url: photoUrl.trim(),
        notes: photoNotes.trim() || null,
      };
    }

    if (activeType === 'chemical-restock') {
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

    setSubmitting(true);

    const response = await fetch(`/api/public/forms/${encodeURIComponent(token)}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestType: activeType,
        urgency,
        siteId: selectedSiteId || null,
        title,
        submittedBy: submittedBy.trim() || 'public-form',
        details,
      }),
    });

    const payload = await response.json();
    setSubmitting(false);

    if (!response.ok) {
      toast.error(payload.error ?? 'Unable to submit request.');
      return;
    }

    setSubmitted(true);
    toast.success('Request submitted successfully.');
  };

  if (loading) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Loading form...</CardTitle>
          </CardHeader>
        </Card>
      </main>
    );
  }

  if (!context) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Card>
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2 text-xl">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Form Link Unavailable
            </CardTitle>
            <CardDescription>
              This token is invalid or expired. Request a new QR/link from your manager.
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  if (submitted) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Request Submitted</CardTitle>
            <CardDescription>
              Your request was delivered to the Command Center queue for review.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="secondary" onClick={() => setSubmitted(false)}>
              Submit Another Request
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-8 sm:px-6">
      <Card>
        <CardHeader>
          <CardTitle>Specialist Self-Service Forms</CardTitle>
          <CardDescription>
            {context.mode === 'site'
              ? `Site-linked request form for ${context.site?.site_code} - ${context.site?.name}`
              : 'Universal request link. Select the site before submitting.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ChipTabs
            tabs={REQUEST_TABS as unknown as Array<{ key: string; label: string; icon?: React.ReactNode }>}
            active={activeType}
            onChange={(key) => setActiveType(key as RequestType)}
          />

          <div className="grid gap-3 md:grid-cols-2">
            <Select
              label="Urgency"
              value={urgency}
              onChange={(event) => setUrgency(event.target.value as RequestUrgency)}
              options={URGENCY_OPTIONS}
            />
            <Input
              label="Your Name (optional)"
              value={submittedBy}
              onChange={(event) => setSubmittedBy(event.target.value)}
              placeholder="Name or staff code"
            />
          </div>

          {context.mode === 'universal' ? (
            <Select
              label="Site"
              value={selectedSiteId}
              onChange={(event) => setSelectedSiteId(event.target.value)}
              options={[
                { value: '', label: 'Select site...' },
                ...context.sites.map((site) => ({
                  value: site.id,
                  label: `${site.site_code} - ${site.name}`,
                })),
              ]}
            />
          ) : (
            <div className="rounded-lg border border-border bg-muted/20 p-3 text-sm text-muted-foreground">
              Site locked by token: {context.site?.site_code} - {context.site?.name}
            </div>
          )}

          {activeType === 'supply' && (
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
                rows={3}
              />
            </div>
          )}

          {activeType === 'time-off' && (
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
                options={TIME_OFF_TYPES}
              />
              <Textarea
                label="Reason"
                value={timeOffReason}
                onChange={(event) => setTimeOffReason(event.target.value)}
                rows={3}
              />
            </div>
          )}

          {activeType === 'equipment' && (
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
                rows={4}
              />
            </div>
          )}

          {activeType === 'site-issue' && (
            <div className="space-y-3">
              <Input
                label="Location in Building"
                value={siteIssueLocation}
                onChange={(event) => setSiteIssueLocation(event.target.value)}
                placeholder="e.g., North stairwell by loading dock"
              />
              <Select
                label="Issue Severity"
                value={siteIssueSeverity}
                onChange={(event) => setSiteIssueSeverity(event.target.value)}
                options={[
                  { value: 'low', label: 'Low' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'high', label: 'High' },
                  { value: 'critical', label: 'Critical' },
                ]}
              />
              <Textarea
                label="Issue Description"
                value={siteIssueDescription}
                onChange={(event) => setSiteIssueDescription(event.target.value)}
                rows={4}
              />
              <Input
                label="Photo URL (optional)"
                type="url"
                value={siteIssuePhotoUrl}
                onChange={(event) => setSiteIssuePhotoUrl(event.target.value)}
                placeholder="https://..."
              />
            </div>
          )}

          {activeType === 'bio-hazard' && (
            <div className="space-y-3">
              <Input
                label="Location"
                value={hazardLocation}
                onChange={(event) => setHazardLocation(event.target.value)}
                placeholder="e.g., Stairwell B"
              />
              <div className="grid gap-3 md:grid-cols-2">
                <Select
                  label="Hazard Type"
                  value={hazardType}
                  onChange={(event) => setHazardType(event.target.value)}
                  options={HAZARD_TYPE_OPTIONS}
                />
                <Select
                  label="Exposure Risk"
                  value={hazardExposure}
                  onChange={(event) => setHazardExposure(event.target.value)}
                  options={HAZARD_EXPOSURE_OPTIONS}
                />
              </div>
              <Textarea
                label="Immediate Actions Taken"
                value={hazardActions}
                onChange={(event) => setHazardActions(event.target.value)}
                rows={4}
              />
            </div>
          )}

          {activeType === 'photo-upload' && (
            <div className="space-y-3">
              <Input
                label="Photo Subject"
                value={photoSubject}
                onChange={(event) => setPhotoSubject(event.target.value)}
                placeholder="e.g., Damaged exit sign"
              />
              <Select
                label="Photo Category"
                value={photoCategory}
                onChange={(event) => setPhotoCategory(event.target.value)}
                options={PHOTO_CATEGORY_OPTIONS}
              />
              <Input
                label="Photo URL"
                type="url"
                value={photoUrl}
                onChange={(event) => setPhotoUrl(event.target.value)}
                placeholder="https://..."
              />
              <Textarea
                label="Notes"
                value={photoNotes}
                onChange={(event) => setPhotoNotes(event.target.value)}
                rows={3}
              />
            </div>
          )}

          {activeType === 'chemical-restock' && (
            <div className="space-y-3">
              <Input
                label="Chemical Name"
                value={chemicalName}
                onChange={(event) => setChemicalName(event.target.value)}
                placeholder="e.g., Degreaser"
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
                rows={3}
              />
            </div>
          )}

          <div className="flex items-center justify-between">
            <Badge color={urgencyTone(urgency)}>{urgency.toUpperCase()}</Badge>
            <Button onClick={() => void submit()} loading={submitting}>
              Submit Request
            </Button>
          </div>

          {selectedSite ? (
            <p className="text-xs text-muted-foreground">
              Request context: {selectedSite.site_code} - {selectedSite.name}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
