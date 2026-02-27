import { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors, localDateIso } from '../../src/lib/constants';
import { useRoute } from '../../src/hooks/use-route';
import { useShift } from '../../src/hooks/use-shift';

export default function StartShiftScreen() {
  const router = useRouter();
  const { routeId } = useLocalSearchParams<{ routeId?: string }>();
  const { route, loading } = useRoute(localDateIso());

  const activeRouteId = (routeId ?? route?.id ?? null);
  const { startShift } = useShift(activeRouteId);

  const [vehicleId, setVehicleId] = useState('');
  const [keyBoxNumber, setKeyBoxNumber] = useState('');
  const [mileageStart, setMileageStart] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!route) return;
    if (!vehicleId) {
      setVehicleId(route.template?.default_vehicle_id ?? '');
    }
    if (!keyBoxNumber) {
      setKeyBoxNumber(route.key_box_number ?? route.template?.default_key_box ?? '');
    }
  }, [keyBoxNumber, route, vehicleId]);

  const canSubmit = useMemo(() => {
    const miles = Number.parseInt(mileageStart, 10);
    return !!activeRouteId && !!vehicleId && Number.isFinite(miles) && miles >= 0;
  }, [activeRouteId, mileageStart, vehicleId]);

  const onSubmit = async () => {
    if (!canSubmit || !activeRouteId) return;

    try {
      setSaving(true);
      await startShift({
        mileageStart: Number.parseInt(mileageStart, 10),
        vehicleId,
        keyBoxNumber: keyBoxNumber.trim() ? keyBoxNumber.trim() : null,
      });
      router.replace(`/route/load-sheet?routeId=${activeRouteId}`);
    } catch (error) {
      Alert.alert('Unable to start shift', error instanceof Error ? error.message : 'Please try again.');
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

  if (!activeRouteId) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>No route available</Text>
        <Text style={styles.emptyText}>Return to Route tab and refresh after assignment.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.title}>Start Shift</Text>
        <Text style={styles.subtitle}>Confirm your vehicle, key box, and mileage before departure.</Text>

        <Text style={styles.label}>Vehicle ID</Text>
        <TextInput
          style={styles.input}
          value={vehicleId}
          onChangeText={setVehicleId}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={styles.label}>Key Box Number</Text>
        <TextInput
          style={styles.input}
          value={keyBoxNumber}
          onChangeText={setKeyBoxNumber}
          placeholder="Optional"
          placeholderTextColor={Colors.light.textSecondary}
        />

        <Text style={styles.label}>Mileage Start</Text>
        <TextInput
          style={styles.input}
          value={mileageStart}
          onChangeText={setMileageStart}
          keyboardType="number-pad"
          placeholder="Enter odometer"
          placeholderTextColor={Colors.light.textSecondary}
        />

        <TouchableOpacity
          style={[styles.primaryButton, (!canSubmit || saving) && styles.primaryButtonDisabled]}
          onPress={onSubmit}
          disabled={!canSubmit || saving}
        >
          <Text style={styles.primaryButtonText}>{saving ? 'Starting…' : 'Start Shift'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.surface },
  content: { padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.light.text },
  emptyText: { marginTop: 8, fontSize: 14, color: Colors.light.textSecondary, textAlign: 'center' },
  card: {
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    padding: 16,
  },
  title: { fontSize: 22, fontWeight: '700', color: Colors.light.text },
  subtitle: { marginTop: 6, fontSize: 14, color: Colors.light.textSecondary, lineHeight: 20 },
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
  primaryButton: {
    marginTop: 20,
    borderRadius: 10,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
    paddingVertical: 12,
  },
  primaryButtonDisabled: {
    opacity: 0.45,
  },
  primaryButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
