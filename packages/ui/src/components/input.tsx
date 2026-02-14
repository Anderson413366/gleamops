import { cn } from '../utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({ label, error, hint, className, id, ...props }: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-foreground">
          {label}
          {props.required && <span className="text-destructive ml-0.5">*</span>}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          'block w-full rounded-lg border px-3.5 py-2.5 text-sm shadow-sm transition-all duration-200 ease-in-out',
          'bg-card text-foreground placeholder:text-muted-foreground',
          'focus:outline-none focus:ring-2 focus:ring-ring/40 focus:ring-offset-2 focus:ring-offset-background',
          error
            ? 'border-destructive/50 focus:border-destructive focus:ring-destructive/25'
            : 'border-border focus:border-primary focus:ring-primary/25',
          'disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
