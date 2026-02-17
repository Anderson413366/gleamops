'use client';

import { Select, type SelectOption } from '@gleamops/ui';
import { useLookups } from '@/hooks/use-lookups';

interface LookupSelectProps {
  category: string | string[];
  value: string | null | undefined;
  onChange: (value: string) => void;
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  includeInactive?: boolean;
  valueMode?: 'code' | 'label';
  fallbackOptions?: SelectOption[];
}

export function LookupSelect({
  category,
  value,
  onChange,
  label,
  error,
  hint,
  required,
  disabled,
  placeholder = 'Select...',
  className,
  includeInactive = false,
  valueMode = 'code',
  fallbackOptions = [],
}: LookupSelectProps) {
  const { options, isLoading } = useLookups(category, { includeInactive, valueMode });

  const lookupOptions: SelectOption[] = options.map((opt) => ({
    value: opt.value,
    label: opt.label,
  }));

  const mergedOptions: SelectOption[] = [
    { value: '', label: isLoading ? 'Loading...' : placeholder },
    ...(lookupOptions.length > 0 ? lookupOptions : fallbackOptions),
  ];

  return (
    <Select
      label={label}
      value={value ?? ''}
      onChange={(event) => onChange(event.target.value)}
      options={mergedOptions}
      error={error}
      hint={hint}
      required={required}
      disabled={disabled || isLoading}
      className={className}
    />
  );
}
