import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useShiftTrades } from '../../src/hooks/use-shift-trades';
import { supabase } from '../../src/lib/supabase';
import { Colors } from '../../src/lib/constants';

type RequestType = 'SWAP' | 'RELEASE' | 'OPEN_PICKUP';

const REQUEST_TYPES: { key: RequestType; label: string; description: string }[] = [
  { key: 'SWAP', label: 'Swap', description: 'Trade this shift with another team member' },
  { key: 'RELEASE', label: 'Release', description: 'Release this shift for anyone to pick up' },
  { key: 'OPEN_PICKUP', label: 'Open Pickup', description: 'Mark this shift as available for pickup' },
];

export default function TradeScreen() {
  const { ticketId } = useLocalSearchParams<{ ticketId: string }>();
  const router = useRouter();
  const { rows: existingTrades, loading: tradesLoading } = useShiftTrades();
  const [requestType, setRequestType] = useState<RequestType>('SWAP');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!ticketId) return;
    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'Not authenticated');
        setSubmitting(false);
        return;
      }

      const { data: staffRow } = await supabase
        .from('staff')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!staffRow) {
        Alert.alert('Error', 'Staff record not found');
        setSubmitting(false);
        return;
      }

      const { error } = await supabase
        .from('shift_trade_requests')
        .insert({
          ticket_id: ticketId,
          requester_staff_id: staffRow.id,
          request_type: requestType,
          reason: reason.trim() || null,
          status: 'PENDING',
        });

      if (error) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Success', 'Trade request submitted', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backLink}>Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Request Shift Trade</Text>

      <Text style={styles.label}>Trade Type</Text>
      {REQUEST_TYPES.map((rt) => (
        <TouchableOpacity
          key={rt.key}
          style={[styles.typeCard, requestType === rt.key && styles.typeCardActive]}
          onPress={() => setRequestType(rt.key)}
        >
          <Text style={[styles.typeLabel, requestType === rt.key && styles.typeLabelActive]}>
            {rt.label}
          </Text>
          <Text style={styles.typeDesc}>{rt.description}</Text>
        </TouchableOpacity>
      ))}

      <Text style={styles.label}>Reason (optional)</Text>
      <TextInput
        style={styles.input}
        placeholder="Why are you requesting this trade?"
        placeholderTextColor={Colors.light.textSecondary}
        value={reason}
        onChangeText={setReason}
        multiline
        numberOfLines={3}
      />

      <TouchableOpacity
        style={[styles.submitButton, submitting && styles.submitDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        <Text style={styles.submitText}>
          {submitting ? 'Submitting...' : 'Submit Request'}
        </Text>
      </TouchableOpacity>

      {existingTrades.length > 0 && (
        <View style={styles.existingSection}>
          <Text style={styles.existingTitle}>Your Recent Requests</Text>
          {existingTrades.slice(0, 5).map((trade) => (
            <View key={trade.id} style={styles.tradeRow}>
              <Text style={styles.tradeType}>{trade.request_type}</Text>
              <View style={[
                styles.tradeStatus,
                trade.status === 'APPROVED' ? styles.tradeApproved
                  : trade.status === 'DENIED' ? styles.tradeDenied
                  : styles.tradePending,
              ]}>
                <Text style={styles.tradeStatusText}>{trade.status}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.surface, padding: 16 },
  backButton: { marginBottom: 16 },
  backLink: { fontSize: 14, color: Colors.light.primary, fontWeight: '600' },
  title: { fontSize: 22, fontWeight: '700', color: Colors.light.text, marginBottom: 24 },
  label: { fontSize: 12, fontWeight: '600', color: Colors.light.textSecondary, textTransform: 'uppercase', marginBottom: 8, marginTop: 16 },
  typeCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.background,
    marginBottom: 8,
  },
  typeCardActive: { borderColor: Colors.light.primary, backgroundColor: Colors.light.primary + '10' },
  typeLabel: { fontSize: 16, fontWeight: '700', color: Colors.light.text, marginBottom: 2 },
  typeLabelActive: { color: Colors.light.primary },
  typeDesc: { fontSize: 13, color: Colors.light.textSecondary },
  input: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: Colors.light.text,
    backgroundColor: Colors.light.background,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  submitDisabled: { opacity: 0.6 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  existingSection: { marginTop: 32, paddingTop: 16, borderTopWidth: 1, borderTopColor: Colors.light.border },
  existingTitle: { fontSize: 16, fontWeight: '700', color: Colors.light.text, marginBottom: 12 },
  tradeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  tradeType: { fontSize: 14, fontWeight: '600', color: Colors.light.text },
  tradeStatus: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  tradePending: { backgroundColor: Colors.light.warning + '20' },
  tradeApproved: { backgroundColor: Colors.light.success + '20' },
  tradeDenied: { backgroundColor: '#EF444420' },
  tradeStatusText: { fontSize: 11, fontWeight: '600', color: Colors.light.text, textTransform: 'uppercase' },
});
