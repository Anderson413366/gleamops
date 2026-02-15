import { cn } from '../utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({ label, error, hint, className, id, ...props }: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="space-y-1.5 min-w-0">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-foreground">
          {label}
          {props.required && <span className="text-destructive ml-0.5">*</span>}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          // Use border-box + fixed control height to prevent text clipping/overlap under responsive reflow.
          'box-border block h-11 w-full min-w-0 rounded-[var(--radius-input)] border px-3.5 text-sm leading-5 transition-colors duration-200',
          'bg-background text-foreground placeholder:text-muted-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          error
            ? 'border-destructive/50 focus-visible:border-destructive focus-visible:ring-destructive/40'
            : 'border-border focus-visible:border-primary focus-visible:ring-ring/40',
          'disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed',
          className
        )}
        aria-invalid={!!error}
        {...props}
      />
      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
