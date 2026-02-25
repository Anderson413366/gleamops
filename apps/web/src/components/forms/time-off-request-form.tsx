'use client';

import { Input, Select, Textarea } from '@gleamops/ui';

const TIME_OFF_TYPE_OPTIONS = [
  { value: 'PTO', label: 'PTO' },
  { value: 'SICK', label: 'Sick' },
  { value: 'PERSONAL', label: 'Personal' },
];

interface TimeOffRequestFormProps {
  startDate: string;
  endDate: string;
  requestType: string;
  reason: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onRequestTypeChange: (value: string) => void;
  onReasonChange: (value: string) => void;
}

export function TimeOffRequestForm({
  startDate,
  endDate,
  requestType,
  reason,
  onStartDateChange,
  onEndDateChange,
  onRequestTypeChange,
  onReasonChange,
}: TimeOffRequestFormProps) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <Input
          type="date"
          label="Start Date"
          value={startDate}
          onChange={(event) => onStartDateChange(event.target.value)}
        />
        <Input
          type="date"
          label="End Date"
          value={endDate}
          onChange={(event) => onEndDateChange(event.target.value)}
        />
      </div>
      <Select
        label="Type"
        value={requestType}
        onChange={(event) => onRequestTypeChange(event.target.value)}
        options={TIME_OFF_TYPE_OPTIONS}
      />
      <Textarea
        label="Reason"
        value={reason}
        onChange={(event) => onReasonChange(event.target.value)}
        placeholder="Reason for time off"
        rows={3}
      />
    </div>
  );
}
