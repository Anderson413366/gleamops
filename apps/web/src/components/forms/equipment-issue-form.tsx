'use client';

import { Input, Select, Textarea } from '@gleamops/ui';

const ISSUE_SEVERITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

interface EquipmentIssueFormProps {
  equipmentName: string;
  severity: string;
  description: string;
  onEquipmentNameChange: (value: string) => void;
  onSeverityChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
}

export function EquipmentIssueForm({
  equipmentName,
  severity,
  description,
  onEquipmentNameChange,
  onSeverityChange,
  onDescriptionChange,
}: EquipmentIssueFormProps) {
  return (
    <div className="space-y-3">
      <Input
        label="Equipment"
        value={equipmentName}
        onChange={(event) => onEquipmentNameChange(event.target.value)}
        placeholder="e.g., Vacuum 03"
      />
      <Select
        label="Issue Severity"
        value={severity}
        onChange={(event) => onSeverityChange(event.target.value)}
        options={ISSUE_SEVERITY_OPTIONS}
      />
      <Textarea
        label="Description"
        value={description}
        onChange={(event) => onDescriptionChange(event.target.value)}
        placeholder="Describe the issue and impact on shift"
        rows={4}
      />
    </div>
  );
}
