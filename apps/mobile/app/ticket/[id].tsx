import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
  RefreshControl, Linking, Alert, AppState,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/contexts/auth-context';
import { Colors, STATUS_COLORS } from '../../src/lib/constants';
import {
  cacheTicketDetail, getCachedTicketDetail,
  cacheChecklistItems, getCachedChecklistItems,
} from '../../src/lib/offline-cache';
import { enqueue, flushQueue, getPendingItemIds } from '../../src/lib/mutation-queue';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface TicketFull {
  id: string;
  ticket_code: string;
  status: string;
  scheduled_date: string;
  start_time: string | null;
  end_time: string | null;
  notes: string | null;
  site_id: string | null;
  site?: {
    name: string;
    site_code: string;
    street_address: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
  } | null;
  job?: { job_code: string } | null;
  assignments?: { staff_id: string; staff?: { full_name: string; staff_code: string } | null }[];
}

interface ChecklistItem {
  id: string;
  label: string;
  section: string | null;
  is_checked: boolean;
  is_required: boolean;
  sort_order: number;
}

interface SiteSupply {
  id: string;
  name: string;
  category: string | null;
  sds_url: string | null;
  notes: string | null;
}

interface AssetRequirement {
  id: string;
  asset_type: 'KEY' | 'VEHICLE' | 'EQUIPMENT';
  description: string;
  is_required: boolean;
}

interface AssetCheckout {
  id: string;
  requirement_id: string;
  staff_id: string;
  checked_out_at: string;
  returned_at: string | null;
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
  const { user } = useAuth();

