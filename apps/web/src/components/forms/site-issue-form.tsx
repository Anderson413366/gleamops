'use client';

import { Input, Select, Textarea } from '@gleamops/ui';

const ISSUE_SEVERITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

interface SiteIssueFormProps {
  location: string;
  severity: string;
  description: string;
  photoUrl: string;
  onLocationChange: (value: string) => void;
  onSeverityChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onPhotoUrlChange: (value: string) => void;
}

export function SiteIssueForm({
  location,
  severity,
  description,
  photoUrl,
  onLocationChange,
  onSeverityChange,
  onDescriptionChange,
  onPhotoUrlChange,
}: SiteIssueFormProps) {
  return (
    <div className="space-y-3">
      <Input
        label="Location in Building"
        value={location}
        onChange={(event) => onLocationChange(event.target.value)}
        placeholder="e.g., North stairwell by loading dock"
      />
      <Select
        label="Issue Severity"
        value={severity}
        onChange={(event) => onSeverityChange(event.target.value)}
        options={ISSUE_SEVERITY_OPTIONS}
      />
      <Textarea
        label="Issue Description"
        value={description}
        onChange={(event) => onDescriptionChange(event.target.value)}
        placeholder="Describe what was found and the impact on cleaning operations"
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
