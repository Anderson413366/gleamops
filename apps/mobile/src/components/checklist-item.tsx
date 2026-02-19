/**
 * ChecklistItem — Toggleable checklist item with sync status indicator.
 *
 * Renders a checkbox with a label and an optional "pending sync" indicator.
 * Used in the ticket detail checklist tab.
 */
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../lib/constants';

export interface ChecklistItemProps {
  label: string;
  isCompleted: boolean;
  isRequired?: boolean;
  syncStatus: 'synced' | 'pending';
  onToggle: () => void;
}

export default function ChecklistItem({
  label,
  isCompleted,
  isRequired,
  syncStatus,
  onToggle,
}: ChecklistItemProps) {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onToggle}
      activeOpacity={0.7}
    >
      {/* Checkbox */}
      <View style={[styles.checkbox, isCompleted && styles.checkboxChecked]}>
        {isCompleted && <Text style={styles.checkmark}>&#10003;</Text>}
      </View>

      {/* Label + sync status */}
      <View style={styles.content}>
        <Text style={[styles.label, isCompleted && styles.labelChecked]}>
          {label}
          {isRequired && <Text style={styles.requiredStar}> *</Text>}
        </Text>
        {syncStatus === 'pending' && (
          <View style={styles.syncRow}>
            <View style={styles.syncDot} />
            <Text style={styles.syncText}>Pending sync</Text>
          </View>
        )}
      </View>

      {/* Sync indicator icon */}
      <View style={styles.syncIndicator}>
        {syncStatus === 'synced' ? (
          <View style={styles.syncedIcon}>
            <Text style={styles.syncedIconText}>&#10003;</Text>
          </View>
        ) : (
          <View style={styles.pendingIcon}>
            <Text style={styles.pendingIconText}>&#8635;</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.light.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.light.success,
    borderColor: Colors.light.success,
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  label: {
    fontSize: 15,
    color: Colors.light.text,
  },
  labelChecked: {
    textDecorationLine: 'line-through',
    color: Colors.light.textSecondary,
  },
  requiredStar: {
    color: Colors.light.error,
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  syncDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.light.warning,
  },
  syncText: {
    fontSize: 11,
    color: Colors.light.warning,
  },
  syncIndicator: {
    marginLeft: 4,
  },
  syncedIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.light.success + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  syncedIconText: {
    fontSize: 12,
    color: Colors.light.success,
    fontWeight: '700',
  },
  pendingIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.light.warning + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pendingIconText: {
    fontSize: 14,
    color: Colors.light.warning,
    fontWeight: '700',
  },
});
