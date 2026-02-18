export type SyncConflictResolution = 'retry' | 'dismiss' | 'manual_review';

export interface SyncConflict {
  queue_item_id: string;
  error_code: string;
  error_message: string;
}

export function resolveSyncConflict(conflict: SyncConflict): SyncConflictResolution {
  if (conflict.error_code.includes('VERSION')) return 'manual_review';
  if (conflict.error_code.includes('NOT_FOUND')) return 'dismiss';
  return 'retry';
}
