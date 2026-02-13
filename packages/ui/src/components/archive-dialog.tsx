'use client';

import React, { useState } from 'react';

interface ArchiveDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  entityName: string;
  cascadeWarning?: string;
  loading?: boolean;
}

/**
 * Archive confirmation dialog with reason textarea.
 * Shows a warning about cascade effects and requires a reason.
 */
export function ArchiveDialog({
  open,
  onClose,
  onConfirm,
  entityName,
  cascadeWarning,
  loading,
}: ArchiveDialogProps) {
  const [reason, setReason] = useState('');

  if (!open) return null;

  const handleConfirm = () => {
    onConfirm(reason);
    setReason('');
  };

  const handleClose = () => {
    setReason('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* Dialog */}
      <div className="relative z-10 w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-foreground">Archive {entityName}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This will soft-delete this {entityName.toLowerCase()} and remove it from active views. It can be restored later.
        </p>

        {cascadeWarning && (
          <div className="mt-3 rounded-md bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-3">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              {cascadeWarning}
            </p>
          </div>
        )}

        <div className="mt-4">
          <label className="block text-sm font-medium text-foreground mb-1">
            Reason for archiving
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Enter the reason for archiving..."
          />
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Archiving...' : 'Archive'}
          </button>
        </div>
      </div>
    </div>
  );
}
