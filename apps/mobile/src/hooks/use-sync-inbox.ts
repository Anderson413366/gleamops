import { useCallback, useEffect, useState } from 'react';
import {
  dismissFailedMutation,
  getFailedMutations,
  retryFailedMutation,
  type FailedMutation,
} from '../lib/mutation-queue';

export function useSyncInbox() {
  const [items, setItems] = useState<FailedMutation[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const failed = await getFailedMutations();
    setItems(failed);
    setLoading(false);
  }, []);

  const retryOne = useCallback(async (id: string) => {
    await retryFailedMutation(id);
    await refresh();
  }, [refresh]);

  const dismissOne = useCallback(async (id: string) => {
    await dismissFailedMutation(id);
    await refresh();
  }, [refresh]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    items,
    loading,
    refresh,
    retryOne,
    dismissOne,
  };
}
