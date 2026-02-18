import { flushQueue, getFailedCount, getPendingCount } from './mutation-queue';

export interface SyncEngineState {
  pending: number;
  failed: number;
  synced: number;
}

export async function runSyncEngine(): Promise<SyncEngineState> {
  const synced = await flushQueue();
  const [pending, failed] = await Promise.all([getPendingCount(), getFailedCount()]);

  return {
    pending,
    failed,
    synced,
  };
}
