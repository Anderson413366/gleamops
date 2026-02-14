import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, SafeAreaView,
  TextInput, ScrollView,
} from 'react-native';
import * as Location from 'expo-location';
import { supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/contexts/auth-context';
import { Colors } from '../../src/lib/constants';

interface OpenTimeEntry {
  id: string;
  start_at: string;
  status: string;
  check_in_event_id: string | null;
}

interface StaffRecord {
  id: string;
  full_name: string;
  pin: string | null;
}

interface SiteOption {
  id: string;
  name: string;
  site_code: string;
}

interface LastEvent {
  event_type: string;
  recorded_at: string;
}

export default function ClockScreen() {
  const { user, tenantId } = useAuth();
  const [staff, setStaff] = useState<StaffRecord | null>(null);
  const [openEntry, setOpenEntry] = useState<OpenTimeEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [locationStatus, setLocationStatus] = useState<string | null>(null);

  // PIN + site selection
  const [pin, setPin] = useState('');
  const [pinVerified, setPinVerified] = useState(false);
  const [sites, setSites] = useState<SiteOption[]>([]);
  const [selectedSite, setSelectedSite] = useState<SiteOption | null>(null);
  const [showSitePicker, setShowSitePicker] = useState(false);
  const [lastEvent, setLastEvent] = useState<LastEvent | null>(null);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Request location permissions on mount
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationStatus('Location access denied');
      }
    })();
  }, []);

  // Get staff record + check for open entry + load sites
  const fetchState = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: staffData } = await supabase
      .from('staff')
      .select('id, full_name, pin')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!staffData) {
      setStaff(null);
      setLoading(false);
      return;
    }
    setStaff(staffData as StaffRecord);

    // If no PIN set, auto-verify
    if (!staffData.pin) {
      setPinVerified(true);
    }

    // Find open time entry
    const { data: entry } = await supabase
      .from('time_entries')
      .select('id, start_at, status, check_in_event_id')
      .eq('staff_id', staffData.id)
      .eq('status', 'OPEN')
      .is('end_at', null)
      .order('start_at', { ascending: false })
      .maybeSingle();

    setOpenEntry(entry as OpenTimeEntry | null);

    // Load last event
    const { data: lastEvt } = await supabase
      .from('time_events')
      .select('event_type, recorded_at')
      .eq('staff_id', staffData.id)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    setLastEvent(lastEvt as LastEvent | null);

    // Load sites
    const { data: siteData } = await supabase
      .from('sites')
      .select('id, name, site_code')
      .order('name');

    if (siteData) {
      setSites(siteData as SiteOption[]);
    }

    setLoading(false);
  }, [user]);

  useEffect(() => { fetchState(); }, [fetchState]);

  // PIN verification
  const handlePinSubmit = () => {
    if (!staff) return;
    if (staff.pin && pin !== staff.pin) {
      Alert.alert('Invalid PIN', 'The PIN you entered is incorrect.');
      setPin('');
      return;
    }
    setPinVerified(true);
  };

  // Capture GPS location
  const getLocation = async (): Promise<{ lat: number; lng: number; accuracy: number } | null> => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationStatus('Location denied');
        return null;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      return {
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
        accuracy: loc.coords.accuracy ?? 0,
      };
    } catch {
      setLocationStatus('GPS error');
      return null;
    }
  };

  const handleClockIn = async () => {
    if (!user || !tenantId || !staff) return;
    setActing(true);
    setLocationStatus('Getting location...');

    const location = await getLocation();
    const now = new Date().toISOString();

    // Create CHECK_IN time event with GPS
    const { data: event, error: eventErr } = await supabase.from('time_events').insert({
      tenant_id: tenantId,
      staff_id: staff.id,
      event_type: 'CHECK_IN',
      recorded_at: now,
      lat: location?.lat ?? null,
      lng: location?.lng ?? null,
      accuracy_meters: location?.accuracy ?? null,
      pin_used: !!staff.pin,
      site_id: selectedSite?.id ?? null,
    }).select().single();

    if (eventErr) {
      Alert.alert('Error', 'Failed to record check-in event.');
      setActing(false);
      return;
    }

    // Create open time entry linked to the event
    const { error: entryErr } = await supabase.from('time_entries').insert({
      tenant_id: tenantId,
      staff_id: staff.id,
      check_in_event_id: event?.id ?? null,
      start_at: now,
      break_minutes: 0,
      status: 'OPEN',
    });

    if (entryErr) {
      Alert.alert('Error', 'Failed to create time entry.');
      setActing(false);
      return;
    }

    setLocationStatus(location ? `GPS: ${location.accuracy.toFixed(0)}m accuracy` : 'No GPS');
    await fetchState();
    setActing(false);
  };

  const handleClockOut = async () => {
    if (!openEntry || !user || !tenantId || !staff) return;
    setActing(true);
    setLocationStatus('Getting location...');

    const location = await getLocation();
    const now = new Date().toISOString();

    // Create CHECK_OUT time event with GPS
    const { data: event } = await supabase.from('time_events').insert({
      tenant_id: tenantId,
      staff_id: staff.id,
      event_type: 'CHECK_OUT',
      recorded_at: now,
      lat: location?.lat ?? null,
      lng: location?.lng ?? null,
      accuracy_meters: location?.accuracy ?? null,
      pin_used: !!staff.pin,
      site_id: selectedSite?.id ?? null,
    }).select().single();

    // Calculate duration in minutes
    const startAt = new Date(openEntry.start_at);
    const endAt = new Date(now);
    const durationMinutes = Math.round((endAt.getTime() - startAt.getTime()) / 60000);

    // Close the time entry
    await supabase
      .from('time_entries')
      .update({
        check_out_event_id: event?.id ?? null,
        end_at: now,
        duration_minutes: durationMinutes,
        status: 'CLOSED',
      })
      .eq('id', openEntry.id);

    setLocationStatus(location ? `GPS: ${location.accuracy.toFixed(0)}m accuracy` : 'No GPS');
    setOpenEntry(null);
    setActing(false);
    await fetchState();
  };

  const isClockedIn = !!openEntry;
  const elapsed = openEntry
    ? Math.floor((currentTime.getTime() - new Date(openEntry.start_at).getTime()) / 1000)
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

  if (!staff) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>No Staff Record</Text>
        <Text style={styles.emptyText}>Your user account is not linked to a staff record. Contact your administrator.</Text>
      </View>
    );
  }

  // PIN entry gate (only if staff has a PIN set)
  if (staff.pin && !pinVerified) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.greeting}>Hello, {staff.full_name.split(' ')[0]}</Text>
          <Text style={styles.pinTitle}>Enter your PIN</Text>
          <TextInput
            style={styles.pinInput}
            placeholder="4-6 digit PIN"
            placeholderTextColor={Colors.light.textSecondary}
            value={pin}
            onChangeText={(text) => setPin(text.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
            maxLength={6}
            secureTextEntry
            autoFocus
          />
          <TouchableOpacity
            style={[styles.pinButton, pin.length < 4 && styles.pinButtonDisabled]}
            onPress={handlePinSubmit}
            disabled={pin.length < 4}
          >
            <Text style={styles.pinButtonText}>Verify PIN</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Greeting */}
        <Text style={styles.greeting}>Hello, {staff.full_name.split(' ')[0]}</Text>

        {/* Current Time */}
        <Text style={styles.currentTime}>
          {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
        </Text>
        <Text style={styles.currentDate}>
          {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </Text>

        {/* Site Selection */}
        {!isClockedIn && (
          <View style={styles.siteSection}>
            <Text style={styles.siteLabel}>Select Site (optional)</Text>
            <TouchableOpacity
              style={styles.sitePicker}
              onPress={() => setShowSitePicker(!showSitePicker)}
              activeOpacity={0.7}
            >
              <Text style={selectedSite ? styles.sitePickerText : styles.sitePickerPlaceholder}>
                {selectedSite ? selectedSite.name : 'Tap to select a site'}
              </Text>
            </TouchableOpacity>
            {showSitePicker && (
              <View style={styles.siteDropdown}>
                <TouchableOpacity
                  style={styles.siteOption}
                  onPress={() => { setSelectedSite(null); setShowSitePicker(false); }}
                >
                  <Text style={styles.siteOptionText}>None</Text>
                </TouchableOpacity>
                {sites.map((site) => (
                  <TouchableOpacity
                    key={site.id}
                    style={[styles.siteOption, selectedSite?.id === site.id && styles.siteOptionSelected]}
                    onPress={() => { setSelectedSite(site); setShowSitePicker(false); }}
                  >
                    <Text style={[styles.siteOptionText, selectedSite?.id === site.id && styles.siteOptionTextSelected]}>
                      {site.name}
                    </Text>
                    <Text style={styles.siteOptionCode}>{site.site_code}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

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
              Since {new Date(openEntry!.start_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
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

        {/* GPS Status */}
        {locationStatus && (
          <Text style={styles.gpsStatus}>{locationStatus}</Text>
        )}

        {/* Last Event Status */}
        {lastEvent && (
          <View style={styles.lastEventCard}>
            <Text style={styles.lastEventTitle}>Last Clock Event</Text>
            <View style={styles.lastEventRow}>
              <View style={[
                styles.lastEventDot,
                { backgroundColor: lastEvent.event_type === 'CHECK_IN' ? Colors.light.success : Colors.light.error },
              ]} />
              <Text style={styles.lastEventType}>
                {lastEvent.event_type === 'CHECK_IN' ? 'Clocked In' : 'Clocked Out'}
              </Text>
            </View>
            <Text style={styles.lastEventTime}>
              {new Date(lastEvent.recorded_at).toLocaleString('en-US', {
                weekday: 'short', month: 'short', day: 'numeric',
                hour: 'numeric', minute: '2-digit',
              })}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  content: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  greeting: { fontSize: 18, fontWeight: '500', color: Colors.light.textSecondary, marginBottom: 8 },
  currentTime: { fontSize: 48, fontWeight: '700', color: Colors.light.text },
  currentDate: { fontSize: 16, color: Colors.light.textSecondary, marginTop: 4, marginBottom: 32 },

  // PIN entry
  pinTitle: { fontSize: 20, fontWeight: '600', color: Colors.light.text, marginTop: 24, marginBottom: 16 },
  pinInput: {
    width: 200,
    borderWidth: 2,
    borderColor: Colors.light.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 24,
    textAlign: 'center',
    color: Colors.light.text,
    backgroundColor: Colors.light.surface,
    letterSpacing: 8,
    fontWeight: '700',
  },
  pinButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 48,
    marginTop: 20,
  },
  pinButtonDisabled: { opacity: 0.4 },
  pinButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  // Site selection
  siteSection: { width: '100%', marginBottom: 24 },
  siteLabel: { fontSize: 13, fontWeight: '600', color: Colors.light.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  sitePicker: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.light.surface,
  },
  sitePickerText: { fontSize: 15, color: Colors.light.text },
  sitePickerPlaceholder: { fontSize: 15, color: Colors.light.textSecondary },
  siteDropdown: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 10,
    backgroundColor: Colors.light.background,
    maxHeight: 200,
    overflow: 'hidden',
  },
  siteOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  siteOptionSelected: { backgroundColor: Colors.light.primary + '10' },
  siteOptionText: { fontSize: 14, color: Colors.light.text },
  siteOptionTextSelected: { color: Colors.light.primary, fontWeight: '600' },
  siteOptionCode: { fontSize: 12, color: Colors.light.textSecondary, fontFamily: 'monospace' },

  // Timer
  timerContainer: { alignItems: 'center', marginBottom: 32 },
  timerLabel: { fontSize: 14, color: Colors.light.textSecondary, marginBottom: 8 },
  timer: { fontSize: 56, fontWeight: '700', color: Colors.light.primary, fontVariant: ['tabular-nums'] },
  clockedInSince: { fontSize: 13, color: Colors.light.textSecondary, marginTop: 8 },

  // Clock button
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

  // GPS + last event
  gpsStatus: { fontSize: 12, color: Colors.light.textSecondary, marginTop: 16 },
  lastEventCard: {
    marginTop: 24,
    width: '100%',
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
    alignItems: 'center',
  },
  lastEventTitle: { fontSize: 11, fontWeight: '600', color: Colors.light.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  lastEventRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  lastEventDot: { width: 8, height: 8, borderRadius: 4 },
  lastEventType: { fontSize: 15, fontWeight: '600', color: Colors.light.text },
  lastEventTime: { fontSize: 13, color: Colors.light.textSecondary },

  emptyTitle: { fontSize: 18, fontWeight: '600', color: Colors.light.text, marginBottom: 8 },
  emptyText: { fontSize: 14, color: Colors.light.textSecondary, textAlign: 'center' },
});
