'use client';

interface StatusToggleDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  loading?: boolean;
  entityLabel: string;
  entityName?: string | null;
  mode: 'deactivate' | 'reactivate';
  warning?: string | null;
}

export function StatusToggleDialog({
  open,
  onClose,
  onConfirm,
  loading,
  entityLabel,
  entityName,
  mode,
  warning,
}: StatusToggleDialogProps) {
  if (!open) return null;

  const label = entityName?.trim() || entityLabel;
  const isDeactivate = mode === 'deactivate';
  const title = `${isDeactivate ? 'Deactivate' : 'Reactivate'} ${label}?`;
  const description = isDeactivate
    ? `This will mark ${label} as inactive. It will NOT be deleted. You can reactivate it at any time.`
    : `This will mark ${label} as active again.`;
  const confirmLabel = isDeactivate ? 'Yes, Deactivate' : 'Yes, Reactivate';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        {warning ? (
          <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
            {warning}
          </div>
        ) : null}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => { void onConfirm(); }}
            disabled={loading}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            {loading ? 'Saving...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
