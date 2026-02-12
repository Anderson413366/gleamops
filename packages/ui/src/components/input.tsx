import { cn } from '../utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({ label, error, hint, className, id, ...props }: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-foreground">
          {label}
          {props.required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          'block w-full rounded-lg border px-3 py-2 text-sm transition-colors',
          'focus:outline-none focus:ring-1',
          error
            ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
            : 'border-border focus:border-gleam-500 focus:ring-gleam-500',
          'disabled:bg-gray-50 disabled:text-muted',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}
