import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
  RefreshControl, Linking, Alert,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { Colors, STATUS_COLORS } from '../../src/lib/constants';
import {
  useTicketDetail,
  type ChecklistItem as ChecklistItemType,
  type AssetRequirement,
  type AssetCheckout,
} from '../../src/hooks/use-ticket-detail';
import { enqueue, getPendingItemIds } from '../../src/lib/mutation-queue';
import { useSyncState, syncNow } from '../../src/hooks/use-sync';
import ChecklistItem from '../../src/components/ChecklistItem';
import SyncStatusBar from '../../src/components/SyncStatusBar';

function formatSyncAge(iso: string | null): string {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return 'just now';
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

type TabKey = 'overview' | 'checklist' | 'safety' | 'assets';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatTime(t: string | null): string {
  if (!t) return '';
  const parts = t.split(':');
  const h = parseInt(parts[0], 10);
  const m = parts[1];
  const ampm = h >= 12 ? 'pm' : 'am';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m}${ampm}`;
}

const ASSET_ICONS: Record<string, string> = { KEY: '🔑', VEHICLE: '🚐', EQUIPMENT: '🧹' };

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function TicketDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const detail = useTicketDetail(id);
  const {
    ticket, checklistItems, supplies, requirements, checkouts,
    staffId, tenantId, loading, isOffline, refetch,
    setChecklistItems, setTicketStatus,
    invalidateChecklist, invalidateCheckouts, invalidateTicket,
  } = detail;

  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [refreshing, setRefreshing] = useState(false);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const { pendingCount, failedCount, lastSyncAt, isSyncing } = useSyncState();

  // Load pending IDs on mount and when pendingCount changes (sync completed)
  useEffect(() => {
    getPendingItemIds().then(setPendingIds);
  }, [pendingCount]);

  // When back online, sync flushes via useSyncManager (in _layout).
  // After sync, invalidate checklist so server state is re-fetched.
  useEffect(() => {
    if (ticket && !isOffline && pendingCount === 0 && pendingIds.size === 0) {
      invalidateChecklist();
    }
  }, [pendingCount]); // eslint-disable-line react-hooks/exhaustive-deps

  const onRefresh = async () => {
    setRefreshing(true);
    const synced = await syncNow();
    if (synced > 0) invalidateChecklist();
    setPendingIds(await getPendingItemIds());
    await refetch();
    setRefreshing(false);
  };

  // -----------------------------------------------------------------------
  // Checklist toggle (queue-first — never loses a write)
  // -----------------------------------------------------------------------
  const handleToggleItem = async (item: ChecklistItemType) => {
    const newChecked = !item.is_checked;
    const checkedAt = newChecked ? new Date().toISOString() : null;

    // 1. Durably persist to AsyncStorage FIRST (survives crashes)
    await enqueue({
      type: 'checklist_toggle',
      itemId: item.id,
      isChecked: newChecked,
      checkedAt,
    });

    // 2. Optimistic update in react-query cache (instant UI feedback)
    setChecklistItems((items) =>
      items.map((i) => (i.id === item.id ? { ...i, is_checked: newChecked } : i))
    );
    setPendingIds((prev) => new Set(prev).add(item.id));

    // 3. Try immediate sync (non-blocking — if offline, queue waits)
    syncNow().then(() => getPendingItemIds().then(setPendingIds));
  };

  // -----------------------------------------------------------------------
  // Status change (with return-asset gating)
  // -----------------------------------------------------------------------
  const changeStatus = async (newStatus: string) => {
    if (!ticket) return;
    if (isOffline) {
      Alert.alert('Offline', 'Status changes require an internet connection.');
      return;
    }

    const { error } = await supabase.rpc('set_ticket_status', {
      p_ticket_id: ticket.id,
      p_status: newStatus,
    });

    if (error) {
      if (error.code === 'P0001') {
        Alert.alert('Assets Required', 'All required assets must be checked out before starting work.');
        return;
      }
      if (error.code === 'P0002') {
        Alert.alert('Keys Not Returned', 'All keys must be returned before completing this ticket.');
        return;
      }
      Alert.alert('Error', error.message);
      return;
    }

    setTicketStatus(newStatus);
    invalidateTicket();
  };

  const handleStartWork = () => {
    if (!canStartWork) {
      Alert.alert(
        'Assets Required',
        'All required assets must be checked out before starting work. Go to the Assets tab to check out.',
      );
      return;
    }
    changeStatus('IN_PROGRESS');
  };

  const handleComplete = () => {
    if (!ticket) return;

    // Check for unreturned KEY assets
    const unreturnedKeys = requirements
      .filter((r) => r.asset_type === 'KEY')
      .filter((r) => checkouts.some((c) => c.requirement_id === r.id && !c.returned_at));

    if (unreturnedKeys.length > 0) {
      Alert.alert(
        'Keys Not Returned',
        `${unreturnedKeys.length} key(s) have not been returned. Return them or confirm you're keeping them.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Return All Keys',
            onPress: async () => {
              for (const req of unreturnedKeys) {
                const checkout = checkouts.find(
                  (c) => c.requirement_id === req.id && !c.returned_at,
                );
                if (checkout) {
                  await supabase
                    .from('ticket_asset_checkouts')
                    .update({ returned_at: new Date().toISOString() })
                    .eq('id', checkout.id);
                }
              }
              invalidateCheckouts();
              changeStatus('COMPLETED');
            },
          },
          {
            text: 'Keep Keys',
            style: 'destructive',
            onPress: () => changeStatus('COMPLETED'),
          },
        ],
      );
      return;
    }

    changeStatus('COMPLETED');
  };

  // -----------------------------------------------------------------------
  // Asset checkout / return
  // -----------------------------------------------------------------------
  const handleCheckout = async (requirementId: string) => {
    if (!ticket || !staffId || !tenantId) return;
    if (isOffline) {
      Alert.alert('Offline', 'Asset checkouts require an internet connection.');
      return;
    }

    await supabase.from('ticket_asset_checkouts').insert({
      tenant_id: tenantId,
      ticket_id: ticket.id,
      requirement_id: requirementId,
      staff_id: staffId,
    });
    invalidateCheckouts();
  };

  const handleReturn = async (checkoutId: string) => {
    if (isOffline) {
      Alert.alert('Offline', 'Asset returns require an internet connection.');
      return;
    }

    await supabase
      .from('ticket_asset_checkouts')
      .update({ returned_at: new Date().toISOString() })
      .eq('id', checkoutId);
    invalidateCheckouts();
  };

  // -----------------------------------------------------------------------
  // Derived
  // -----------------------------------------------------------------------
  const allRequiredCheckedOut = requirements
    .filter((r) => r.is_required)
    .every((r) => checkouts.some((c) => c.requirement_id === r.id && !c.returned_at));
  const canStartWork = ticket?.status === 'SCHEDULED' && (requirements.length === 0 || allRequiredCheckedOut);

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

  if (!ticket) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Ticket not found</Text>
      </View>
    );
  }

  const site = ticket.site;
  const addressParts = [site?.street_address, site?.city, site?.state, site?.zip].filter(Boolean);
  const addressStr = addressParts.join(', ');
  const assignedStaff = ticket.assignments?.map((a) => a.staff?.full_name).filter(Boolean) ?? [];
  const checkedCount = checklistItems.filter((i) => i.is_checked).length;

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <>
      <Stack.Screen options={{ title: ticket.ticket_code }} />
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
          <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLORS[ticket.status] ?? '#9CA3AF') + '20' }]}>
            <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[ticket.status] ?? '#9CA3AF' }]} />
            <Text style={[styles.statusText, { color: STATUS_COLORS[ticket.status] ?? '#9CA3AF' }]}>
              {ticket.status.replace('_', ' ')}
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
          {ticket.status === 'SCHEDULED' && (
            <TouchableOpacity
              style={[styles.actionButton, canStartWork ? styles.startButton : styles.disabledButton]}
              onPress={handleStartWork}
              activeOpacity={canStartWork ? 0.7 : 1}
            >
              <Text style={[styles.actionButtonText, !canStartWork && styles.disabledButtonText]}>
                {canStartWork ? 'Start Work' : 'Check Out Assets First'}
              </Text>
            </TouchableOpacity>
          )}
          {ticket.status === 'IN_PROGRESS' && (
            <TouchableOpacity style={[styles.actionButton, styles.completeButton]} onPress={handleComplete}>
              <Text style={styles.actionButtonText}>Mark Complete</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Tab Bar */}
        <View style={styles.tabBar}>
          {(['overview', 'checklist', 'safety', 'assets'] as TabKey[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'overview' ? 'Overview' :
                 tab === 'checklist' ? `Checklist${checklistItems.length > 0 ? ` (${checkedCount}/${checklistItems.length})` : ''}` :
                 tab === 'safety' ? 'Safety' : 'Assets'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ---- OVERVIEW TAB ---- */}
        {activeTab === 'overview' && (
          <>
            {/* Site Info */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Site</Text>
              <Text style={styles.siteNameLarge}>{site?.name ?? '—'}</Text>
              {addressStr.length > 0 && (
                <TouchableOpacity
                  onPress={() => Linking.openURL(`https://maps.apple.com/?q=${encodeURIComponent(addressStr)}`)}
                >
                  <Text style={[styles.address, styles.linkText]}>{addressStr}</Text>
                  <Text style={styles.linkHint}>Tap for directions</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Schedule */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Schedule</Text>
              <View style={styles.row}>
                <Text style={styles.label}>Date</Text>
                <Text style={styles.value}>
                  {new Date(ticket.scheduled_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </Text>
              </View>
              {ticket.start_time && (
                <View style={styles.row}>
                  <Text style={styles.label}>Time</Text>
                  <Text style={styles.value}>
                    {formatTime(ticket.start_time)}{ticket.end_time ? ` - ${formatTime(ticket.end_time)}` : ''}
                  </Text>
                </View>
              )}
              {ticket.job && (
                <View style={styles.row}>
                  <Text style={styles.label}>Job</Text>
                  <Text style={[styles.value, { fontFamily: 'monospace' }]}>{ticket.job.job_code}</Text>
                </View>
              )}
            </View>

            {/* Assigned Staff */}
            {assignedStaff.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Assigned Staff ({assignedStaff.length})</Text>
                {assignedStaff.map((name, i) => (
                  <View key={i} style={styles.staffRow}>
                    <View style={styles.staffAvatar}>
                      <Text style={styles.staffAvatarText}>
                        {name?.split(' ').map((n) => n[0]).join('')}
                      </Text>
                    </View>
                    <Text style={styles.staffName}>{name}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Notes */}
            {ticket.notes && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Notes</Text>
                <Text style={styles.notes}>{ticket.notes}</Text>
              </View>
            )}
          </>
        )}

        {/* ---- CHECKLIST TAB ---- */}
        {activeTab === 'checklist' && (
          <>
            {checklistItems.length === 0 ? (
              <View style={styles.emptyTab}>
                <Text style={styles.emptyTabTitle}>No Checklist</Text>
                <Text style={styles.emptyTabText}>This ticket has no checklist items.</Text>
              </View>
            ) : (
              <View style={styles.card}>
                <View style={styles.checklistHeader}>
                  <Text style={styles.cardTitle}>Checklist</Text>
                  <Text style={styles.checklistCount}>{checkedCount}/{checklistItems.length}</Text>
                </View>
                {/* Progress bar */}
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${checklistItems.length > 0 ? (checkedCount / checklistItems.length) * 100 : 0}%`,
                        backgroundColor: checkedCount === checklistItems.length ? Colors.light.success : Colors.light.info,
                      },
                    ]}
                  />
                </View>
                {checklistItems.map((item) => (
                  <ChecklistItem
                    key={item.id}
                    label={item.label}
                    isCompleted={item.is_checked}
                    isRequired={item.is_required}
                    syncStatus={pendingIds.has(item.id) ? 'pending' : 'synced'}
                    onToggle={() => handleToggleItem(item)}
                  />
                ))}
              </View>
            )}
          </>
        )}

        {/* ---- SAFETY TAB ---- */}
        {activeTab === 'safety' && (
          <>
            {supplies.length === 0 ? (
              <View style={styles.emptyTab}>
                <Text style={styles.emptyTabTitle}>No Supplies Listed</Text>
                <Text style={styles.emptyTabText}>No supplies or safety data sheets are assigned to this site.</Text>
              </View>
            ) : (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Site Supplies & SDS</Text>
                {supplies.map((supply) => (
                  <View key={supply.id} style={styles.supplyRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.supplyName}>{supply.name}</Text>
                      {supply.category && (
                        <Text style={styles.supplyCategory}>{supply.category}</Text>
                      )}
                      {supply.notes && (
                        <Text style={styles.supplyNotes}>{supply.notes}</Text>
                      )}
                    </View>
                    {supply.sds_url ? (
                      <TouchableOpacity
                        style={styles.sdsButton}
                        onPress={() => Linking.openURL(supply.sds_url!)}
                      >
                        <Text style={styles.sdsButtonText}>View SDS</Text>
                      </TouchableOpacity>
                    ) : (
                      <Text style={styles.noSds}>No SDS</Text>
                    )}
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {/* ---- ASSETS TAB ---- */}
        {activeTab === 'assets' && (
          <>
            {requirements.length === 0 ? (
              <View style={styles.emptyTab}>
                <Text style={styles.emptyTabTitle}>No Asset Requirements</Text>
                <Text style={styles.emptyTabText}>This site has no key, vehicle, or equipment requirements.</Text>
              </View>
            ) : (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Required Assets</Text>
                {!allRequiredCheckedOut && ticket.status === 'SCHEDULED' && (
                  <View style={styles.assetWarning}>
                    <Text style={styles.assetWarningText}>
                      Check out all required assets before starting work
                    </Text>
                  </View>
                )}
                {requirements.map((req) => {
                  const checkout = checkouts.find((c) => c.requirement_id === req.id && !c.returned_at);
                  const isCheckedOut = !!checkout;
                  return (
                    <View key={req.id} style={styles.assetRow}>
                      <Text style={styles.assetIcon}>{ASSET_ICONS[req.asset_type] ?? '📦'}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.assetDesc}>
                          {req.description}
                          {req.is_required && <Text style={{ color: Colors.light.error }}> *</Text>}
                        </Text>
                        <Text style={styles.assetType}>{req.asset_type}</Text>
                      </View>
                      {isCheckedOut ? (
                        <TouchableOpacity
                          style={styles.returnButton}
                          onPress={() => handleReturn(checkout!.id)}
                        >
                          <Text style={styles.returnButtonText}>Return</Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          style={styles.checkoutButton}
                          onPress={() => handleCheckout(req.id)}
                        >
                          <Text style={styles.checkoutButtonText}>Check Out</Text>
                        </TouchableOpacity>
                      )}
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
  disabledButton: { backgroundColor: Colors.light.border },
  actionButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  disabledButtonText: { color: Colors.light.textSecondary },

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
  cardTitle: { fontSize: 13, fontWeight: '600', color: Colors.light.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },

  // Overview
  siteNameLarge: { fontSize: 18, fontWeight: '600', color: Colors.light.text },
  address: { fontSize: 14, color: Colors.light.textSecondary, marginTop: 4 },
  linkText: { color: Colors.light.info },
  linkHint: { fontSize: 11, color: Colors.light.info, marginTop: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  label: { fontSize: 14, color: Colors.light.textSecondary },
  value: { fontSize: 14, fontWeight: '500', color: Colors.light.text },
  staffRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  staffAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.light.primary + '20',
    justifyContent: 'center', alignItems: 'center',
  },
  staffAvatarText: { fontSize: 12, fontWeight: '700', color: Colors.light.primary },
  staffName: { fontSize: 15, color: Colors.light.text, fontWeight: '500' },
  notes: { fontSize: 14, color: Colors.light.text, lineHeight: 20 },

  // Checklist
  checklistHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  checklistCount: { fontSize: 14, fontWeight: '600', color: Colors.light.primary },
  progressBar: { height: 6, borderRadius: 3, backgroundColor: Colors.light.border, marginBottom: 12 },
  progressFill: { height: 6, borderRadius: 3 },

  // Safety
  supplyRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.light.border,
  },
  supplyName: { fontSize: 15, fontWeight: '500', color: Colors.light.text },
  supplyCategory: { fontSize: 12, color: Colors.light.textSecondary, marginTop: 2 },
  supplyNotes: { fontSize: 12, color: Colors.light.textSecondary, marginTop: 2, fontStyle: 'italic' },
  sdsButton: {
    backgroundColor: Colors.light.error + '15',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
  },
  sdsButtonText: { fontSize: 12, fontWeight: '600', color: Colors.light.error },
  noSds: { fontSize: 11, color: Colors.light.textSecondary },

  // Assets
  assetWarning: {
    backgroundColor: Colors.light.warning + '15',
    borderRadius: 8, padding: 12, marginBottom: 12,
  },
  assetWarningText: { fontSize: 13, color: Colors.light.warning, fontWeight: '500' },
  assetRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.light.border,
  },
  assetIcon: { fontSize: 24 },
  assetDesc: { fontSize: 15, fontWeight: '500', color: Colors.light.text },
  assetType: { fontSize: 11, color: Colors.light.textSecondary, marginTop: 2, textTransform: 'uppercase' },
  checkoutButton: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
  },
  checkoutButtonText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  returnButton: {
    backgroundColor: Colors.light.warning + '20',
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
  },
  returnButtonText: { fontSize: 13, fontWeight: '600', color: Colors.light.warning },

  // Empty tabs
  emptyTab: { alignItems: 'center', padding: 32 },
  emptyTabTitle: { fontSize: 16, fontWeight: '600', color: Colors.light.text, marginBottom: 6 },
  emptyTabText: { fontSize: 14, color: Colors.light.textSecondary, textAlign: 'center' },
});
