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
}

export function EmptyState({ title, description, actionLabel, onAction, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center animate-fade-in">
      {icon && (
        <div className="mb-4 rounded-2xl bg-gleam-50 dark:bg-gleam-950 p-4 text-gleam-600 dark:text-gleam-400">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-1.5 text-sm text-muted-foreground max-w-sm">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-5 inline-flex items-center rounded-xl bg-gleam-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-gleam-700 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gleam-500 focus-visible:ring-offset-2 transition-all duration-200"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
