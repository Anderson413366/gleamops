import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import type { RouteStopTask } from '@gleamops/shared';
import { Colors } from '../lib/constants';

interface TaskItemProps {
  task: RouteStopTask;
  onToggle: () => void;
  onCameraPress?: () => void;
  disabled?: boolean;
}

export default function TaskItem({ task, onToggle, onCameraPress, disabled = false }: TaskItemProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.mainRow}
        onPress={onToggle}
        disabled={disabled}
        activeOpacity={0.75}
      >
        <View style={[styles.checkbox, task.is_completed && styles.checkboxChecked]}>
          {task.is_completed && <Text style={styles.checkmark}>✓</Text>}
        </View>

        <View style={styles.textWrap}>
          <Text style={[styles.description, task.is_completed && styles.descriptionDone]}>{task.description}</Text>

          {Array.isArray(task.delivery_items) && task.delivery_items.length > 0 && (
            <View style={styles.deliveryWrap}>
              {task.delivery_items.map((item, index) => (
                <Text key={`${task.id}_${item.supply_id}_${index}`} style={styles.deliveryLine}>
                  • {item.direction === 'deliver' ? 'Deliver' : 'Pickup'} {item.quantity}
                  {item.unit ? ` ${item.unit}` : ''}
                  {item.supply_name ? ` ${item.supply_name}` : ''}
                </Text>
              ))}
            </View>
          )}
        </View>
      </TouchableOpacity>

      {task.evidence_required && (
        <TouchableOpacity style={styles.cameraButton} onPress={onCameraPress} activeOpacity={0.75}>
          <Text style={styles.cameraLabel}>📷</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
  },
  mainRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.light.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    borderColor: Colors.light.success,
    backgroundColor: Colors.light.success,
  },
  checkmark: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  textWrap: {
    flex: 1,
  },
  description: {
    fontSize: 14,
    color: Colors.light.text,
    fontWeight: '500',
  },
  descriptionDone: {
    color: Colors.light.textSecondary,
    textDecorationLine: 'line-through',
  },
  deliveryWrap: {
    marginTop: 6,
    gap: 2,
  },
  deliveryLine: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  cameraButton: {
    marginLeft: 8,
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.surface,
  },
  cameraLabel: {
    fontSize: 16,
  },
});
