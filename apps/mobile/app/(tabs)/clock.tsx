import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, SafeAreaView,
} from 'react-native';
import { supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/contexts/auth-context';
import { Colors } from '../../src/lib/constants';

interface TimeEntry {
  id: string;
  clock_in: string;
  clock_out: string | null;
  status: string;
}

export default function ClockScreen() {
  const { user, tenantId } = useAuth();
  const [openEntry, setOpenEntry] = useState<TimeEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchOpenEntry = useCallback(async () => {
    if (!user) return;

    // Find staff record for this user
    const { data: staff } = await supabase
      .from('staff')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!staff) { setLoading(false); return; }

    // Find open time entry (clock_out is null)
    const { data: entry } = await supabase
      .from('time_entries')
      .select('*')
      .eq('staff_id', staff.id)
      .is('clock_out', null)
      .eq('status', 'OPEN')
      .maybeSingle();

    setOpenEntry(entry as TimeEntry | null);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchOpenEntry(); }, [fetchOpenEntry]);

  const handleClockIn = async () => {
    if (!user || !tenantId) return;
    setActing(true);

    // Get staff record
    const { data: staff } = await supabase
      .from('staff')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!staff) {
      Alert.alert('Error', 'Staff record not found. Contact your administrator.');
      setActing(false);
      return;
    }

    // Create time event
    const now = new Date().toISOString();
    await supabase.from('time_events').insert({
      tenant_id: tenantId,
      staff_id: staff.id,
      event_type: 'CLOCK_IN',
      recorded_at: now,
      source: 'MOBILE',
    });

    // Create open time entry
    await supabase.from('time_entries').insert({
      tenant_id: tenantId,
      staff_id: staff.id,
      clock_in: now,
      status: 'OPEN',
    });

    await fetchOpenEntry();
    setActing(false);
  };

  const handleClockOut = async () => {
    if (!openEntry || !user || !tenantId) return;
    setActing(true);

    const { data: staff } = await supabase
      .from('staff')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!staff) {
      setActing(false);
      return;
    }

    const now = new Date().toISOString();

    // Create clock out event
    await supabase.from('time_events').insert({
      tenant_id: tenantId,
      staff_id: staff.id,
      event_type: 'CLOCK_OUT',
      recorded_at: now,
      source: 'MOBILE',
    });

    // Close the time entry
    const clockInTime = new Date(openEntry.clock_in);
    const clockOutTime = new Date(now);
    const durationMinutes = Math.round((clockOutTime.getTime() - clockInTime.getTime()) / 60000);
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    const durationInterval = `${hours}:${String(minutes).padStart(2, '0')}:00`;

    await supabase
      .from('time_entries')
      .update({
        clock_out: now,
        duration: durationInterval,
        status: 'CLOSED',
      })
      .eq('id', openEntry.id);

    setOpenEntry(null);
    setActing(false);
  };

  const isClockedIn = !!openEntry;
  const elapsed = openEntry
    ? Math.floor((currentTime.getTime() - new Date(openEntry.clock_in).getTime()) / 1000)
    : 0;
  const elapsedHours = Math.floor(elapsed / 3600);
  const elapsedMinutes = Math.floor((elapsed % 3600) / 60);
  const elapsedSeconds = elapsed % 60;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Current Time */}
        <Text style={styles.currentTime}>
          {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
        </Text>
        <Text style={styles.currentDate}>
          {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </Text>

        {/* Timer */}
        {isClockedIn && (
          <View style={styles.timerContainer}>
            <Text style={styles.timerLabel}>Time on clock</Text>
            <Text style={styles.timer}>
              {String(elapsedHours).padStart(2, '0')}:
              {String(elapsedMinutes).padStart(2, '0')}:
              {String(elapsedSeconds).padStart(2, '0')}
            </Text>
            <Text style={styles.clockedInSince}>
              Since {new Date(openEntry!.clock_in).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        )}

        {/* Clock Button */}
        <TouchableOpacity
          style={[styles.clockButton, isClockedIn ? styles.clockOutButton : styles.clockInButton]}
          onPress={isClockedIn ? handleClockOut : handleClockIn}
          disabled={acting}
          activeOpacity={0.8}
        >
          {acting ? (
            <ActivityIndicator color="#fff" size="large" />
          ) : (
            <>
              <Text style={styles.clockButtonText}>
                {isClockedIn ? 'Clock Out' : 'Clock In'}
              </Text>
              <Text style={styles.clockButtonHint}>
                {isClockedIn ? 'Tap to end your shift' : 'Tap to start your shift'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  currentTime: { fontSize: 48, fontWeight: '700', color: Colors.light.text },
  currentDate: { fontSize: 16, color: Colors.light.textSecondary, marginTop: 4, marginBottom: 48 },
  timerContainer: { alignItems: 'center', marginBottom: 48 },
  timerLabel: { fontSize: 14, color: Colors.light.textSecondary, marginBottom: 8 },
  timer: { fontSize: 56, fontWeight: '700', color: Colors.light.primary, fontVariant: ['tabular-nums'] },
  clockedInSince: { fontSize: 13, color: Colors.light.textSecondary, marginTop: 8 },
  clockButton: {
    width: 200,
    height: 200,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  clockInButton: { backgroundColor: Colors.light.primary },
  clockOutButton: { backgroundColor: Colors.light.error },
  clockButtonText: { color: '#fff', fontSize: 24, fontWeight: '700' },
  clockButtonHint: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 4 },
});
