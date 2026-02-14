/**
 * SyncStatusBar — Displays offline sync status.
 *
 * Shows the number of pending mutations and last sync timestamp.
 * Green when all synced, warning (amber) when items are pending.
 * Tap to trigger a manual sync.
 */
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Colors } from '../lib/constants';

export interface SyncStatusBarProps {
  pendingCount: number;
  lastSyncAt: string | null;
  isSyncing?: boolean;
  onSyncPress?: () => void;
}

function formatSyncAge(iso: string | null): string {
  if (!iso) return 'Never';
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return 'Just now';
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function SyncStatusBar({
  pendingCount,
  lastSyncAt,
  isSyncing = false,
  onSyncPress,
}: SyncStatusBarProps) {
  const hasPending = pendingCount > 0;
  const bgColor = hasPending ? Colors.light.warning + '15' : Colors.light.success + '15';
  const borderColor = hasPending ? Colors.light.warning + '40' : Colors.light.success + '40';
  const dotColor = hasPending ? Colors.light.warning : Colors.light.success;
  const textColor = hasPending ? Colors.light.warning : Colors.light.success;

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: bgColor, borderColor }]}
      onPress={onSyncPress}
      activeOpacity={onSyncPress ? 0.7 : 1}
      disabled={!onSyncPress || isSyncing}
    >
      <View style={styles.left}>
        {/* Status dot */}
        {isSyncing ? (
          <ActivityIndicator size="small" color={Colors.light.primary} style={styles.spinner} />
        ) : (
          <View style={[styles.dot, { backgroundColor: dotColor }]} />
        )}

        {/* Status text */}
        <View>
          <Text style={[styles.statusText, { color: textColor }]}>
            {isSyncing
              ? 'Syncing...'
              : hasPending
                ? `${pendingCount} change${pendingCount > 1 ? 's' : ''} pending`
                : 'All synced'}
          </Text>
          <Text style={styles.syncAge}>
            Last sync: {formatSyncAge(lastSyncAt)}
          </Text>
        </View>
      </View>

      {/* Sync action hint */}
      {hasPending && !isSyncing && onSyncPress && (
        <Text style={styles.tapHint}>Tap to sync</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 10,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  spinner: {
    width: 10,
    height: 10,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  syncAge: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    marginTop: 1,
  },
  tapHint: {
    fontSize: 12,
    color: Colors.light.warning,
    fontWeight: '500',
  },
});
