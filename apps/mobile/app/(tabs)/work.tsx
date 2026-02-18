import { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl,
  ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMyDay, type TodayTicket } from '../../src/hooks/use-my-day';
import { useSyncState, syncNow } from '../../src/hooks/use-sync';
import SyncStatusBar from '../../src/components/SyncStatusBar';
import { Colors } from '../../src/lib/constants';

type StatusFilter = 'all' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED';

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'SCHEDULED', label: 'Upcoming' },
  { key: 'IN_PROGRESS', label: 'Active' },
  { key: 'COMPLETED', label: 'Done' },
];

export default function WorkTab() {
  const router = useRouter();
  const { staffId, tickets, loading, refreshing, isOffline, refetch } = useMyDay();
  const { pendingCount, failedCount, lastSyncAt, isSyncing } = useSyncState();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const myTickets = useMemo(() => {
    if (!staffId) return tickets;
    return tickets.filter((t) => t.assignments?.some((a) => a.staff_id === staffId));
  }, [tickets, staffId]);

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return myTickets;
    return myTickets.filter((t) => t.status === statusFilter);
  }, [myTickets, statusFilter]);

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
          <Text style={styles.offlineBannerText}>Offline — cached data</Text>
        </View>
      )}

      <SyncStatusBar
        pendingCount={pendingCount}
        failedCount={failedCount}
        lastSyncAt={lastSyncAt}
        isSyncing={isSyncing}
        onSyncPress={async () => { await syncNow(); refetch(); }}
      />

      <View style={styles.filterBar}>
        {STATUS_FILTERS.map((f) => {
          const count = f.key === 'all'
            ? myTickets.length
            : myTickets.filter((t) => t.status === f.key).length;
          return (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, statusFilter === f.key && styles.filterChipActive]}
              onPress={() => setStatusFilter(f.key)}
            >
              <Text style={[styles.filterChipText, statusFilter === f.key && styles.filterChipTextActive]}>
                {f.label} ({count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={async () => { await syncNow(); refetch(); }} tintColor={Colors.light.primary} />
        }
        contentContainerStyle={filtered.length === 0 ? styles.center : styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No work tickets</Text>
            <Text style={styles.emptyText}>No tickets match the current filter.</Text>
          </View>
        }
        renderItem={({ item }: { item: TodayTicket }) => (
          <TouchableOpacity
            style={styles.ticketCard}
            onPress={() => router.push(`/ticket/${item.id}`)}
          >
            <View style={styles.ticketHeader}>
              <Text style={styles.ticketCode}>{item.ticket_code}</Text>
              <View style={[
                styles.statusDot,
                item.status === 'COMPLETED' ? styles.dotDone
                  : item.status === 'IN_PROGRESS' ? styles.dotActive
                  : styles.dotScheduled,
              ]} />
            </View>
            <Text style={styles.ticketSite}>{item.site?.name ?? 'No site'}</Text>
            {item.start_time && (
              <Text style={styles.ticketTime}>{item.start_time} - {item.end_time ?? '?'}</Text>
            )}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.surface },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  offlineBanner: { backgroundColor: Colors.light.warning, paddingVertical: 6, alignItems: 'center' },
  offlineBannerText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  filterChipActive: { backgroundColor: Colors.light.primary, borderColor: Colors.light.primary },
  filterChipText: { fontSize: 12, fontWeight: '600', color: Colors.light.textSecondary },
  filterChipTextActive: { color: '#fff' },
  list: { padding: 16, paddingBottom: 32 },
  empty: { alignItems: 'center', padding: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: Colors.light.text, marginBottom: 8 },
  emptyText: { fontSize: 14, color: Colors.light.textSecondary, textAlign: 'center' },
  ticketCard: {
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  ticketHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  ticketCode: { fontSize: 16, fontWeight: '700', color: Colors.light.text },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  dotScheduled: { backgroundColor: Colors.light.info },
  dotActive: { backgroundColor: Colors.light.warning },
  dotDone: { backgroundColor: Colors.light.success },
  ticketSite: { fontSize: 14, color: Colors.light.textSecondary, marginBottom: 4 },
  ticketTime: { fontSize: 12, color: Colors.light.textSecondary },
});
