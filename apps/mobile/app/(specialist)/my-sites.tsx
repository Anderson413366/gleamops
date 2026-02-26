import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useMySites, type SpecialistSite } from '../../src/hooks/use-my-sites';
import { syncNow, useSyncState } from '../../src/hooks/use-sync';
import SyncStatusBar from '../../src/components/sync-status-bar';
import { Colors } from '../../src/lib/constants';

function addressLine(address: Record<string, string> | null): string {
  if (!address) return 'Address not set';
  const line = [address.street, address.city, address.state, address.zip].filter(Boolean).join(', ');
  return line || 'Address not set';
}

export default function SpecialistMySitesScreen() {
  const router = useRouter();
  const { sites, loading, refreshing, isOffline, refetch } = useMySites();
  const { pendingCount, lastSyncAt, isSyncing } = useSyncState();

  const onRefresh = async () => {
    await syncNow();
    await refetch();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isOffline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerText}>Offline - showing cached sites</Text>
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

      <FlatList
        data={sites}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={sites.length === 0 ? styles.emptyContainer : styles.list}
        ListEmptyComponent={(
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No assigned sites</Text>
            <Text style={styles.emptyText}>
              Your assigned locations will appear here.
            </Text>
          </View>
        )}
        renderItem={({ item }: { item: SpecialistSite }) => (
          <View style={styles.siteCard}>
            <Text style={styles.siteName}>{item.name}</Text>
            <Text style={styles.siteCode}>{item.site_code}</Text>
            <Text style={styles.siteAddress}>{addressLine(item.address)}</Text>

            <TouchableOpacity
              style={styles.procedureButton}
              onPress={() => router.push(`/(specialist)/${item.id}/procedures`)}
              activeOpacity={0.8}
            >
              <Text style={styles.procedureButtonText}>How to clean this site</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.surface,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  offlineBanner: {
    backgroundColor: Colors.light.warning,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  offlineBannerText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  list: {
    padding: 16,
    gap: 12,
  },
  emptyContainer: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  emptyCard: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 12,
    backgroundColor: Colors.light.background,
    padding: 18,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.text,
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
  siteCard: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 12,
    backgroundColor: Colors.light.background,
    padding: 16,
  },
  siteName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.text,
  },
  siteCode: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  siteAddress: {
    marginTop: 8,
    fontSize: 14,
    color: Colors.light.textSecondary,
    lineHeight: 20,
  },
  procedureButton: {
    marginTop: 14,
    height: 56,
    borderRadius: 12,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  procedureButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});

