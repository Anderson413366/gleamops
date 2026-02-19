/**
 * TicketCard — Compact summary card for ticket lists.
 *
 * Renders ticket code, site name, status indicator, scheduled date/time,
 * and optional crew info. Accepts an onPress callback for navigation.
 */
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, STATUS_COLORS } from '../lib/constants';

export interface TicketCardProps {
  ticketCode: string;
  siteName: string;
  status: string;
  scheduledDate: string;
  startTime?: string | null;
  endTime?: string | null;
  crewCount?: number;
  /** Whether this ticket is assigned to the current user */
  isMine?: boolean;
  /** Role of the current user on this ticket (e.g. LEAD, CLEANER) */
  myRole?: string | null;
  onPress?: () => void;
}

function formatDate(d: string): string {
  const date = new Date(d + 'T00:00:00');
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatTime(t: string | null): string {
  if (!t) return '';
  const parts = t.split(':');
  const h = parseInt(parts[0], 10);
  const m = parts[1];
  const ampm = h >= 12 ? 'pm' : 'am';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m}${ampm}`;
}

export default function TicketCard({
  ticketCode,
  siteName,
  status,
  scheduledDate,
  startTime,
  endTime,
  crewCount,
  isMine,
  myRole,
  onPress,
}: TicketCardProps) {
  const statusColor = STATUS_COLORS[status] ?? '#9CA3AF';

  return (
    <TouchableOpacity
      style={[styles.card, isMine && styles.myCard]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Header: status dot + code + status badge */}
      <View style={styles.cardHeader}>
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        <Text style={styles.ticketCode}>{ticketCode}</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>
            {status.replace('_', ' ')}
          </Text>
        </View>
      </View>

      {/* Site name */}
      <Text style={styles.siteName}>{siteName}</Text>

      {/* Footer: date/time + role badge */}
      <View style={styles.cardFooter}>
        <View style={styles.footerLeft}>
          <Text style={styles.date}>{formatDate(scheduledDate)}</Text>
          {startTime ? (
            <Text style={styles.time}>
              {' '}{formatTime(startTime)}{endTime ? ` - ${formatTime(endTime)}` : ''}
            </Text>
          ) : null}
        </View>
        {myRole && (
          <View style={[styles.roleBadge, myRole === 'LEAD' ? styles.leadBadge : styles.cleanerBadge]}>
            <Text style={styles.roleText}>{myRole}</Text>
          </View>
        )}
      </View>

      {/* Crew count */}
      {crewCount != null && crewCount > 0 && (
        <Text style={styles.crewText}>
          {crewCount} crew member{crewCount > 1 ? 's' : ''}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
    marginBottom: 12,
  },
  myCard: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.light.primary,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  ticketCode: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
    flex: 1,
    fontFamily: 'monospace',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  siteName: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.light.text,
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  date: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  time: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  leadBadge: {
    backgroundColor: '#7C3AED20',
  },
  cleanerBadge: {
    backgroundColor: '#3B82F620',
  },
  roleText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.light.text,
  },
  crewText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 4,
  },
});
