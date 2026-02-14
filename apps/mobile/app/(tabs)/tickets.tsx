import { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl,
  ActivityIndicator, TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useWeekTickets } from '../../src/hooks/use-week-tickets';
import { Colors } from '../../src/lib/constants';
import TicketCard from '../../src/components/TicketCard';

export default function TicketsScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const { tickets, allCount, loading, refreshing, isOffline, refetch } = useWeekTickets(search);

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

      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search tickets..."
          placeholderTextColor={Colors.light.textSecondary}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <Text style={styles.resultCount}>
            {tickets.length} of {allCount} tickets
          </Text>
        )}
      </View>

      <FlatList
        data={tickets}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => refetch()} tintColor={Colors.light.primary} />
        }
        contentContainerStyle={tickets.length === 0 ? styles.center : styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No tickets this week</Text>
            <Text style={styles.emptyText}>
              {search ? 'No tickets match your search.' : 'No work tickets scheduled for this week.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TicketCard
            ticketCode={item.ticket_code}
            siteName={item.site?.name ?? 'No site'}
            status={item.status}
            scheduledDate={item.scheduled_date}
            startTime={item.start_time}
            endTime={item.end_time}
            onPress={() => router.push(`/ticket/${item.id}`)}
          />
        )}
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
  resultCount: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 6,
    textAlign: 'right',
  },
  list: { padding: 16 },
  empty: { alignItems: 'center', padding: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: Colors.light.text, marginBottom: 8 },
  emptyText: { fontSize: 14, color: Colors.light.textSecondary, textAlign: 'center' },
});
