/**
 * React Query client with AsyncStorage persistence.
 *
 * All query results are automatically persisted to AsyncStorage.
 * When the app starts offline, queries serve cached data immediately.
 * When online, stale queries refetch in the background (stale-while-revalidate).
 */
import { QueryClient, focusManager } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Platform, type AppStateStatus } from 'react-native';

// ---------------------------------------------------------------------------
// Refetch on app focus (React Native)
// When the app comes to foreground, react-query refetches stale queries.
// ---------------------------------------------------------------------------
if (Platform.OS !== 'web') {
  focusManager.setEventListener((handleFocus) => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      handleFocus(state === 'active');
    });
    return () => sub.remove();
  });
}

// ---------------------------------------------------------------------------
// Query Client
// ---------------------------------------------------------------------------
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24,  // 24h — keep unused cache entries for 1 day
      staleTime: 1000 * 60 * 5,      // 5min — data considered fresh for 5 minutes
      retry: 1,                       // Retry once on failure
      networkMode: 'offlineFirst',    // Run queryFn even offline; serve cache on failure
    },
  },
});

// ---------------------------------------------------------------------------
// AsyncStorage Persister
// ---------------------------------------------------------------------------
export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'GLEAMOPS_QUERY_CACHE',
  throttleTime: 1000, // Persist at most every 1s to avoid thrashing
});
