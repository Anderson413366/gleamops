import { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import StopCard from '../../src/components/stop-card';
import SyncStatusBar from '../../src/components/sync-status-bar';
import { useRoute } from '../../src/hooks/use-route';
import { useShift } from '../../src/hooks/use-shift';
import { useSyncState, syncNow } from '../../src/hooks/use-sync';
import { Colors, localDateIso } from '../../src/lib/constants';

export default function RouteTabScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [travelCapturing, setTravelCapturing] = useState<string | null>(null);
  const { route, stops, nextStop, progress, loading, isOffline, refetch } = useRoute(localDateIso());
  const { pendingCount, lastSyncAt, isSyncing } = useSyncState();
  const { captureTravel } = useShift(route?.id ?? null);

  const onCaptureTravel = async (fromStopId: string, toStopId: string) => {
    const key = `${fromStopId}-${toStopId}`;
    setTravelCapturing(key);
    try {
      await captureTravel(fromStopId, toStopId);
    } finally {
      setTravelCapturing(null);
    }
  };

  const progressPct = useMemo(() => {
    if (progress.total === 0) return 0;
    return Math.round((progress.done / progress.total) * 100);
  }, [progress.done, progress.total]);

  const onRefresh = async () => {
    setRefreshing(true);
    await syncNow();
    await refetch();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {isOffline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>Offline — cached route shown</Text>
        </View>
      )}

      {(pendingCount > 0 || isOffline) && (
        <SyncStatusBar
          pendingCount={pendingCount}
          lastSyncAt={lastSyncAt}
          isSyncing={isSyncing}
          onSyncPress={onRefresh}
        />
      )}

      {!route && (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No route assigned tonight</Text>
          <Text style={styles.emptyText}>
            When a supervisor publishes and assigns your route, it will appear here.
          </Text>
        </View>
      )}

      {route && (
        <>
          <View style={styles.actionCard}>
            {!route.shift_started_at && (
              <>
                <Text style={styles.actionTitle}>Start your shift</Text>
                <Text style={styles.actionText}>
                  Vehicle: {route.template?.default_vehicle?.name ?? route.template?.default_vehicle_id ?? 'Not set'}
                </Text>
                <Text style={styles.actionText}>Key box: {route.key_box_number ?? route.template?.default_key_box ?? 'Not set'}</Text>

                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() => router.push(`/route/start-shift?routeId=${route.id}`)}
                >
                  <Text style={styles.primaryButtonText}>Start Shift</Text>
                </TouchableOpacity>
              </>
            )}

            {route.shift_started_at && !route.shift_ended_at && nextStop && (
              <>
                <Text style={styles.actionTitle}>Next best action</Text>
                <Text style={styles.actionText}>Go to {nextStop.site_job?.site?.name ?? `Stop ${nextStop.stop_order}`}</Text>

                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() => router.push(`/route/stop/${nextStop.id}`)}
                >
                  <Text style={styles.primaryButtonText}>Go To Next Stop</Text>
                </TouchableOpacity>
              </>
            )}

            {route.shift_started_at && !route.shift_ended_at && !nextStop && (
              <>
                <Text style={styles.actionTitle}>All stops finished</Text>
                <Text style={styles.actionText}>Review your shift and close it out.</Text>

                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() => router.push(`/route/end-shift?routeId=${route.id}`)}
                >
                  <Text style={styles.primaryButtonText}>End Shift</Text>
                </TouchableOpacity>
              </>
            )}

            {route.shift_ended_at && (
              <>
                <Text style={styles.actionTitle}>Great work tonight</Text>
                <Text style={styles.actionText}>Your shift is complete.</Text>
              </>
            )}
          </View>

          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>Progress</Text>
              <Text style={styles.progressLabel}>{progress.done} of {progress.total} stops</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
            </View>
          </View>

          {route.shift_started_at && (
            <View style={styles.stopList}>
              {stops.map((stop, stopIndex) => {
                const prevStop = stopIndex > 0 ? stops[stopIndex - 1] : null;
                const canLogTravel = prevStop?.stop_status === 'COMPLETED';
                const travelKey = prevStop ? `${prevStop.id}-${stop.id}` : '';

                return (
                  <View key={stop.id}>
                    {canLogTravel && prevStop && (
                      <TouchableOpacity
                        style={[styles.travelButton, travelCapturing === travelKey && styles.travelButtonDisabled]}
                        disabled={travelCapturing === travelKey}
                        onPress={() => void onCaptureTravel(prevStop.id, stop.id)}
                      >
                        <Text style={styles.travelButtonText}>
                          {travelCapturing === travelKey ? 'Logging…' : 'Log Travel'}
                        </Text>
                      </TouchableOpacity>
                    )}
                    <StopCard
                      stop={stop}
                      isNext={nextStop?.id === stop.id}
                      onPress={() => router.push(`/route/stop/${stop.id}`)}
                    />
                  </View>
                );
              })}
            </View>
          )}

          <View style={styles.secondaryActions}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.push(`/route/load-sheet?routeId=${route.id}`)}
            >
              <Text style={styles.secondaryButtonText}>View Load Sheet</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.surface },
  content: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  offlineBanner: {
    backgroundColor: Colors.light.warning,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  offlineText: { color: '#fff', fontSize: 12, fontWeight: '600', textAlign: 'center' },
  emptyCard: {
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    padding: 20,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.light.text },
  emptyText: { marginTop: 8, fontSize: 14, color: Colors.light.textSecondary, lineHeight: 20 },
  actionCard: {
    marginTop: 8,
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    padding: 16,
  },
  actionTitle: { fontSize: 18, fontWeight: '700', color: Colors.light.text },
  actionText: { marginTop: 6, color: Colors.light.textSecondary, fontSize: 14 },
  primaryButton: {
    marginTop: 14,
    borderRadius: 10,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
    paddingVertical: 12,
  },
  primaryButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  progressCard: {
    marginTop: 12,
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    padding: 14,
  },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressTitle: { color: Colors.light.text, fontWeight: '700', fontSize: 14 },
  progressLabel: { color: Colors.light.textSecondary, fontSize: 12 },
  progressTrack: {
    marginTop: 10,
    height: 8,
    borderRadius: 999,
    backgroundColor: Colors.light.border,
    overflow: 'hidden',
  },
  progressFill: {
    height: 8,
    backgroundColor: Colors.light.primary,
    borderRadius: 999,
  },
  stopList: {
    marginTop: 12,
  },
  travelButton: {
    marginBottom: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.info,
    backgroundColor: `${Colors.light.info}10`,
    alignItems: 'center',
    paddingVertical: 8,
  },
  travelButtonDisabled: { opacity: 0.45 },
  travelButtonText: { color: Colors.light.info, fontWeight: '600', fontSize: 13 },
  secondaryActions: {
    marginTop: 6,
  },
  secondaryButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.background,
    alignItems: 'center',
    paddingVertical: 11,
  },
  secondaryButtonText: { color: Colors.light.text, fontWeight: '600', fontSize: 14 },
});
