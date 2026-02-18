import { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
  RefreshControl, Linking, Alert,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Colors, STATUS_COLORS } from '../../src/lib/constants';
import {
  useInspectionDetail,
  type InspectionItemRow,
  type InspectionIssueRow,
} from '../../src/hooks/use-inspection-detail';
import { enqueue, getPendingInspectionItemIds } from '../../src/lib/mutation-queue';
import { useSyncState, syncNow } from '../../src/hooks/use-sync';
import SyncStatusBar from '../../src/components/SyncStatusBar';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const INSPECTION_STATUS_COLORS: Record<string, string> = {
  DRAFT: '#9CA3AF',
  IN_PROGRESS: Colors.light.warning,
  COMPLETED: Colors.light.success,
  SUBMITTED: Colors.light.primaryDark,
  ...STATUS_COLORS,
};

const SEVERITY_COLORS: Record<string, string> = {
  LOW: '#3B82F6',
  MEDIUM: Colors.light.warning,
  HIGH: '#F97316',
  CRITICAL: Colors.light.error,
};

type TabKey = 'overview' | 'items' | 'issues';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatSyncAge(iso: string | null): string {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return 'just now';
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function InspectionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const detail = useInspectionDetail(id);
  const {
    inspection, items, issues, staffId, tenantId,
    loading, isOffline, refetch,
    setItemScore, setInspectionStatus,
    invalidateItems, invalidateInspection,
  } = detail;

  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [refreshing, setRefreshing] = useState(false);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const { pendingCount, failedCount, lastSyncAt, isSyncing } = useSyncState();

  // Load pending IDs on mount and when pendingCount changes (sync completed)
  useEffect(() => {
    getPendingInspectionItemIds().then(setPendingIds);
  }, [pendingCount]);

  // When back online after sync completes, invalidate items for fresh data
  useEffect(() => {
    if (inspection && !isOffline && pendingCount === 0 && pendingIds.size === 0) {
      invalidateItems();
    }
  }, [pendingCount]); // eslint-disable-line react-hooks/exhaustive-deps

  const onRefresh = async () => {
    setRefreshing(true);
    const synced = await syncNow();
    if (synced > 0) invalidateItems();
    setPendingIds(await getPendingInspectionItemIds());
    await refetch();
    setRefreshing(false);
  };

  // -----------------------------------------------------------------------
  // Score an item (queue-first — never loses a write)
  // -----------------------------------------------------------------------
  const handleScore = async (item: InspectionItemRow, score: number) => {
    // 1. Durably persist to AsyncStorage FIRST
    await enqueue({
      type: 'inspection_score',
      inspectionItemId: item.id,
      score,
      notes: item.notes,
      photoTaken: item.photo_taken,
    });

    // 2. Optimistic update in react-query cache
    setItemScore(item.id, score);
    setPendingIds((prev) => new Set(prev).add(item.id));

    // 3. Try immediate sync (non-blocking)
    syncNow().then(() => getPendingInspectionItemIds().then(setPendingIds));
  };

  // -----------------------------------------------------------------------
  // Status change (via offline queue)
  // -----------------------------------------------------------------------
  const changeStatus = async (newStatus: 'IN_PROGRESS' | 'COMPLETED' | 'SUBMITTED') => {
    if (!inspection || !tenantId) return;
    if (isOffline) {
      Alert.alert('Offline', 'Status changes require an internet connection.');
      return;
    }

    const now = new Date().toISOString();
    let completedAt: string | null = null;
    let totalScore: number | null = null;
    let maxScore: number | null = null;
    let scorePct: number | null = null;
    let passed: boolean | null = null;

    // If completing, compute scores
    if (newStatus === 'COMPLETED') {
      const scoringScale = inspection.template?.scoring_scale ?? 5;
      const passThreshold = inspection.template?.pass_threshold ?? 80;

      const scoredItems = items.filter((i) => i.score != null);
      totalScore = scoredItems.reduce((sum, i) => sum + (i.score ?? 0), 0);
      maxScore = items.length * scoringScale;
      scorePct = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
      passed = scorePct >= passThreshold;
      completedAt = now;
    }

    // Enqueue status mutation
    await enqueue({
      type: 'inspection_status',
      tenantId,
      inspectionId: inspection.id,
      status: newStatus,
      completedAt,
      totalScore,
      maxScore,
      scorePct,
      passed,
      clientVersion: inspection.client_version,
    });

    // Optimistic update
    setInspectionStatus(newStatus, {
      ...(completedAt ? { completed_at: completedAt } : {}),
      ...(newStatus === 'IN_PROGRESS' ? { started_at: now } : {}),
      ...(totalScore !== null ? { total_score: totalScore } : {}),
      ...(maxScore !== null ? { max_score: maxScore } : {}),
      ...(scorePct !== null ? { score_pct: scorePct } : {}),
      ...(passed !== null ? { passed } : {}),
      client_version: inspection.client_version + 1,
    });

    // Try immediate sync
    const synced = await syncNow();
    if (synced > 0) {
      invalidateInspection();
    }
  };

  const handleStart = () => changeStatus('IN_PROGRESS');
  const handleComplete = () => {
    const unscoredCount = items.filter((i) => i.score == null).length;
    if (unscoredCount > 0) {
      Alert.alert(
        'Unscored Items',
        `${unscoredCount} item(s) have not been scored. Complete anyway?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Complete Anyway', onPress: () => changeStatus('COMPLETED') },
        ],
      );
      return;
    }
    changeStatus('COMPLETED');
  };
  const handleSubmit = () => changeStatus('SUBMITTED');

  // -----------------------------------------------------------------------
  // Toggle notes expansion
  // -----------------------------------------------------------------------
  const toggleNotes = (itemId: string) => {
    setExpandedNotes((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  // -----------------------------------------------------------------------
  // Group items by section
  // -----------------------------------------------------------------------
  const groupedItems = useMemo(() => {
    const groups: { section: string; items: InspectionItemRow[] }[] = [];
    const sectionMap = new Map<string, InspectionItemRow[]>();

    for (const item of items) {
      const key = item.section ?? 'General';
      if (!sectionMap.has(key)) {
        sectionMap.set(key, []);
        groups.push({ section: key, items: sectionMap.get(key)! });
      }
      sectionMap.get(key)!.push(item);
    }

    return groups;
  }, [items]);

  // -----------------------------------------------------------------------
  // Derived
  // -----------------------------------------------------------------------
  const scoringScale = inspection?.template?.scoring_scale ?? 5;
  const scoredCount = items.filter((i) => i.score != null).length;

  // -----------------------------------------------------------------------
  // Loading / Error states
  // -----------------------------------------------------------------------
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  if (!inspection) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Inspection not found</Text>
      </View>
    );
  }

  const site = inspection.site;
  const addressParts = [site?.street_address, site?.city, site?.state].filter(Boolean);
  const addressStr = addressParts.join(', ');

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <>
      <Stack.Screen options={{ title: inspection.inspection_code }} />
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Offline banner */}
        {isOffline && (
          <View style={styles.offlineBanner}>
            <Text style={styles.offlineBannerText}>
              Offline — cached data{lastSyncAt ? ` · synced ${formatSyncAge(lastSyncAt)}` : ''}
            </Text>
          </View>
        )}

        {/* Status Bar */}
        <View style={styles.statusBar}>
          <View style={[styles.statusBadge, { backgroundColor: (INSPECTION_STATUS_COLORS[inspection.status] ?? '#9CA3AF') + '20' }]}>
            <View style={[styles.statusDot, { backgroundColor: INSPECTION_STATUS_COLORS[inspection.status] ?? '#9CA3AF' }]} />
            <Text style={[styles.statusText, { color: INSPECTION_STATUS_COLORS[inspection.status] ?? '#9CA3AF' }]}>
              {inspection.status.replace('_', ' ')}
            </Text>
          </View>
          {pendingIds.size > 0 && (
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingBadgeText}>{pendingIds.size} pending</Text>
            </View>
          )}
        </View>

        {/* Sync Status */}
        {(pendingCount > 0 || isOffline) && (
          <SyncStatusBar
            pendingCount={pendingCount}
            failedCount={failedCount}
            lastSyncAt={lastSyncAt}
            isSyncing={isSyncing}
            onSyncPress={onRefresh}
          />
        )}

        {/* Quick Actions */}
        <View style={styles.actions}>
          {inspection.status === 'DRAFT' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.startButton]}
              onPress={handleStart}
              activeOpacity={0.7}
            >
              <Text style={styles.actionButtonText}>Start Inspection</Text>
            </TouchableOpacity>
          )}
          {inspection.status === 'IN_PROGRESS' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.completeButton]}
              onPress={handleComplete}
              activeOpacity={0.7}
            >
              <Text style={styles.actionButtonText}>Complete Inspection</Text>
            </TouchableOpacity>
          )}
          {inspection.status === 'COMPLETED' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.submitButton]}
              onPress={handleSubmit}
              activeOpacity={0.7}
            >
              <Text style={styles.actionButtonText}>Submit Inspection</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Tab Bar */}
        <View style={styles.tabBar}>
          {(['overview', 'items', 'issues'] as TabKey[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'overview' ? 'Overview' :
                 tab === 'items' ? `Items${items.length > 0 ? ` (${scoredCount}/${items.length})` : ''}` :
                 `Issues${issues.length > 0 ? ` (${issues.length})` : ''}`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ---- OVERVIEW TAB ---- */}
        {activeTab === 'overview' && (
          <>
            {/* Template Info */}
            {inspection.template && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Template</Text>
                <Text style={styles.templateNameLarge}>{inspection.template.name}</Text>
                <View style={styles.row}>
                  <Text style={styles.label}>Scoring Scale</Text>
                  <Text style={styles.value}>0 – {inspection.template.scoring_scale}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Pass Threshold</Text>
                  <Text style={styles.value}>{inspection.template.pass_threshold}%</Text>
                </View>
              </View>
            )}

            {/* Site Info */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Site</Text>
              <Text style={styles.siteNameLarge}>{site?.name ?? '—'}</Text>
              {site?.site_code && (
                <Text style={styles.siteCode}>{site.site_code}</Text>
              )}
              {addressStr.length > 0 && (
                <TouchableOpacity
                  onPress={() => Linking.openURL(`https://maps.apple.com/?q=${encodeURIComponent(addressStr)}`)}
                >
                  <Text style={[styles.address, styles.linkText]}>{addressStr}</Text>
                  <Text style={styles.linkHint}>Tap for directions</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Score Summary */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Score</Text>
              {inspection.score_pct != null ? (
                <>
                  <View style={styles.scoreRow}>
                    <Text style={styles.scoreLarge}>{Math.round(inspection.score_pct)}%</Text>
                    <View style={[
                      styles.passFailBadge,
                      { backgroundColor: inspection.passed ? Colors.light.success + '15' : Colors.light.error + '15' },
                    ]}>
                      <Text style={[
                        styles.passFailText,
                        { color: inspection.passed ? Colors.light.success : Colors.light.error },
                      ]}>
                        {inspection.passed ? 'PASS' : 'FAIL'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.scoreProgressBar}>
                    <View style={[
                      styles.scoreProgressFill,
                      {
                        width: `${inspection.score_pct}%`,
                        backgroundColor: inspection.passed ? Colors.light.success : Colors.light.error,
                      },
                    ]} />
                  </View>
                  <Text style={styles.scoreDetail}>
                    {inspection.total_score ?? 0} / {inspection.max_score ?? 0} points
                  </Text>
                </>
              ) : (
                <Text style={styles.noScore}>
                  {items.length > 0
                    ? `${scoredCount} of ${items.length} items scored`
                    : 'No items to score'}
                </Text>
              )}
            </View>

            {/* Dates */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Dates</Text>
              {inspection.started_at && (
                <View style={styles.row}>
                  <Text style={styles.label}>Started</Text>
                  <Text style={styles.value}>{formatDate(inspection.started_at)}</Text>
                </View>
              )}
              {inspection.completed_at && (
                <View style={styles.row}>
                  <Text style={styles.label}>Completed</Text>
                  <Text style={styles.value}>{formatDate(inspection.completed_at)}</Text>
                </View>
              )}
              {!inspection.started_at && !inspection.completed_at && (
                <Text style={styles.noScore}>Not started yet</Text>
              )}
            </View>

            {/* Notes */}
            {inspection.notes && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Notes</Text>
                <Text style={styles.notes}>{inspection.notes}</Text>
              </View>
            )}
          </>
        )}

        {/* ---- ITEMS TAB ---- */}
        {activeTab === 'items' && (
          <>
            {items.length === 0 ? (
              <View style={styles.emptyTab}>
                <Text style={styles.emptyTabTitle}>No Items</Text>
                <Text style={styles.emptyTabText}>This inspection has no items to score.</Text>
              </View>
            ) : (
              <>
                {/* Progress summary */}
                <View style={styles.card}>
                  <View style={styles.checklistHeader}>
                    <Text style={styles.cardTitle}>Progress</Text>
                    <Text style={styles.checklistCount}>{scoredCount}/{items.length}</Text>
                  </View>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${items.length > 0 ? (scoredCount / items.length) * 100 : 0}%`,
                          backgroundColor: scoredCount === items.length ? Colors.light.success : Colors.light.info,
                        },
                      ]}
                    />
                  </View>
                </View>

                {/* Items grouped by section */}
                {groupedItems.map((group) => (
                  <View key={group.section} style={styles.card}>
                    <Text style={styles.sectionTitle}>{group.section}</Text>
                    {group.items.map((item) => {
                      const isPending = pendingIds.has(item.id);
                      const isNotesExpanded = expandedNotes.has(item.id);

                      return (
                        <View key={item.id} style={styles.itemRow}>
                          {/* Label row */}
                          <View style={styles.itemLabelRow}>
                            <Text style={styles.itemLabel}>
                              {item.label}
                              {item.requires_photo && <Text style={styles.photoIndicator}> (photo)</Text>}
                            </Text>
                            {isPending && (
                              <View style={styles.itemPendingBadge}>
                                <Text style={styles.itemPendingText}>syncing</Text>
                              </View>
                            )}
                          </View>

                          {/* Score selector: tappable number buttons 0..scoringScale */}
                          <View style={styles.scoreSelector}>
                            {Array.from({ length: scoringScale + 1 }, (_, n) => n).map((n) => {
                              const isSelected = item.score === n;
                              return (
                                <TouchableOpacity
                                  key={n}
                                  style={[
                                    styles.scoreButton,
                                    isSelected && styles.scoreButtonSelected,
                                  ]}
                                  onPress={() => handleScore(item, n)}
                                  activeOpacity={0.7}
                                >
                                  <Text style={[
                                    styles.scoreButtonText,
                                    isSelected && styles.scoreButtonTextSelected,
                                  ]}>
                                    {n}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>

                          {/* Photo required indicator */}
                          {item.requires_photo && (
                            <View style={styles.photoRow}>
                              <Text style={[
                                styles.photoStatus,
                                { color: item.photo_taken ? Colors.light.success : Colors.light.warning },
                              ]}>
                                {item.photo_taken ? 'Photo taken' : 'Photo required'}
                              </Text>
                            </View>
                          )}

                          {/* Expandable notes */}
                          <TouchableOpacity
                            style={styles.notesToggle}
                            onPress={() => toggleNotes(item.id)}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.notesToggleText}>
                              {isNotesExpanded ? 'Hide notes' : 'Add notes'}
                              {item.notes ? ' (has notes)' : ''}
                            </Text>
                          </TouchableOpacity>

                          {isNotesExpanded && (
                            <View style={styles.notesContainer}>
                              <Text style={styles.notesDisplay}>
                                {item.notes || 'No notes yet'}
                              </Text>
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                ))}
              </>
            )}
          </>
        )}

        {/* ---- ISSUES TAB ---- */}
        {activeTab === 'issues' && (
          <>
            {issues.length === 0 ? (
              <View style={styles.emptyTab}>
                <Text style={styles.emptyTabTitle}>No Issues</Text>
                <Text style={styles.emptyTabText}>No issues have been reported for this inspection.</Text>
              </View>
            ) : (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Issues ({issues.length})</Text>
                {issues.map((issue) => {
                  const sevColor = SEVERITY_COLORS[issue.severity] ?? '#9CA3AF';
                  return (
                    <View key={issue.id} style={styles.issueRow}>
                      <View style={styles.issueHeader}>
                        <View style={[styles.severityBadge, { backgroundColor: sevColor + '15' }]}>
                          <Text style={[styles.severityText, { color: sevColor }]}>
                            {issue.severity}
                          </Text>
                        </View>
                        <Text style={styles.issueDate}>
                          {formatDate(issue.created_at)}
                        </Text>
                      </View>
                      <Text style={styles.issueDescription}>{issue.description}</Text>
                    </View>
                  );
                })}
              </View>
            )}
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.surface },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 16, color: Colors.light.error },

  // Banners
  offlineBanner: { backgroundColor: Colors.light.warning, paddingVertical: 6, alignItems: 'center' },
  offlineBannerText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  // Status bar
  statusBar: { padding: 16, flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, gap: 6,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 14, fontWeight: '600', textTransform: 'capitalize' },
  pendingBadge: {
    backgroundColor: Colors.light.warning + '30',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  pendingBadgeText: { fontSize: 11, fontWeight: '600', color: Colors.light.warning },

  // Actions
  actions: { paddingHorizontal: 16, paddingBottom: 12, flexDirection: 'row', gap: 12 },
  actionButton: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  startButton: { backgroundColor: Colors.light.primary },
  completeButton: { backgroundColor: Colors.light.success },
  submitButton: { backgroundColor: Colors.light.primaryDark },
  actionButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  // Tab bar
  tabBar: {
    flexDirection: 'row', paddingHorizontal: 16, marginBottom: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.light.border,
  },
  tab: { paddingVertical: 10, paddingHorizontal: 12, marginRight: 4 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: Colors.light.primary },
  tabText: { fontSize: 13, fontWeight: '500', color: Colors.light.textSecondary },
  tabTextActive: { color: Colors.light.primary, fontWeight: '600' },

  // Cards
  card: {
    backgroundColor: Colors.light.background,
    marginHorizontal: 16, marginBottom: 12,
    borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: Colors.light.border,
  },
  cardTitle: {
    fontSize: 13, fontWeight: '600', color: Colors.light.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12,
  },

  // Overview - Template
  templateNameLarge: { fontSize: 18, fontWeight: '600', color: Colors.light.text, marginBottom: 8 },

  // Overview - Site
  siteNameLarge: { fontSize: 18, fontWeight: '600', color: Colors.light.text },
  siteCode: { fontSize: 13, color: Colors.light.textSecondary, fontFamily: 'monospace', marginTop: 2 },
  address: { fontSize: 14, color: Colors.light.textSecondary, marginTop: 4 },
  linkText: { color: Colors.light.info },
  linkHint: { fontSize: 11, color: Colors.light.info, marginTop: 2 },

  // Overview - Row
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  label: { fontSize: 14, color: Colors.light.textSecondary },
  value: { fontSize: 14, fontWeight: '500', color: Colors.light.text },

  // Overview - Score
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  scoreLarge: { fontSize: 32, fontWeight: '700', color: Colors.light.text },
  passFailBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
  passFailText: { fontSize: 14, fontWeight: '700' },
  scoreProgressBar: { height: 8, borderRadius: 4, backgroundColor: Colors.light.border, marginBottom: 8 },
  scoreProgressFill: { height: 8, borderRadius: 4 },
  scoreDetail: { fontSize: 13, color: Colors.light.textSecondary },
  noScore: { fontSize: 14, color: Colors.light.textSecondary },

  // Overview - Notes
  notes: { fontSize: 14, color: Colors.light.text, lineHeight: 20 },

  // Items - Progress
  checklistHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  checklistCount: { fontSize: 14, fontWeight: '600', color: Colors.light.primary },
  progressBar: { height: 6, borderRadius: 3, backgroundColor: Colors.light.border, marginBottom: 4 },
  progressFill: { height: 6, borderRadius: 3 },

  // Items - Section
  sectionTitle: {
    fontSize: 15, fontWeight: '700', color: Colors.light.text,
    marginBottom: 12, paddingBottom: 8,
    borderBottomWidth: 1, borderBottomColor: Colors.light.border,
  },

  // Items - Item row
  itemRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  itemLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  itemLabel: { fontSize: 15, fontWeight: '500', color: Colors.light.text, flex: 1, marginRight: 8 },
  photoIndicator: { fontSize: 12, color: Colors.light.warning, fontWeight: '400' },
  itemPendingBadge: {
    backgroundColor: Colors.light.warning + '20',
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
  },
  itemPendingText: { fontSize: 10, fontWeight: '600', color: Colors.light.warning },

  // Items - Score selector
  scoreSelector: { flexDirection: 'row', gap: 6, marginBottom: 6 },
  scoreButton: {
    width: 36, height: 36, borderRadius: 8,
    borderWidth: 1.5, borderColor: Colors.light.border,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: Colors.light.surface,
  },
  scoreButtonSelected: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  scoreButtonText: { fontSize: 15, fontWeight: '600', color: Colors.light.textSecondary },
  scoreButtonTextSelected: { color: '#fff' },

  // Items - Photo
  photoRow: { marginBottom: 4 },
  photoStatus: { fontSize: 12, fontWeight: '500' },

  // Items - Notes
  notesToggle: { paddingVertical: 4 },
  notesToggleText: { fontSize: 12, color: Colors.light.info, fontWeight: '500' },
  notesContainer: {
    backgroundColor: Colors.light.surface,
    borderRadius: 8, padding: 10, marginTop: 6,
  },
  notesDisplay: { fontSize: 13, color: Colors.light.textSecondary, lineHeight: 18 },

  // Issues
  issueRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  issueHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  severityBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  severityText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  issueDate: { fontSize: 12, color: Colors.light.textSecondary },
  issueDescription: { fontSize: 14, color: Colors.light.text, lineHeight: 20 },

  // Empty tabs
  emptyTab: { alignItems: 'center', padding: 32 },
  emptyTabTitle: { fontSize: 16, fontWeight: '600', color: Colors.light.text, marginBottom: 6 },
  emptyTabText: { fontSize: 14, color: Colors.light.textSecondary, textAlign: 'center' },
});
