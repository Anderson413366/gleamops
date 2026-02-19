import { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl,
  ActivityIndicator, Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMyDay, type TodayTicket } from '../../src/hooks/use-my-day';
import { useSyncState, syncNow } from '../../src/hooks/use-sync';
import { Colors } from '../../src/lib/constants';
import TicketCard from '../../src/components/ticket-card';
import SyncStatusBar from '../../src/components/sync-status-bar';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function MyDayScreen() {
  const router = useRouter();
  const { staffId, staffName, tickets, loading, refreshing, isOffline, refetch } = useMyDay();
  const { pendingCount, lastSyncAt, isSyncing } = useSyncState();
  const [myOnly, setMyOnly] = useState(true);

  const displayTickets = useMemo(() => {
    if (myOnly && staffId) {
      return tickets.filter((t) => t.assignments?.some((a) => a.staff_id === staffId));
    }
    return tickets;
  }, [tickets, myOnly, staffId]);

  const myTickets = useMemo(() => {
    if (!staffId) return [];
    return tickets.filter((t) => t.assignments?.some((a) => a.staff_id === staffId));
  }, [tickets, staffId]);

  const completedCount = displayTickets.filter((t) => t.status === 'COMPLETED' || t.status === 'VERIFIED').length;
  const inProgressCount = displayTickets.filter((t) => t.status === 'IN_PROGRESS').length;
  const scheduledCount = displayTickets.filter((t) => t.status === 'SCHEDULED').length;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Offline banner */}
      {isOffline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerText}>
            Offline — cached data
          </Text>
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>
            {getGreeting()}, {staffName ? staffName.split(' ')[0] : 'there'}
          </Text>
          <Text style={styles.dateText}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsBar}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{displayTickets.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: Colors.light.info }]}>{scheduledCount}</Text>
          <Text style={styles.statLabel}>Upcoming</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: Colors.light.warning }]}>{inProgressCount}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: Colors.light.success }]}>{completedCount}</Text>
          <Text style={styles.statLabel}>Done</Text>
        </View>
      </View>

      {/* Sync Status Bar */}
      <SyncStatusBar
        pendingCount={pendingCount}
        lastSyncAt={lastSyncAt}
        isSyncing={isSyncing}
        onSyncPress={async () => { await syncNow(); refetch(); }}
      />

      {/* Filter */}
      <View style={styles.filterBar}>
        <Text style={styles.filterLabel}>
          {myOnly ? `My Tickets (${myTickets.length})` : `All Tickets (${tickets.length})`}
        </Text>
        <View style={styles.filterToggle}>
          <Text style={styles.filterToggleLabel}>My Only</Text>
          <Switch
            value={myOnly}
            onValueChange={setMyOnly}
            trackColor={{ false: '#D1D5DB', true: Colors.light.primary + '40' }}
            thumbColor={myOnly ? Colors.light.primary : '#9CA3AF'}
          />
        </View>
      </View>

      {/* List */}
      <FlatList
        data={displayTickets}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={async () => { await syncNow(); refetch(); }} tintColor={Colors.light.primary} />
        }
        contentContainerStyle={displayTickets.length === 0 ? styles.center : styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>
              {myOnly ? 'No tickets assigned to you today' : 'No tickets today'}
            </Text>
            <Text style={styles.emptyText}>
              {myOnly
                ? 'You don\'t have any assigned work tickets for today. Toggle "My Only" off to see all tickets.'
                : 'There are no scheduled work tickets for today.'}
            </Text>
          </View>
        }
        renderItem={({ item }: { item: TodayTicket }) => {
          const isMyTicket = !!staffId && !!item.assignments?.some((a) => a.staff_id === staffId);
          const myRole = item.assignments?.find((a) => a.staff_id === staffId)?.role ?? null;

          return (
            <TicketCard
              ticketCode={item.ticket_code}
              siteName={item.site?.name ?? 'No site'}
              status={item.status}
              scheduledDate={item.scheduled_date}
              startTime={item.start_time}
              endTime={item.end_time}
              crewCount={item.assignments?.length}
              isMine={isMyTicket}
              myRole={myRole}
              onPress={() => router.push(`/ticket/${item.id}`)}
            />
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.surface },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  offlineBanner: {
    backgroundColor: Colors.light.warning,
    paddingVertical: 6,
    alignItems: 'center',
  },
  offlineBannerText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  header: {
    backgroundColor: Colors.light.primary,
    paddingTop: 16,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  greeting: { fontSize: 22, fontWeight: '700', color: '#fff' },
  dateText: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: Colors.light.background,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '700', color: Colors.light.text },
  statLabel: { fontSize: 11, color: Colors.light.textSecondary, marginTop: 2, textTransform: 'uppercase' },
  filterBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  filterLabel: { fontSize: 14, fontWeight: '600', color: Colors.light.text },
  filterToggle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  filterToggleLabel: { fontSize: 12, color: Colors.light.textSecondary },
  list: { padding: 16, paddingBottom: 32 },
  empty: { alignItems: 'center', padding: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: Colors.light.text, marginBottom: 8 },
  emptyText: { fontSize: 14, color: Colors.light.textSecondary, textAlign: 'center' },
});
