'use client';

import { Badge } from '@gleamops/ui';
import type { StatusColor } from '@gleamops/shared';

interface QboSyncStatusProps {
  status: string;
  syncId?: string | null;
  syncError?: string | null;
  syncAttempts?: number;
  onRetry?: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; color: StatusColor }> = {
  PENDING: { label: 'Pending', color: 'yellow' },
  SYNCING: { label: 'Syncing', color: 'blue' },
  SYNCED: { label: 'Synced', color: 'green' },
  FAILED: { label: 'Failed', color: 'red' },
};

/**
 * QBO sync status badge with optional retry button for failed syncs.
 * Displays sync ID on hover when synced.
 */
export function QboSyncStatus({ status, syncId, syncError, syncAttempts, onRetry }: QboSyncStatusProps) {
  const config = STATUS_CONFIG[status] ?? { label: status, color: 'gray' as StatusColor };

  return (
    <div className="flex items-center gap-2">
      <Badge color={config.color} title={syncId ? `QBO ID: ${syncId}` : undefined}>
        {config.label}
      </Badge>
      {status === 'FAILED' && onRetry && (
        <button
          onClick={onRetry}
          className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
        >
          Retry{syncAttempts ? ` (${syncAttempts}/5)` : ''}
        </button>
      )}
      {status === 'FAILED' && syncError && (
        <span className="text-xs text-muted-foreground truncate max-w-[200px]" title={syncError}>
          {syncError}
        </span>
      )}
    </div>
  );
}
