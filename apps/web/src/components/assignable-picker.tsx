'use client';

import { useEffect, useState } from 'react';
import { Select } from '@gleamops/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { toAssignableLabel } from '@/modules/schedule/assignable';
import type { Assignable, AssignableType } from '@gleamops/shared';

export interface AssignableValue {
  type: AssignableType;
  id: string;
}

interface AssignablePickerProps {
  value: AssignableValue | null;
  onChange: (value: AssignableValue | null) => void;
  disabled?: boolean;
  excludeIds?: string[];
  label?: string;
}

function encodeValue(type: AssignableType, id: string): string {
  return `${type}::${id}`;
}

function decodeValue(raw: string): AssignableValue | null {
  const [type, id] = raw.split('::');
  if (!type || !id) return null;
  return { type: type as AssignableType, id };
}

export function AssignablePicker({
  value,
  onChange,
  disabled = false,
  excludeIds = [],
  label = 'Assignee',
}: AssignablePickerProps) {
  const [assignables, setAssignables] = useState<Assignable[]>([]);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase
      .from('v_assignables')
      .select('*')
      .order('display_name')
      .then(({ data }) => {
        if (data) setAssignables(data as unknown as Assignable[]);
      });
  }, []);

  const excludeSet = new Set(excludeIds);

  const staffOptions = assignables
    .filter((a) => a.assignable_type === 'staff' && !excludeSet.has(a.assignable_id))
    .map((a) => ({
      value: encodeValue('staff', a.assignable_id),
      label: toAssignableLabel(a),
    }));

  const subcontractorOptions = assignables
    .filter((a) => a.assignable_type === 'subcontractor' && !excludeSet.has(a.assignable_id))
    .map((a) => ({
      value: encodeValue('subcontractor', a.assignable_id),
      label: toAssignableLabel(a),
    }));

  const options = [
    { value: '', label: 'Select assignee...' },
    ...staffOptions.length > 0
      ? [{ value: '__group_staff', label: '── Employees ──', disabled: true }, ...staffOptions]
      : [],
    ...subcontractorOptions.length > 0
      ? [{ value: '__group_sub', label: '── Subcontractors ──', disabled: true }, ...subcontractorOptions]
      : [],
  ];

  const currentEncoded = value ? encodeValue(value.type, value.id) : '';

  return (
    <Select
      label={label}
      value={currentEncoded}
      onChange={(e) => {
        const raw = e.target.value;
        if (!raw) {
          onChange(null);
          return;
        }
        const decoded = decodeValue(raw);
        onChange(decoded);
      }}
      options={options}
      disabled={disabled}
    />
  );
}
