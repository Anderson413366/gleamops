import { cn } from '../utils';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label?: string;
  error?: string;
  hint?: string;
  options: SelectOption[];
  placeholder?: string;
}

export function Select({
  label,
  error,
  hint,
  options,
  placeholder,
  className,
  id,
  ...props
}: SelectProps) {
  const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={selectId} className="block text-sm font-medium text-foreground">
          {label}
          {props.required && <span className="text-destructive ml-0.5">*</span>}
        </label>
      )}
      <select
        id={selectId}
        className={cn(
          'block w-full rounded-lg border px-3.5 py-2.5 text-sm transition-all duration-200 ease-in-out appearance-none',
          'bg-card text-foreground',
          'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background',
          error
            ? 'border-destructive/50 focus:border-destructive focus:ring-destructive/40'
            : 'border-border focus:border-primary focus:ring-ring/40',
          'disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed',
          className
        )}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
