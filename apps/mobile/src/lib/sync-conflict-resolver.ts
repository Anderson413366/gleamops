export type SyncConflictResolution = 'retry' | 'dismiss' | 'manual_review';

export interface SyncConflict {
  queue_item_id: string;
  operation: string;
  entity_type: string;
  entity_id: string;
  error_code: string;
  error_message: string;
  client_version?: string | null;
  server_version?: string | null;
}

export interface ConflictResolutionResult {
  resolution: SyncConflictResolution;
  reason: string;
  can_auto_resolve: boolean;
}

/**
 * Resolve a sync conflict based on error code, operation type, and entity context.
 *
 * Conflict policy from masterplan:
 * - Checklist item conflict: last-write-wins with audit trail
 * - Clock ordering conflict: creates time_exception
 * - Version conflict: enters sync inbox for manual review
 * - No automatic destructive merges
 */
export function resolveSyncConflict(conflict: SyncConflict): ConflictResolutionResult {
  // Version mismatch — always requires manual review
  if (conflict.error_code.includes('VERSION') || conflict.error_code === 'TICKET_VERSION_CONFLICT') {
    return {
      resolution: 'manual_review',
      reason: 'Server version differs from local version. Review and decide which version to keep.',
      can_auto_resolve: false,
    };
  }

  // Entity not found — dismiss (cannot recover)
  if (conflict.error_code.includes('NOT_FOUND') || conflict.error_code === 'CHECKLIST_NOT_FOUND') {
    return {
      resolution: 'dismiss',
      reason: 'The target record no longer exists or was archived.',
      can_auto_resolve: true,
    };
  }

  // Checklist conflicts — last-write-wins (auto-retryable)
  if (conflict.operation.startsWith('checklist_item.')) {
    if (conflict.error_code === 'CHECKLIST_UPDATE_FAILED') {
      return {
        resolution: 'retry',
        reason: 'Checklist update failed. Will retry with last-write-wins policy.',
        can_auto_resolve: true,
      };
    }
    return {
      resolution: 'retry',
      reason: 'Checklist operation will be retried automatically.',
      can_auto_resolve: true,
    };
  }

  // Clock/time event ordering conflicts — manual review (creates time_exception)
  if (conflict.operation.startsWith('time_event.')) {
    if (conflict.error_code.includes('ORDERING') || conflict.error_code.includes('DUPLICATE')) {
      return {
        resolution: 'manual_review',
        reason: 'Time event ordering conflict detected. A time exception will be created for supervisor review.',
        can_auto_resolve: false,
      };
    }
    return {
      resolution: 'retry',
      reason: 'Time event will be retried.',
      can_auto_resolve: true,
    };
  }

  // Photo upload failures — always retry (resumable uploads)
  if (conflict.operation === 'photo.upload') {
    return {
      resolution: 'retry',
      reason: 'Photo upload will be retried. The file is preserved locally.',
      can_auto_resolve: true,
    };
  }

  // Inspection item conflicts
  if (conflict.operation === 'inspection_item.submit') {
    if (conflict.error_code === 'INSPECTION_ITEM_CONFLICT') {
      return {
        resolution: 'manual_review',
        reason: 'Inspection item was modified on the server. Review the latest values before resubmitting.',
        can_auto_resolve: false,
      };
    }
    return {
      resolution: 'retry',
      reason: 'Inspection submission will be retried.',
      can_auto_resolve: true,
    };
  }

  // Ticket completion conflicts
  if (conflict.operation === 'ticket.complete') {
    return {
      resolution: 'manual_review',
      reason: 'Ticket completion conflict. The ticket may have been updated by another user.',
      can_auto_resolve: false,
    };
  }

  // Generic server errors — retry with backoff
  if (conflict.error_code.includes('SERVER') || conflict.error_code.includes('TIMEOUT') || conflict.error_code.includes('NETWORK')) {
    return {
      resolution: 'retry',
      reason: 'Temporary server error. Will retry automatically.',
      can_auto_resolve: true,
    };
  }

  // Default: retry for unknown errors
  return {
    resolution: 'retry',
    reason: `Unknown error (${conflict.error_code}). Will attempt retry.`,
    can_auto_resolve: true,
  };
}

/**
 * Determine if a conflict should enter the sync inbox for user attention.
 */
export function shouldEnterSyncInbox(result: ConflictResolutionResult): boolean {
  return result.resolution === 'manual_review' || result.resolution === 'dismiss';
}
