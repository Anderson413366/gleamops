import { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import TaskItem from '../../../src/components/task-item';
import { Colors } from '../../../src/lib/constants';
import { supabase } from '../../../src/lib/supabase';
import { useRoute } from '../../../src/hooks/use-route';
import { useShift } from '../../../src/hooks/use-shift';

function todayIso() {
  return new Date().toISOString().split('T')[0];
}

function formatWindow(start: string | null, end: string | null): string | null {
  if (!start && !end) return null;
  if (start && end) return `${start.slice(0, 5)} - ${end.slice(0, 5)}`;
  if (start) return `After ${start.slice(0, 5)}`;
  return `Before ${end!.slice(0, 5)}`;
}

function parseAddress(address: Record<string, string> | null): string {
  if (!address) return '';
  const parts = [
    address.street,
    address.city,
    address.state,
    address.zip,
  ].filter(Boolean);
  return parts.join(', ');
}

export default function RouteStopDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { route, stops, loading } = useRoute(todayIso());
  const { arriveAtStop, completeTask, addTaskPhoto, completeStop, skipStop } = useShift(route?.id ?? null);
  const [savingTaskId, setSavingTaskId] = useState<string | null>(null);

  const stop = stops.find((row) => row.id === id) ?? null;
  const address = parseAddress(stop?.site_job?.site?.address ?? null);
  const windowText = formatWindow(stop?.access_window_start ?? null, stop?.access_window_end ?? null);

  const allTasksDone = useMemo(() => {
    if (!stop) return false;
    if (stop.tasks.length === 0) return true;
    return stop.tasks.every((task) => task.is_completed);
  }, [stop]);

  const complaintTasks = useMemo(() => {
    if (!stop) return [];
    return stop.tasks.filter((task) => !!task.source_complaint_id);
  }, [stop]);

  const primaryComplaintTask = complaintTasks[0] ?? null;

  const onOpenMaps = async () => {
    if (!address) return;
    const url = `https://maps.apple.com/?q=${encodeURIComponent(address)}`;
    await Linking.openURL(url);
  };

  const onSkip = () => {
    if (!stop) return;

    Alert.alert('Skip this stop', 'Choose a reason for skipping this stop.', [
      { text: 'Site Closed', onPress: () => void skipStop(stop.id, { skipReason: 'SITE_CLOSED', skipNotes: null }) },
      { text: 'Access Issue', onPress: () => void skipStop(stop.id, { skipReason: 'ACCESS_ISSUE', skipNotes: null }) },
      { text: 'Time Constraint', onPress: () => void skipStop(stop.id, { skipReason: 'TIME_CONSTRAINT', skipNotes: null }) },
      { text: 'Other', onPress: () => void skipStop(stop.id, { skipReason: 'OTHER', skipNotes: null }) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const onToggleTask = async (taskId: string) => {
    if (!stop) return;

    setSavingTaskId(taskId);
    try {
      const task = stop.tasks.find((row) => row.id === taskId);
      if (!task || task.is_completed) return;

      if (task.source_complaint_id) {
        await completeTask(task.id, { notes: 'Complaint resolved during route service.' });
        await supabase
          .from('complaint_records')
          .update({
            status: 'RESOLVED',
            resolution_description: task.description,
            resolved_at: new Date().toISOString(),
          })
          .eq('id', task.source_complaint_id)
          .is('archived_at', null);
        return;
      }

      await completeTask(task.id);
    } finally {
      setSavingTaskId(null);
    }
  };

  const onTaskPhoto = async (taskId: string) => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Camera access needed', 'Enable camera permission to attach photo evidence.');
      return;
    }

    const capture = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: false,
    });

    if (capture.canceled || !capture.assets[0]?.uri) return;
    await addTaskPhoto(taskId, capture.assets[0].uri);
  };

  const captureComplaintPhoto = async (
    taskId: string,
    complaintId: string,
    kind: 'before' | 'after',
  ) => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Camera access needed', 'Enable camera permission to capture complaint photos.');
      return;
    }

    const capture = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: false,
    });
    if (capture.canceled || !capture.assets[0]?.uri) return;

    const photoUri = capture.assets[0].uri;
    await addTaskPhoto(taskId, photoUri);

    const column = kind === 'before' ? 'photos_before' : 'photos_after';
    const { data: complaintRow } = await supabase
      .from('complaint_records')
      .select('photos_before, photos_after')
      .eq('id', complaintId)
      .is('archived_at', null)
      .maybeSingle();

    const existing = Array.isArray((complaintRow as Record<string, unknown> | null)?.[column])
      ? ((complaintRow as Record<string, unknown>)[column] as string[])
      : [];
    const nextPhotos = Array.from(new Set([...existing, photoUri]));

    await supabase
      .from('complaint_records')
      .update({
        [column]: nextPhotos,
        status: 'IN_PROGRESS',
      })
      .eq('id', complaintId)
      .is('archived_at', null);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  if (!route || !stop) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>Stop not found</Text>
        <Text style={styles.emptyText}>Return to Route tab and select a stop again.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.stopMeta}>Stop {stop.stop_order}</Text>
        <Text style={styles.siteName}>{stop.site_job?.site?.name ?? 'Unknown site'}</Text>

        {address ? (
          <TouchableOpacity onPress={onOpenMaps}>
            <Text style={styles.addressLink}>{address}</Text>
            <Text style={styles.addressHint}>Tap to open Maps</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.addressHint}>No address on file</Text>
        )}

        {windowText && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Access window: {windowText}</Text>
          </View>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Site notes</Text>

        <Text style={styles.noteLabel}>Entry instructions</Text>
        <Text style={styles.noteText}>{stop.site_job?.site?.entry_instructions ?? 'None'}</Text>

        <Text style={styles.noteLabel}>Access notes</Text>
        <Text style={styles.noteText}>{stop.site_job?.site?.access_notes ?? 'None'}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Task checklist</Text>

        {stop.tasks.length === 0 && (
          <Text style={styles.noteText}>No tasks were generated for this stop.</Text>
        )}

        {stop.tasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            disabled={savingTaskId === task.id}
            onToggle={() => void onToggleTask(task.id)}
            onCameraPress={() => void onTaskPhoto(task.id)}
          />
        ))}
      </View>

      {primaryComplaintTask?.source_complaint_id ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Complaint workflow</Text>
          <Text style={styles.noteText}>Customer complaint. Deep clean required.</Text>
          <View style={styles.complaintButtonRow}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => void captureComplaintPhoto(primaryComplaintTask.id, primaryComplaintTask.source_complaint_id as string, 'before')}
            >
              <Text style={styles.secondaryButtonText}>Take Before Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => void captureComplaintPhoto(primaryComplaintTask.id, primaryComplaintTask.source_complaint_id as string, 'after')}
            >
              <Text style={styles.secondaryButtonText}>Take After Photo</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {stop.stop_status === 'PENDING' && route.shift_started_at && (
        <TouchableOpacity style={styles.secondaryButton} onPress={() => void arriveAtStop(stop.id)}>
          <Text style={styles.secondaryButtonText}>Mark Arrived</Text>
        </TouchableOpacity>
      )}

      {route.shift_started_at && stop.stop_status !== 'SKIPPED' && (
        <TouchableOpacity
          style={[styles.primaryButton, !allTasksDone && styles.primaryButtonDisabled]}
          disabled={!allTasksDone}
          onPress={async () => {
            await completeStop(stop.id);
            router.replace('/(tabs)/route');
          }}
        >
          <Text style={styles.primaryButtonText}>Mark Stop Complete</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={styles.issueButton}
        onPress={() => Alert.alert('Report Issue', 'Report this issue from the Operations Complaints tab on web.')}
      >
        <Text style={styles.issueButtonText}>Report Issue</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
        <Text style={styles.skipButtonText}>Skip This Stop</Text>
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
  stopMeta: { fontSize: 12, color: Colors.light.textSecondary, fontWeight: '600', textTransform: 'uppercase' },
  siteName: { marginTop: 4, fontSize: 20, fontWeight: '700', color: Colors.light.text },
  addressLink: { marginTop: 10, fontSize: 14, color: Colors.light.primary, fontWeight: '600' },
  addressHint: { marginTop: 4, fontSize: 12, color: Colors.light.textSecondary },
  badge: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: `${Colors.light.warning}20`,
  },
  badgeText: { color: Colors.light.warning, fontSize: 12, fontWeight: '700' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.light.text, marginBottom: 10 },
  noteLabel: { fontSize: 12, color: Colors.light.textSecondary, fontWeight: '700', marginTop: 6 },
  noteText: { marginTop: 2, fontSize: 14, color: Colors.light.text, lineHeight: 20 },
  primaryButton: {
    marginTop: 6,
    borderRadius: 10,
    backgroundColor: Colors.light.primary,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonDisabled: { opacity: 0.45 },
  primaryButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  secondaryButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.background,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  secondaryButtonText: { color: Colors.light.text, fontWeight: '700', fontSize: 14 },
  issueButton: {
    marginTop: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.light.error,
    backgroundColor: `${Colors.light.error}10`,
    paddingVertical: 11,
    alignItems: 'center',
  },
  issueButtonText: { color: Colors.light.error, fontWeight: '700', fontSize: 14 },
  complaintButtonRow: {
    marginTop: 10,
    gap: 8,
  },
  skipButton: {
    marginTop: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.light.warning,
    backgroundColor: `${Colors.light.warning}12`,
    paddingVertical: 11,
    alignItems: 'center',
  },
  skipButtonText: { color: Colors.light.warning, fontWeight: '700', fontSize: 14 },
});
