/**
 * EmptyState — every empty state must have:
 * 1. One sentence explaining what it is
 * 2. One button to create/import the thing
 */
interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
  bullets?: string[];
}

const DEFAULT_GUIDANCE_BULLETS = [
  'Centralize records and keep your team aligned.',
  'Track status changes and progress over time.',
  'Use search and filters to find work quickly.',
];

export function EmptyState({ title, description, actionLabel, onAction, icon, className, children, bullets }: EmptyStateProps) {
  const guidanceBullets = bullets ?? (actionLabel && onAction ? DEFAULT_GUIDANCE_BULLETS : []);

  return (
    <div
      data-testid="empty-state"
      className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-border px-6 py-16 text-center ${className ?? ''}`}
    >
      {icon && (
        <div className="mb-4 text-muted-foreground">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
      {guidanceBullets.length > 0 && !children && (
        <ul className="mt-5 w-full max-w-xl list-disc space-y-1.5 pl-6 text-left text-sm text-muted-foreground">
          {guidanceBullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
      )}
      {children && (
        <div className="mt-5 w-full max-w-2xl">
          {children}
        </div>
      )}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-6 inline-flex items-center rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
