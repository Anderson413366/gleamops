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
          {props.required && <span className="text-red-500 dark:text-red-400 ml-0.5">*</span>}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          'block w-full rounded-xl border px-3.5 py-2.5 text-sm shadow-sm transition-all duration-200',
          'bg-card text-foreground placeholder:text-muted-foreground',
          'focus:outline-none focus:ring-2 focus:ring-offset-0',
          error
            ? 'border-red-300 dark:border-red-700 focus:border-red-400 focus:ring-red-500/25'
            : 'border-border focus:border-primary focus:ring-primary/25',
          'disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs font-medium text-red-600 dark:text-red-400">{error}</p>}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
