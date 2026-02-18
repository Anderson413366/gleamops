'use client';

import { Badge } from '@gleamops/ui';

export function SyncStatusBar({ pending, failed, syncing }: { pending: number; failed: number; syncing: boolean }) {
  if (!syncing && pending === 0 && failed === 0) return null;

  if (failed > 0) {
    return <Badge color="red">Sync failed: {failed}</Badge>;
  }

  if (syncing) {
    return <Badge color="blue">Syncing {pending} item(s)...</Badge>;
  }

  return <Badge color="yellow">Pending sync: {pending}</Badge>;
}
