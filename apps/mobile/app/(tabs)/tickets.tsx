import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { Colors, STATUS_COLORS } from '../../src/lib/constants';

interface TicketRow {
  id: string;
  ticket_code: string;
  status: string;
  scheduled_date: string;
  start_time: string | null;
  end_time: string | null;
  site?: { name: string; site_code: string } | null;
}

function formatDate(d: string): string {
  const date = new Date(d + 'T00:00:00');
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function TicketsScreen() {
  const router = useRouter();
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  // Get this week's range
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const fetchTickets = useCallback(async () => {
    const { data, error } = await supabase
      .from('work_tickets')
      .select(`
        id, ticket_code, status, scheduled_date, start_time, end_time,
        site:site_id(name, site_code)
      `)
      .is('archived_at', null)
      .gte('scheduled_date', weekStart.toISOString().split('T')[0])
      .lte('scheduled_date', weekEnd.toISOString().split('T')[0])
      .order('scheduled_date', { ascending: true })
      .order('start_time', { ascending: true });

    if (!error && data) setTickets(data as unknown as TicketRow[]);
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchTickets().finally(() => setLoading(false));
  }, [fetchTickets]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTickets();
    setRefreshing(false);
  }, [fetchTickets]);

  const filtered = search
    ? tickets.filter((t) =>
        t.ticket_code.toLowerCase().includes(search.toLowerCase()) ||
        t.site?.name?.toLowerCase().includes(search.toLowerCase()) ||
        t.status.toLowerCase().includes(search.toLowerCase())
      )
    : tickets;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search tickets..."
          placeholderTextColor={Colors.light.textSecondary}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.light.primary} />
        }
        contentContainerStyle={filtered.length === 0 ? styles.center : styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No tickets this week</Text>
            <Text style={styles.emptyText}>No work tickets scheduled for this week.</Text>
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
            <Text style={styles.date}>{formatDate(item.scheduled_date)}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.surface },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  searchInput: {
    backgroundColor: Colors.light.surface,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.light.text,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  list: { padding: 16 },
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
  date: { fontSize: 13, color: Colors.light.textSecondary },
  empty: { alignItems: 'center', padding: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: Colors.light.text, marginBottom: 8 },
  emptyText: { fontSize: 14, color: Colors.light.textSecondary, textAlign: 'center' },
});
