import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
  ActivityIndicator, Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/contexts/auth-context';
import { Colors, STATUS_COLORS } from '../../src/lib/constants';
import { cacheTodayTickets, getCachedTodayTickets } from '../../src/lib/offline-cache';

interface TodayTicket {
  id: string;
  ticket_code: string;
  status: string;
  scheduled_date: string;
  start_time: string | null;
  end_time: string | null;
  site?: { name: string; site_code: string } | null;
  job?: { job_code: string } | null;
  assignments?: { staff_id: string; role: string | null }[];
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

export default function MyDayScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [tickets, setTickets] = useState<TodayTicket[]>([]);
  const [staffId, setStaffId] = useState<string | null>(null);
  const [staffName, setStaffName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [myOnly, setMyOnly] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!user) return;
    supabase
      .from('staff')
      .select('id, full_name')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setStaffId(data.id);
          setStaffName(data.full_name);
        }
      });
  }, [user]);

  const fetchTickets = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('work_tickets')
        .select(`
          id, ticket_code, status, scheduled_date, start_time, end_time,
          site:site_id(name, site_code),
          job:job_id(job_code),
          assignments:ticket_assignments(staff_id, role)
        `)
        .eq('scheduled_date', today)
        .is('archived_at', null)
        .neq('status', 'CANCELLED')
        .order('start_time', { ascending: true });

      if (!error && data) {
        const typed = data as unknown as TodayTicket[];
        setTickets(typed);
        setIsOffline(false);
        // Cache for offline use
        await cacheTodayTickets(typed);
      } else {
        throw new Error(error?.message ?? 'fetch failed');
      }
    } catch {
      // Network error — fall back to cache
      const cached = await getCachedTodayTickets<TodayTicket>();
      if (cached) {
        setTickets(cached);
        setIsOffline(true);
      }
    }
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

  const displayTickets = myOnly && staffId
    ? tickets.filter((t) => t.assignments?.some((a) => a.staff_id === staffId))
    : tickets;

  const myTickets = staffId
    ? tickets.filter((t) => t.assignments?.some((a) => a.staff_id === staffId))
    : [];
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
          <Text style={styles.offlineBannerText}>Offline — showing cached data</Text>
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.light.primary} />
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
        renderItem={({ item }) => {
          const isMyTicket = staffId && item.assignments?.some((a) => a.staff_id === staffId);
          const myRole = item.assignments?.find((a) => a.staff_id === staffId)?.role;

          return (
            <TouchableOpacity
              style={[styles.card, isMyTicket && styles.myCard]}
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
              <View style={styles.cardFooter}>
                {item.start_time ? (
                  <Text style={styles.time}>
                    {formatTime(item.start_time)}{item.end_time ? ` – ${formatTime(item.end_time)}` : ''}
                  </Text>
                ) : (
                  <Text style={styles.time}>No time set</Text>
                )}
                {myRole && (
                  <View style={[styles.roleBadge, myRole === 'LEAD' ? styles.leadBadge : styles.cleanerBadge]}>
                    <Text style={styles.roleText}>{myRole}</Text>
                  </View>
                )}
              </View>
              {(item.assignments?.length ?? 0) > 0 && (
                <Text style={styles.crewText}>
                  {item.assignments!.length} crew member{item.assignments!.length > 1 ? 's' : ''}
                </Text>
              )}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
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
  card: {
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
    marginBottom: 12,
  },
  myCard: { borderLeftWidth: 4, borderLeftColor: Colors.light.primary },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  ticketCode: { fontSize: 14, fontWeight: '600', color: Colors.light.text, flex: 1, fontFamily: 'monospace' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  siteName: { fontSize: 16, fontWeight: '500', color: Colors.light.text, marginBottom: 8 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  time: { fontSize: 13, color: Colors.light.textSecondary },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  leadBadge: { backgroundColor: '#7C3AED20' },
  cleanerBadge: { backgroundColor: '#3B82F620' },
  roleText: { fontSize: 10, fontWeight: '700', color: Colors.light.text },
  crewText: { fontSize: 12, color: Colors.light.textSecondary, marginTop: 4 },
  empty: { alignItems: 'center', padding: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: Colors.light.text, marginBottom: 8 },
  emptyText: { fontSize: 14, color: Colors.light.textSecondary, textAlign: 'center' },
});
