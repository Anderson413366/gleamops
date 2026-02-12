import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/contexts/auth-context';
import { Colors, STATUS_COLORS } from '../../src/lib/constants';

interface TodayTicket {
  id: string;
  ticket_code: string;
  status: string;
  scheduled_date: string;
  start_time: string | null;
  end_time: string | null;
  site?: { name: string; site_code: string } | null;
  assignments?: { staff_id: string }[];
}

function formatTime(t: string | null): string {
  if (!t) return '';
  const parts = t.split(':');
  const h = parseInt(parts[0], 10);
  const m = parts[1];
  const ampm = h >= 12 ? 'pm' : 'am';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m}${ampm}`;
}

export default function TodayScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [tickets, setTickets] = useState<TodayTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const fetchTickets = useCallback(async () => {
    const { data, error } = await supabase
      .from('work_tickets')
      .select(`
        id, ticket_code, status, scheduled_date, start_time, end_time,
        site:site_id(name, site_code),
        assignments:ticket_assignments(staff_id)
      `)
      .eq('scheduled_date', today)
      .is('archived_at', null)
      .order('start_time', { ascending: true });

    if (!error && data) setTickets(data as unknown as TodayTicket[]);
  }, [today]);

  useEffect(() => {
    setLoading(true);
    fetchTickets().finally(() => setLoading(false));
  }, [fetchTickets]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTickets();
    setRefreshing(false);
  }, [fetchTickets]);

  const completedCount = tickets.filter((t) => t.status === 'COMPLETED' || t.status === 'VERIFIED').length;
  const inProgressCount = tickets.filter((t) => t.status === 'IN_PROGRESS').length;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{tickets.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
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

      {/* Ticket List */}
      <FlatList
        data={tickets}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.light.primary} />
        }
        contentContainerStyle={tickets.length === 0 ? styles.center : styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No tickets today</Text>
            <Text style={styles.emptyText}>You have no scheduled work tickets for today.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/ticket/${item.id}`)}
            activeOpacity={0.7}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[item.status] ?? '#9CA3AF' }]} />
              <Text style={styles.ticketCode}>{item.ticket_code}</Text>
              <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLORS[item.status] ?? '#9CA3AF') + '20' }]}>
                <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] ?? '#9CA3AF' }]}>
                  {item.status.replace('_', ' ')}
                </Text>
              </View>
            </View>
            <Text style={styles.siteName}>{item.site?.name ?? 'No site'}</Text>
            {item.start_time && (
              <Text style={styles.time}>
                {formatTime(item.start_time)}{item.end_time ? ` - ${formatTime(item.end_time)}` : ''}
              </Text>
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
  statsBar: {
    flexDirection: 'row',
    backgroundColor: Colors.light.background,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '700', color: Colors.light.text },
  statLabel: { fontSize: 12, color: Colors.light.textSecondary, marginTop: 2 },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
    marginBottom: 12,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  ticketCode: { fontSize: 14, fontWeight: '600', color: Colors.light.text, flex: 1, fontFamily: 'monospace' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  siteName: { fontSize: 16, fontWeight: '500', color: Colors.light.text, marginBottom: 4 },
  time: { fontSize: 13, color: Colors.light.textSecondary },
  empty: { alignItems: 'center', padding: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: Colors.light.text, marginBottom: 8 },
  emptyText: { fontSize: 14, color: Colors.light.textSecondary, textAlign: 'center' },
});