  // Core state
  const [ticket, setTicket] = useState<TicketFull | null>(null);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [checklistId, setChecklistId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  // Safety state
  const [supplies, setSupplies] = useState<SiteSupply[]>([]);

  // Assets state
  const [requirements, setRequirements] = useState<AssetRequirement[]>([]);
  const [checkouts, setCheckouts] = useState<AssetCheckout[]>([]);
  const [staffId, setStaffId] = useState<string | null>(null);

  // Offline sync state
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [syncCount, setSyncCount] = useState(0);
  const appState = useRef(AppState.currentState);

  // -----------------------------------------------------------------------
  // Resolve staff_id for current user (for asset checkouts)
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!user) return;
    supabase
      .from('staff')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => { if (data) setStaffId(data.id); });
  }, [user]);

  // -----------------------------------------------------------------------
  // Flush mutation queue when app comes to foreground
  // -----------------------------------------------------------------------
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (nextState) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        const synced = await flushQueue();
        if (synced > 0) {
          setSyncCount(synced);
          // Refresh data after sync
          fetchTicket();
        }
        const remaining = await getPendingItemIds();
        setPendingIds(remaining);
      }
      appState.current = nextState;
    });
    return () => sub.remove();
  }, []);

  // -----------------------------------------------------------------------
  // Main fetch
  // -----------------------------------------------------------------------
  const fetchTicket = useCallback(async () => {
    if (!id) return;

    try {
      // Ticket detail
      const { data, error } = await supabase
        .from('work_tickets')
        .select(`
          *,
          site:site_id(name, site_code, street_address, city, state, zip),
          job:job_id(job_code),
          assignments:ticket_assignments(staff_id, staff:staff_id(full_name, staff_code))
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      const typed = data as unknown as TicketFull;
      setTicket(typed);
      setIsOffline(false);
      await cacheTicketDetail(id, typed);

      // Checklist
      const { data: checklist } = await supabase
        .from('ticket_checklists')
        .select('id')
        .eq('ticket_id', id)
        .is('archived_at', null)
        .maybeSingle();

      if (checklist) {
        setChecklistId(checklist.id);
        const { data: items } = await supabase
          .from('ticket_checklist_items')
          .select('id, label, section, is_checked, is_required, sort_order')
          .eq('checklist_id', checklist.id)
          .is('archived_at', null)
          .order('sort_order');
        if (items) {
          const typedItems = items as ChecklistItem[];
          setChecklistItems(typedItems);
          await cacheChecklistItems(id, typedItems);
        }
      }

      // Safety: site supplies
      if (typed.site_id) {
        const { data: supplyData } = await supabase
          .from('site_supplies')
          .select('id, name, category, sds_url, notes')
          .eq('site_id', typed.site_id)
          .is('archived_at', null)
          .order('name');
        if (supplyData) setSupplies(supplyData as SiteSupply[]);
      }

      // Assets: requirements + checkouts
      if (typed.site_id) {
        const { data: reqData } = await supabase
          .from('site_asset_requirements')
          .select('id, asset_type, description, is_required')
          .eq('site_id', typed.site_id)
          .is('archived_at', null)
          .order('asset_type');
        if (reqData) setRequirements(reqData as AssetRequirement[]);

        const { data: coData } = await supabase
          .from('ticket_asset_checkouts')
          .select('id, requirement_id, staff_id, checked_out_at, returned_at')
          .eq('ticket_id', id);
        if (coData) setCheckouts(coData as AssetCheckout[]);
      }

      // Flush any pending mutations while we're online
      const synced = await flushQueue();
      if (synced > 0) setSyncCount(synced);
      const remaining = await getPendingItemIds();
      setPendingIds(remaining);
    } catch {
      // Offline fallback
      const cachedTicket = await getCachedTicketDetail<TicketFull>(id);
      if (cachedTicket) {
        setTicket(cachedTicket);
        setIsOffline(true);
      }
      const cachedItems = await getCachedChecklistItems<ChecklistItem>(id);
      if (cachedItems) setChecklistItems(cachedItems);

      const remaining = await getPendingItemIds();
      setPendingIds(remaining);
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    fetchTicket().finally(() => setLoading(false));
  }, [fetchTicket]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTicket();
    setRefreshing(false);
  }, [fetchTicket]);

  // -----------------------------------------------------------------------
  // Checklist toggle (offline-capable)
  // -----------------------------------------------------------------------
  const handleToggleItem = async (item: ChecklistItem) => {
    const newChecked = !item.is_checked;
    const checkedAt = newChecked ? new Date().toISOString() : null;

    // Optimistic update
    setChecklistItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, is_checked: newChecked } : i))
    );

    try {
      const { error } = await supabase
        .from('ticket_checklist_items')
        .update({ is_checked: newChecked, checked_at: checkedAt })
        .eq('id', item.id);

      if (error) throw error;

      // Update cache
      if (id) {
        const updated = checklistItems.map((i) =>
          i.id === item.id ? { ...i, is_checked: newChecked } : i
        );
        await cacheChecklistItems(id, updated);
      }
    } catch {
      // Offline — queue mutation
      await enqueue({
        type: 'checklist_toggle',
        itemId: item.id,
        isChecked: newChecked,
        checkedAt,
      });
      setPendingIds((prev) => new Set(prev).add(item.id));

      // Still update cache for next offline load
      if (id) {
        const updated = checklistItems.map((i) =>
          i.id === item.id ? { ...i, is_checked: newChecked } : i
        );
        await cacheChecklistItems(id, updated);
      }
    }
  };

  // -----------------------------------------------------------------------
  // Status change
  // -----------------------------------------------------------------------
  const handleStatusChange = async (newStatus: string) => {
    if (!ticket) return;
    if (isOffline) {
      Alert.alert('Offline', 'Status changes require an internet connection.');
      return;
    }
    await supabase.from('work_tickets').update({ status: newStatus }).eq('id', ticket.id);
    setTicket((prev) => prev ? { ...prev, status: newStatus } : null);
  };

  // -----------------------------------------------------------------------
  // Asset checkout
  // -----------------------------------------------------------------------
  const handleCheckout = async (requirementId: string) => {
    if (!ticket || !staffId) return;
    if (isOffline) {
      Alert.alert('Offline', 'Asset checkouts require an internet connection.');
      return;
    }

    const { data, error } = await supabase
      .from('ticket_asset_checkouts')
      .insert({
        tenant_id: (ticket as unknown as Record<string, unknown>).tenant_id as string,
        ticket_id: ticket.id,
        requirement_id: requirementId,
        staff_id: staffId,
      })
      .select()
      .single();

    if (!error && data) {
      setCheckouts((prev) => [...prev, data as AssetCheckout]);
    }
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
            <Text style={styles.offlineBannerText}>Offline — showing cached data</Text>
          </View>
        )}

        {/* Sync success banner */}
        {syncCount > 0 && !isOffline && (
          <View style={styles.syncBanner}>
            <Text style={styles.syncBannerText}>
              Synced {syncCount} pending change{syncCount > 1 ? 's' : ''}
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

        {/* Quick Actions */}
        <View style={styles.actions}>
          {ticket.status === 'SCHEDULED' && (
            <TouchableOpacity
              style={[
                styles.actionButton,
                canStartWork ? styles.startButton : styles.disabledButton,
              ]}
              onPress={() => canStartWork ? handleStatusChange('IN_PROGRESS') : Alert.alert(
                'Assets Required',
                'All required assets must be checked out before starting work. Go to the Assets tab to check out.',
              )}
              activeOpacity={canStartWork ? 0.7 : 1}
            >
              <Text style={[styles.actionButtonText, !canStartWork && styles.disabledButtonText]}>
                {canStartWork ? 'Start Work' : 'Check Out Assets First'}
              </Text>
            </TouchableOpacity>
          )}
          {ticket.status === 'IN_PROGRESS' && (
            <TouchableOpacity style={[styles.actionButton, styles.completeButton]} onPress={() => handleStatusChange('COMPLETED')}>
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
                {checklistItems.map((item) => {
                  const isPending = pendingIds.has(item.id);
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.checklistItem}
                      onPress={() => handleToggleItem(item)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.checkbox, item.is_checked && styles.checkboxChecked]}>
                        {item.is_checked && <Text style={styles.checkmark}>✓</Text>}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.checklistLabel, item.is_checked && styles.checklistLabelChecked]}>
                          {item.label}
                          {item.is_required && <Text style={{ color: Colors.light.error }}> *</Text>}
                        </Text>
                        {isPending && (
                          <Text style={styles.pendingText}>Pending sync</Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
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
                        <View style={styles.checkedOutBadge}>
                          <Text style={styles.checkedOutText}>✓ Checked Out</Text>
                        </View>
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
  syncBanner: { backgroundColor: Colors.light.success, paddingVertical: 6, alignItems: 'center' },
  syncBannerText: { color: '#fff', fontSize: 12, fontWeight: '600' },

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
  checklistItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.light.border },
  checkbox: {
    width: 24, height: 24, borderRadius: 6,
    borderWidth: 2, borderColor: Colors.light.border,
    justifyContent: 'center', alignItems: 'center',
  },
  checkboxChecked: { backgroundColor: Colors.light.success, borderColor: Colors.light.success },
  checkmark: { color: '#fff', fontSize: 14, fontWeight: '700' },
  checklistLabel: { flex: 1, fontSize: 15, color: Colors.light.text },
  checklistLabelChecked: { textDecorationLine: 'line-through', color: Colors.light.textSecondary },
  pendingText: { fontSize: 11, color: Colors.light.warning, marginTop: 2 },

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
  checkedOutBadge: {
    backgroundColor: Colors.light.success + '15',
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
  },
  checkedOutText: { fontSize: 12, fontWeight: '600', color: Colors.light.success },
  checkoutButton: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
  },
  checkoutButtonText: { fontSize: 13, fontWeight: '600', color: '#fff' },

  // Empty tabs
  emptyTab: { alignItems: 'center', padding: 32 },
  emptyTabTitle: { fontSize: 16, fontWeight: '600', color: Colors.light.text, marginBottom: 6 },
  emptyTabText: { fontSize: 14, color: Colors.light.textSecondary, textAlign: 'center' },
});
