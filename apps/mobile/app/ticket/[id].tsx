import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { Colors, STATUS_COLORS } from '../../src/lib/constants';

interface TicketFull {
  id: string;
  ticket_code: string;
  status: string;
  scheduled_date: string;
  start_time: string | null;
  end_time: string | null;
  notes: string | null;
  site?: {
    name: string;
    site_code: string;
    street_address: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
  } | null;
  job?: { job_code: string } | null;
  assignments?: { staff?: { full_name: string; staff_code: string } | null }[];
}

interface ChecklistItem {
  id: string;
  label: string;
  section: string | null;
  is_checked: boolean;
  is_required: boolean;
  sort_order: number;
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

export default function TicketDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [ticket, setTicket] = useState<TicketFull | null>(null);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [checklistId, setChecklistId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTicket = useCallback(async () => {
    if (!id) return;

    const { data } = await supabase
      .from('work_tickets')
      .select(`
        *,
        site:site_id(name, site_code, street_address, city, state, zip),
        job:job_id(job_code),
        assignments:ticket_assignments(staff:staff_id(full_name, staff_code))
      `)
      .eq('id', id)
      .single();

    if (data) setTicket(data as unknown as TicketFull);

    // Fetch checklist
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
      if (items) setChecklistItems(items as ChecklistItem[]);
    }

    setLoading(false);
  }, [id]);

  useEffect(() => { fetchTicket(); }, [fetchTicket]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTicket();
    setRefreshing(false);
  }, [fetchTicket]);

  const handleToggleItem = async (item: ChecklistItem) => {
    const newChecked = !item.is_checked;
    setChecklistItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, is_checked: newChecked } : i))
    );

    await supabase
      .from('ticket_checklist_items')
      .update({ is_checked: newChecked, checked_at: newChecked ? new Date().toISOString() : null })
      .eq('id', item.id);
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!ticket) return;
    await supabase.from('work_tickets').update({ status: newStatus }).eq('id', ticket.id);
    setTicket((prev) => prev ? { ...prev, status: newStatus } : null);
  };

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
  const assignedStaff = ticket.assignments?.map((a) => a.staff?.full_name).filter(Boolean) ?? [];
  const checkedCount = checklistItems.filter((i) => i.is_checked).length;

  return (
    <>
      <Stack.Screen options={{ title: ticket.ticket_code }} />
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Status Bar */}
        <View style={styles.statusBar}>
          <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLORS[ticket.status] ?? '#9CA3AF') + '20' }]}>
            <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[ticket.status] ?? '#9CA3AF' }]} />
            <Text style={[styles.statusText, { color: STATUS_COLORS[ticket.status] ?? '#9CA3AF' }]}>
              {ticket.status.replace('_', ' ')}
            </Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actions}>
          {ticket.status === 'SCHEDULED' && (
            <TouchableOpacity style={[styles.actionButton, styles.startButton]} onPress={() => handleStatusChange('IN_PROGRESS')}>
              <Text style={styles.actionButtonText}>Start Work</Text>
            </TouchableOpacity>
          )}
          {ticket.status === 'IN_PROGRESS' && (
            <TouchableOpacity style={[styles.actionButton, styles.completeButton]} onPress={() => handleStatusChange('COMPLETED')}>
              <Text style={styles.actionButtonText}>Mark Complete</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Site Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Site</Text>
          <Text style={styles.siteName}>{site?.name ?? '—'}</Text>
          {addressParts.length > 0 && (
            <Text style={styles.address}>{addressParts.join(', ')}</Text>
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

        {/* Checklist */}
        {checklistItems.length > 0 && (
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
              <TouchableOpacity
                key={item.id}
                style={styles.checklistItem}
                onPress={() => handleToggleItem(item)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, item.is_checked && styles.checkboxChecked]}>
                  {item.is_checked && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={[styles.checklistLabel, item.is_checked && styles.checklistLabelChecked]}>
                  {item.label}
                  {item.is_required && <Text style={{ color: Colors.light.error }}> *</Text>}
                </Text>
              </TouchableOpacity>
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

        <View style={{ height: 32 }} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.surface },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 16, color: Colors.light.error },
  statusBar: { padding: 16, alignItems: 'flex-start' },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 14, fontWeight: '600', textTransform: 'capitalize' },
  actions: { paddingHorizontal: 16, paddingBottom: 12, flexDirection: 'row', gap: 12 },
  actionButton: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  startButton: { backgroundColor: Colors.light.primary },
  completeButton: { backgroundColor: Colors.light.success },
  actionButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  card: {
    backgroundColor: Colors.light.background,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  cardTitle: { fontSize: 13, fontWeight: '600', color: Colors.light.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  siteName: { fontSize: 18, fontWeight: '600', color: Colors.light.text },
  address: { fontSize: 14, color: Colors.light.textSecondary, marginTop: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  label: { fontSize: 14, color: Colors.light.textSecondary },
  value: { fontSize: 14, fontWeight: '500', color: Colors.light.text },
  staffRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  staffAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.light.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  staffAvatarText: { fontSize: 12, fontWeight: '700', color: Colors.light.primary },
  staffName: { fontSize: 15, color: Colors.light.text, fontWeight: '500' },
  checklistHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  checklistCount: { fontSize: 14, fontWeight: '600', color: Colors.light.primary },
  progressBar: { height: 6, borderRadius: 3, backgroundColor: Colors.light.border, marginBottom: 12 },
  progressFill: { height: 6, borderRadius: 3 },
  checklistItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.light.border },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.light.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: { backgroundColor: Colors.light.success, borderColor: Colors.light.success },
  checkmark: { color: '#fff', fontSize: 14, fontWeight: '700' },
  checklistLabel: { flex: 1, fontSize: 15, color: Colors.light.text },
  checklistLabelChecked: { textDecorationLine: 'line-through', color: Colors.light.textSecondary },
  notes: { fontSize: 14, color: Colors.light.text, lineHeight: 20 },
});
