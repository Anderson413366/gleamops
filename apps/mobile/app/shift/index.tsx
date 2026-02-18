import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { Colors } from '../../src/lib/constants';

interface ShiftDetail {
  id: string;
  ticket_code: string;
  status: string;
  scheduled_date: string;
  start_time: string | null;
  end_time: string | null;
  site: { name: string; site_code: string } | null;
  assignments: Array<{
    id: string;
    staff_id: string | null;
    role: string | null;
    staff: { full_name: string } | null;
  }>;
}

export default function ShiftDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [shift, setShift] = useState<ShiftDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase
        .from('work_tickets')
        .select('id, ticket_code, status, scheduled_date, start_time, end_time, site:sites(name, site_code), assignments:ticket_assignments(id, staff_id, role, staff:staff(full_name))')
        .eq('id', id)
        .single();
      setShift(data as unknown as ShiftDetail | null);
      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  if (!shift) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>Shift not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backLink}>Back</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={styles.code}>{shift.ticket_code}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{shift.status}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Site</Text>
        <Text style={styles.sectionValue}>{shift.site?.name ?? 'N/A'}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Schedule</Text>
        <Text style={styles.sectionValue}>{shift.scheduled_date}</Text>
        {shift.start_time && (
          <Text style={styles.sectionValue}>{shift.start_time} - {shift.end_time ?? '?'}</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Crew</Text>
        {shift.assignments.length === 0 && (
          <Text style={styles.sectionValue}>No assignments</Text>
        )}
        {shift.assignments.map((a) => (
          <View key={a.id} style={styles.crewRow}>
            <Text style={styles.crewName}>{a.staff?.full_name ?? 'Unassigned'}</Text>
            <Text style={styles.crewRole}>{a.role ?? ''}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={styles.tradeButton}
        onPress={() => router.push(`/trade?ticketId=${shift.id}`)}
      >
        <Text style={styles.tradeButtonText}>Request Trade</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.surface, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backButton: { marginBottom: 16 },
  backLink: { fontSize: 14, color: Colors.light.primary, fontWeight: '600' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  code: { fontSize: 24, fontWeight: '700', color: Colors.light.text },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: Colors.light.info + '20' },
  badgeText: { fontSize: 12, fontWeight: '600', color: Colors.light.text, textTransform: 'uppercase' },
  section: { marginBottom: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Colors.light.border },
  sectionTitle: { fontSize: 12, fontWeight: '600', color: Colors.light.textSecondary, textTransform: 'uppercase', marginBottom: 4 },
  sectionValue: { fontSize: 16, color: Colors.light.text },
  crewRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  crewName: { fontSize: 15, color: Colors.light.text },
  crewRole: { fontSize: 13, color: Colors.light.textSecondary },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: Colors.light.text, marginBottom: 12 },
  tradeButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  tradeButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
