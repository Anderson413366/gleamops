import { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl,
  ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMySchedule } from '../../src/hooks/use-my-schedule';
import { Colors } from '../../src/lib/constants';

type ViewMode = 'today' | 'week';

export default function ScheduleTab() {
  const router = useRouter();
  const { upcoming, loading, refreshing, isOffline, refetch } = useMySchedule();
  const [viewMode, setViewMode] = useState<ViewMode>('today');

  const today = new Date().toISOString().slice(0, 10);

  const filtered = useMemo(() => {
    if (viewMode === 'today') {
      return upcoming.filter((t) => t.scheduled_date === today);
    }
    return upcoming;
  }, [upcoming, viewMode, today]);

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

      <View style={styles.toggleBar}>
        <TouchableOpacity
          style={[styles.toggleButton, viewMode === 'today' && styles.toggleActive]}
          onPress={() => setViewMode('today')}
        >
          <Text style={[styles.toggleText, viewMode === 'today' && styles.toggleTextActive]}>
            Today ({upcoming.filter((t) => t.scheduled_date === today).length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, viewMode === 'week' && styles.toggleActive]}
          onPress={() => setViewMode('week')}
        >
          <Text style={[styles.toggleText, viewMode === 'week' && styles.toggleTextActive]}>
            Upcoming ({upcoming.length})
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refetch} tintColor={Colors.light.primary} />
        }
        contentContainerStyle={filtered.length === 0 ? styles.center : styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No upcoming shifts</Text>
            <Text style={styles.emptyText}>
              {viewMode === 'today'
                ? 'You have no scheduled work for today.'
                : 'You have no upcoming scheduled work.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.shiftCard}
            onPress={() => router.push(`/ticket/${item.id}`)}
          >
            <View style={styles.shiftHeader}>
              <Text style={styles.shiftCode}>{item.ticket_code}</Text>
              <View style={[styles.statusBadge, item.status === 'IN_PROGRESS' ? styles.statusActive : styles.statusScheduled]}>
                <Text style={styles.statusText}>{item.status}</Text>
              </View>
            </View>
            <Text style={styles.shiftSite}>{item.site?.name ?? 'No site'}</Text>
            <View style={styles.shiftTime}>
              <Text style={styles.timeText}>{item.scheduled_date}</Text>
              {item.start_time && (
                <Text style={styles.timeText}> {item.start_time} - {item.end_time ?? '?'}</Text>
              )}
            </View>
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
  toggleBar: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: Colors.light.surface,
  },
  toggleActive: { backgroundColor: Colors.light.primary },
  toggleText: { fontSize: 14, fontWeight: '600', color: Colors.light.textSecondary },
  toggleTextActive: { color: '#fff' },
  list: { padding: 16, paddingBottom: 32 },
  empty: { alignItems: 'center', padding: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: Colors.light.text, marginBottom: 8 },
  emptyText: { fontSize: 14, color: Colors.light.textSecondary, textAlign: 'center' },
  shiftCard: {
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  shiftHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  shiftCode: { fontSize: 16, fontWeight: '700', color: Colors.light.text },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  statusScheduled: { backgroundColor: Colors.light.info + '20' },
  statusActive: { backgroundColor: Colors.light.warning + '20' },
  statusText: { fontSize: 11, fontWeight: '600', color: Colors.light.text, textTransform: 'uppercase' },
  shiftSite: { fontSize: 14, color: Colors.light.textSecondary, marginBottom: 4 },
  shiftTime: { flexDirection: 'row', alignItems: 'center' },
  timeText: { fontSize: 12, color: Colors.light.textSecondary },
});
