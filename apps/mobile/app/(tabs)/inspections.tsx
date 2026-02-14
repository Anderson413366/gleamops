import { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
  ActivityIndicator, TextInput, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useInspections, type InspectionListItem } from '../../src/hooks/use-inspections';
import { Colors, STATUS_COLORS } from '../../src/lib/constants';

// ---------------------------------------------------------------------------
// Status filter chips
// ---------------------------------------------------------------------------
const STATUS_FILTERS = [
  { key: 'ALL', label: 'All' },
  { key: 'DRAFT', label: 'Draft' },
  { key: 'IN_PROGRESS', label: 'In Progress' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'SUBMITTED', label: 'Submitted' },
] as const;

const INSPECTION_STATUS_COLORS: Record<string, string> = {
  DRAFT: '#9CA3AF',
  IN_PROGRESS: Colors.light.warning,
  COMPLETED: Colors.light.success,
  SUBMITTED: Colors.light.primaryDark,
  ...STATUS_COLORS,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatScore(item: InspectionListItem): string | null {
  if (item.score_pct == null) return null;
  return `${Math.round(item.score_pct)}%`;
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function InspectionsScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const { inspections, allCount, loading, refreshing, isOffline, refetch } = useInspections(search, statusFilter);

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
          placeholder="Search inspections..."
          placeholderTextColor={Colors.light.textSecondary}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Status filter chips */}
      <View style={styles.chipContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
          {STATUS_FILTERS.map((f) => {
            const isActive = statusFilter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.chip, isActive && styles.chipActive]}
                onPress={() => setStatusFilter(f.key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={inspections}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => refetch()} tintColor={Colors.light.primary} />
        }
        contentContainerStyle={inspections.length === 0 ? styles.center : styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No inspections</Text>
            <Text style={styles.emptyText}>
              {statusFilter !== 'ALL'
                ? `No ${statusFilter.replace('_', ' ').toLowerCase()} inspections found.`
                : 'No inspections assigned to you yet.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const statusColor = INSPECTION_STATUS_COLORS[item.status] ?? '#9CA3AF';
          const score = formatScore(item);

          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push(`/inspection/${item.id}`)}
              activeOpacity={0.7}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                <Text style={styles.inspectionCode}>{item.inspection_code}</Text>
                <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                  <Text style={[styles.statusText, { color: statusColor }]}>
                    {item.status.replace('_', ' ')}
                  </Text>
                </View>
              </View>

              {/* Template name */}
              {item.template?.name && (
                <Text style={styles.templateName}>{item.template.name}</Text>
              )}

              {/* Site name */}
              <Text style={styles.siteName}>{item.site?.name ?? 'No site'}</Text>

              {/* Score + Date row */}
              <View style={styles.cardFooter}>
                {score != null && (
                  <View style={[
                    styles.scoreBadge,
                    { backgroundColor: item.passed ? Colors.light.success + '15' : Colors.light.error + '15' },
                  ]}>
                    <Text style={[
                      styles.scoreText,
                      { color: item.passed ? Colors.light.success : Colors.light.error },
                    ]}>
                      {score}{item.passed != null ? (item.passed ? ' Pass' : ' Fail') : ''}
                    </Text>
                  </View>
                )}
                {item.completed_at && (
                  <Text style={styles.date}>{formatDate(item.completed_at)}</Text>
                )}
                {!item.completed_at && item.started_at && (
                  <Text style={styles.date}>Started {formatDate(item.started_at)}</Text>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.surface },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Offline
  offlineBanner: {
    backgroundColor: Colors.light.warning,
    paddingVertical: 6,
    alignItems: 'center',
  },
  offlineBannerText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  // Search
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
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

  // Filter chips
  chipContainer: {
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  chipScroll: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.border,
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: Colors.light.primary + '15',
    borderColor: Colors.light.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.light.textSecondary,
  },
  chipTextActive: {
    color: Colors.light.primary,
    fontWeight: '600',
  },

  // List
  list: { padding: 16 },

  // Cards
  card: {
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
    marginBottom: 12,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  inspectionCode: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
    flex: 1,
    fontFamily: 'monospace',
  },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  templateName: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginBottom: 2,
  },
  siteName: { fontSize: 16, fontWeight: '500', color: Colors.light.text, marginBottom: 6 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  scoreBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  scoreText: { fontSize: 12, fontWeight: '600' },
  date: { fontSize: 13, color: Colors.light.textSecondary },

  // Empty
  empty: { alignItems: 'center', padding: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: Colors.light.text, marginBottom: 8 },
  emptyText: { fontSize: 14, color: Colors.light.textSecondary, textAlign: 'center' },
});
