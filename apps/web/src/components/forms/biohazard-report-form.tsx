'use client';

import { Input, Select, Textarea } from '@gleamops/ui';

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

interface BiohazardReportFormProps {
  location: string;
  hazardType: string;
  exposureRisk: string;
  immediateActions: string;
  photoUrl: string;
  onLocationChange: (value: string) => void;
  onHazardTypeChange: (value: string) => void;
  onExposureRiskChange: (value: string) => void;
  onImmediateActionsChange: (value: string) => void;
  onPhotoUrlChange: (value: string) => void;
}

export function BiohazardReportForm({
  location,
  hazardType,
  exposureRisk,
  immediateActions,
  photoUrl,
  onLocationChange,
  onHazardTypeChange,
  onExposureRiskChange,
  onImmediateActionsChange,
  onPhotoUrlChange,
}: BiohazardReportFormProps) {
  return (
    <div className="space-y-3">
      <Input
        label="Location"
        value={location}
        onChange={(event) => onLocationChange(event.target.value)}
        placeholder="e.g., 2nd floor restroom"
      />
      <div className="grid gap-3 md:grid-cols-2">
        <Select
          label="Hazard Type"
          value={hazardType}
          onChange={(event) => onHazardTypeChange(event.target.value)}
          options={HAZARD_TYPE_OPTIONS}
        />
        <Select
          label="Exposure Risk"
          value={exposureRisk}
          onChange={(event) => onExposureRiskChange(event.target.value)}
          options={HAZARD_EXPOSURE_OPTIONS}
        />
      </div>
      <Textarea
        label="Immediate Actions Taken"
        value={immediateActions}
        onChange={(event) => onImmediateActionsChange(event.target.value)}
        placeholder="Containment, PPE used, and escalation actions"
        rows={4}
      />
      <Input
        label="Photo URL (optional)"
        type="url"
        value={photoUrl}
        onChange={(event) => onPhotoUrlChange(event.target.value)}
        placeholder="https://..."
      />
    </div>
  );
}
