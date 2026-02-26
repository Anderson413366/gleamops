import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { queryClient, asyncStoragePersister } from '../src/lib/query-client';
import { AuthProvider, useAuth } from '../src/contexts/auth-context';
import { useRouter, useSegments } from 'expo-router';
import { useSyncManager } from '../src/hooks/use-sync';
import { supabase } from '../src/lib/supabase';

function RootLayoutNav() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [homeGroup, setHomeGroup] = useState<'tabs' | 'specialist' | null>(null);

  // Initialize offline sync: auto-flushes mutation queue on app foreground
  useSyncManager();

  useEffect(() => {
    let active = true;

    async function resolveHomeGroup() {
      if (!session) {
        if (active) setHomeGroup(null);
        return;
      }

      const role = String(session.user?.app_metadata?.role ?? '').toUpperCase();
      if (role !== 'CLEANER') {
        if (active) setHomeGroup('tabs');
        return;
      }

      const { data: staff } = await supabase
        .from('staff')
        .select('id')
        .eq('user_id', session.user.id)
        .is('archived_at', null)
        .maybeSingle();

      if (!staff?.id) {
        if (active) setHomeGroup('tabs');
        return;
      }

      const today = new Date().toISOString().slice(0, 10);
      const { data: assignedRoute } = await supabase
        .from('routes')
        .select('id')
        .eq('route_owner_staff_id', staff.id)
        .eq('route_date', today)
        .is('archived_at', null)
        .limit(1)
        .maybeSingle();

      if (active) {
        setHomeGroup(assignedRoute?.id ? 'tabs' : 'specialist');
      }
    }

    void resolveHomeGroup();
    return () => {
      active = false;
    };
  }, [session]);

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inSpecialistGroup = segments[0] === '(specialist)';

    if (!session) {
      if (!inAuthGroup) {
        router.replace('/(auth)/login');
      }
      return;
    }

    if (!homeGroup) return;

    const target = homeGroup === 'specialist' ? '/(specialist)/my-sites' : '/(tabs)';

    if (inAuthGroup) {
      router.replace(target);
      return;
    }

    if (homeGroup === 'specialist' && !inSpecialistGroup) {
      router.replace('/(specialist)/my-sites');
    } else if (homeGroup === 'tabs' && inSpecialistGroup) {
      router.replace('/(tabs)');
    }
  }, [session, loading, segments, homeGroup, router]);

  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(specialist)" />
        <Stack.Screen name="ticket/[id]" options={{ headerShown: true, title: 'Ticket Details' }} />
        <Stack.Screen name="inspection/[id]" options={{ headerShown: true, title: 'Inspection Details' }} />
        <Stack.Screen name="route/start-shift" options={{ headerShown: true, title: 'Start Shift' }} />
        <Stack.Screen name="route/load-sheet" options={{ headerShown: true, title: 'Load Sheet' }} />
        <Stack.Screen name="route/stop/[id]" options={{ headerShown: true, title: 'Stop Details' }} />
        <Stack.Screen name="route/end-shift" options={{ headerShown: true, title: 'End Shift' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister: asyncStoragePersister }}
    >
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </PersistQueryClientProvider>
  );
}
