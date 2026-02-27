import { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, ScrollView, Switch, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors, localDateIso } from '../../src/lib/constants';
import { useRoute } from '../../src/hooks/use-route';
import { useShift } from '../../src/hooks/use-shift';

export default function EndShiftScreen() {
  const router = useRouter();
  const { routeId } = useLocalSearchParams<{ routeId?: string }>();
  const { route, stops, tasks, loading } = useRoute(localDateIso());
  const activeRouteId = routeId ?? route?.id ?? null;
  const { endShift } = useShift(activeRouteId);

  const [mileageEnd, setMileageEnd] = useState('');
  const [vehicleCleaned, setVehicleCleaned] = useState(true);
  const [personalItemsRemoved, setPersonalItemsRemoved] = useState(true);
  const [floaterNotes, setFloaterNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const summary = useMemo(() => {
    const completedStops = stops.filter((stop) => stop.stop_status === 'COMPLETED').length;
    const skippedStops = stops.filter((stop) => stop.stop_status === 'SKIPPED').length;
    const photosUploaded = tasks.reduce((sum, task) => sum + (Array.isArray(task.evidence_photos) ? task.evidence_photos.length : 0), 0);
    const start = route?.mileage_start ?? null;
    const end = Number.parseInt(mileageEnd, 10);
    const mileageDriven = Number.isFinite(end) && start != null ? Math.max(0, end - start) : null;

    return {
      completedStops,
      skippedStops,
      totalStops: stops.length,
      photosUploaded,
      mileageDriven,
    };
  }, [mileageEnd, route?.mileage_start, stops, tasks]);

  const canSubmit = useMemo(() => {
    const miles = Number.parseInt(mileageEnd, 10);
    if (!activeRouteId || !Number.isFinite(miles) || miles < 0) return false;
    if (route?.mileage_start != null && miles < route.mileage_start) return false;
    return true;
  }, [activeRouteId, mileageEnd, route?.mileage_start]);

  const onSubmit = async () => {
    if (!canSubmit || !activeRouteId) return;

    try {
      setSaving(true);
      await endShift({
        mileageEnd: Number.parseInt(mileageEnd, 10),
        vehicleCleaned,
        personalItemsRemoved,
        floaterNotes: floaterNotes.trim() ? floaterNotes.trim() : null,
      });
      Alert.alert('Great work tonight!', 'Shift successfully closed.');
      router.replace('/(tabs)/route');
    } catch (error) {
      Alert.alert('Unable to end shift', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  if (!activeRouteId || !route) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>No shift found</Text>
        <Text style={styles.emptyText}>Return to Route tab and refresh.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.title}>End Shift</Text>
        <Text style={styles.subtitle}>Complete your final checklist before heading home.</Text>

        <Text style={styles.label}>Mileage End</Text>
        <TextInput
          style={styles.input}
          value={mileageEnd}
          onChangeText={setMileageEnd}
          keyboardType="number-pad"
          placeholder="Enter odometer"
          placeholderTextColor={Colors.light.textSecondary}
        />

        <View style={styles.switchRow}>
          <View style={styles.switchTextWrap}>
            <Text style={styles.switchLabel}>Vehicle clean inside?</Text>
            <Text style={styles.switchHint}>Confirm the vehicle is cleaned out before parking.</Text>
          </View>
          <Switch
            value={vehicleCleaned}
            onValueChange={setVehicleCleaned}
            trackColor={{ false: '#D1D5DB', true: `${Colors.light.primary}40` }}
            thumbColor={vehicleCleaned ? Colors.light.primary : '#9CA3AF'}
          />
        </View>

        <View style={styles.switchRow}>
          <View style={styles.switchTextWrap}>
            <Text style={styles.switchLabel}>Personal items removed?</Text>
            <Text style={styles.switchHint}>Verify no personal or customer items remain in the vehicle.</Text>
          </View>
          <Switch
            value={personalItemsRemoved}
            onValueChange={setPersonalItemsRemoved}
            trackColor={{ false: '#D1D5DB', true: `${Colors.light.primary}40` }}
            thumbColor={personalItemsRemoved ? Colors.light.primary : '#9CA3AF'}
          />
        </View>

        <Text style={styles.label}>Notes</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={floaterNotes}
          onChangeText={setFloaterNotes}
          multiline
          numberOfLines={4}
          placeholder="Anything the supervisor should know?"
          placeholderTextColor={Colors.light.textSecondary}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.summaryTitle}>Shift Summary Preview</Text>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Stops completed</Text>
          <Text style={styles.summaryValue}>{summary.completedStops}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Stops skipped</Text>
          <Text style={styles.summaryValue}>{summary.skippedStops}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total stops</Text>
          <Text style={styles.summaryValue}>{summary.totalStops}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Photos uploaded</Text>
          <Text style={styles.summaryValue}>{summary.photosUploaded}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Mileage driven</Text>
          <Text style={styles.summaryValue}>{summary.mileageDriven ?? '—'}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, (!canSubmit || saving) && styles.primaryButtonDisabled]}
        disabled={!canSubmit || saving}
        onPress={onSubmit}
      >
        <Text style={styles.primaryButtonText}>{saving ? 'Ending…' : 'End Shift'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.surface },
  content: { padding: 16, paddingBottom: 24 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.light.text },
  emptyText: { marginTop: 8, fontSize: 14, color: Colors.light.textSecondary, textAlign: 'center' },
  card: {
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  title: { fontSize: 22, fontWeight: '700', color: Colors.light.text },
  subtitle: { marginTop: 5, fontSize: 14, color: Colors.light.textSecondary, lineHeight: 20 },
  label: { marginTop: 14, marginBottom: 6, fontSize: 13, color: Colors.light.textSecondary, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 10,
    backgroundColor: Colors.light.surface,
    color: Colors.light.text,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
  },
  textarea: {
    minHeight: 94,
    textAlignVertical: 'top',
  },
  switchRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  switchTextWrap: { flex: 1 },
  switchLabel: { fontSize: 14, fontWeight: '700', color: Colors.light.text },
  switchHint: { marginTop: 3, fontSize: 12, color: Colors.light.textSecondary, lineHeight: 18 },
  summaryTitle: { fontSize: 16, fontWeight: '700', color: Colors.light.text, marginBottom: 8 },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  summaryLabel: { color: Colors.light.textSecondary, fontSize: 13 },
  summaryValue: { color: Colors.light.text, fontWeight: '700', fontSize: 14 },
  primaryButton: {
    borderRadius: 10,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
    paddingVertical: 13,
  },
  primaryButtonDisabled: { opacity: 0.45 },
  primaryButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
