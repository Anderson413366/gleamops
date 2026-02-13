'use client';

import React from 'react';

interface BulkAction {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'destructive';
  loading?: boolean;
}

interface BulkActionsProps {
  selectedCount: number;
  actions: BulkAction[];
  onClear: () => void;
}

/**
 * Floating action bar shown when items are selected.
 * Displays count + action buttons.
 */
export function BulkActions({ selectedCount, actions, onClear }: BulkActionsProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-lg border border-border bg-background/95 px-4 py-3 shadow-lg backdrop-blur">
      <span className="text-sm font-medium text-foreground">
        {selectedCount} selected
      </span>
      <div className="h-4 w-px bg-border" />
      {actions.map((action) => (
        <button
          key={action.label}
          onClick={action.onClick}
          disabled={action.loading}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            action.variant === 'destructive'
              ? 'bg-red-600 text-white hover:bg-red-700 disabled:opacity-50'
              : 'bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50'
          }`}
        >
          {action.loading ? 'Processing...' : action.label}
        </button>
      ))}
      <button
        onClick={onClear}
        className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
      >
        Clear
      </button>
    </div>
  );
}
