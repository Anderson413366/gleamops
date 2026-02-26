import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Colors } from '../lib/constants';
import type { RouteStopWithSite } from '../hooks/use-route';

const STOP_STATUS_COLORS: Record<string, string> = {
  PENDING: '#3B82F6',
  ARRIVED: Colors.light.warning,
  COMPLETED: Colors.light.success,
  SKIPPED: '#F97316',
};

function formatWindow(start: string | null, end: string | null): string | null {
  if (!start && !end) return null;
  if (start && end) return `${start.slice(0, 5)} - ${end.slice(0, 5)}`;
  if (start) return `After ${start.slice(0, 5)}`;
  return `Before ${end!.slice(0, 5)}`;
}

interface StopCardProps {
  stop: RouteStopWithSite;
  isNext: boolean;
  onPress: () => void;
}

export default function StopCard({ stop, isNext, onPress }: StopCardProps) {
  const site = stop.site_job?.site;
  const statusColor = STOP_STATUS_COLORS[stop.stop_status] ?? '#9CA3AF';
  const done = stop.tasks.filter((task) => task.is_completed).length;
  const windowText = formatWindow(stop.access_window_start, stop.access_window_end);

  return (
    <TouchableOpacity
      style={[styles.card, isNext && styles.nextCard]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={styles.row}>
        <View style={styles.orderPill}>
          <Text style={styles.orderText}>{stop.stop_order}</Text>
        </View>

        <View style={styles.main}>
          <View style={styles.rowTop}>
            <Text style={styles.siteName}>{site?.name ?? 'Unknown site'}</Text>
            <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>{stop.stop_status.replace('_', ' ')}</Text>
            </View>
          </View>

          <Text style={styles.siteCode}>{site?.site_code ?? 'No site code'}</Text>

          {windowText && (
            <Text style={styles.windowText}>Access window: {windowText}</Text>
          )}

          <Text style={styles.taskMeta}>{done}/{stop.tasks.length} tasks complete</Text>
        </View>
      </View>

      {isNext && (
        <View style={styles.nextBadge}>
          <Text style={styles.nextText}>Next</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    padding: 14,
    marginBottom: 10,
  },
  nextCard: {
    borderColor: Colors.light.primary,
    shadowColor: Colors.light.primary,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  orderPill: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: `${Colors.light.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderText: {
    color: Colors.light.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  main: {
    flex: 1,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  siteName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  siteCode: {
    marginTop: 2,
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  windowText: {
    marginTop: 6,
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  taskMeta: {
    marginTop: 4,
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  nextBadge: {
    marginTop: 10,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: `${Colors.light.primary}20`,
  },
  nextText: {
    color: Colors.light.primary,
    fontSize: 12,
    fontWeight: '700',
  },
});
