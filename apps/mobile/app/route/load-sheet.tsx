import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  TouchableOpacity, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors, localDateIso } from '../../src/lib/constants';
import { useRoute } from '../../src/hooks/use-route';
import { enqueue } from '../../src/lib/mutation-queue';
import { syncNow } from '../../src/hooks/use-sync';

interface LoadLine {
  key: string;
  supplyId: string;
  supplyName: string;
  unit: string | null;
  direction: 'deliver' | 'pickup';
  quantity: number;
  siteBreakdown: Array<{
    stop_order: number;
    site_name: string;
    site_id: string | null;
    quantity: number;
  }>;
}

export default function LoadSheetScreen() {
  const router = useRouter();
  const { routeId } = useLocalSearchParams<{ routeId?: string }>();
  const { route, stops, loading, nextStop } = useRoute(localDateIso());
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const hasAutoSkipped = useRef(false);

  const activeRoute = route && (!routeId || route.id === routeId) ? route : null;

  const lines = useMemo<LoadLine[]>(() => {
    const map = new Map<string, LoadLine>();

    for (const stop of stops) {
      for (const task of stop.tasks) {
        if (task.task_type !== 'DELIVER_PICKUP' || !Array.isArray(task.delivery_items)) continue;

        for (const item of task.delivery_items) {
          const key = `${item.supply_id}:${item.direction}`;
          const existing = map.get(key) ?? {
            key,
            supplyId: item.supply_id,
            supplyName: item.supply_name ?? item.supply_id,
            unit: item.unit ?? null,
            direction: item.direction,
            quantity: 0,
            siteBreakdown: [],
          };

          existing.quantity += item.quantity;

          const siteRef = {
            stop_order: stop.stop_order,
            site_name: stop.site_job?.site?.name ?? 'Unknown site',
            site_id: stop.site_job?.site?.id ?? null,
            quantity: item.quantity,
          };

          const existingSite = existing.siteBreakdown.find((row) => row.stop_order === siteRef.stop_order);
          if (existingSite) {
            existingSite.quantity += item.quantity;
          } else {
            existing.siteBreakdown.push(siteRef);
          }

          map.set(key, existing);
        }
      }
    }

    return Array.from(map.values()).sort((a, b) => a.supplyName.localeCompare(b.supplyName));
  }, [stops]);

  useEffect(() => {
    if (loading || hasAutoSkipped.current) return;
    if (!activeRoute) return;

    if (lines.length === 0) {
      hasAutoSkipped.current = true;
      if (nextStop) {
        router.replace(`/route/stop/${nextStop.id}`);
      } else {
        router.replace('/(tabs)/route');
      }
    }
  }, [activeRoute, lines.length, loading, nextStop, router]);

  const allChecked = lines.length > 0 && lines.every((line) => checked[line.key]);

  const toggleLine = (lineKey: string) => {
    setChecked((prev) => ({
      ...prev,
      [lineKey]: !prev[lineKey],
    }));
  };

  const markNotAvailable = async (line: LoadLine) => {
    if (!activeRoute) {
      Alert.alert('Missing context', 'Route information is unavailable.');
      return;
    }

    try {
      const primarySite = line.siteBreakdown[0];
      const description = [
        'Route load item not available.',
        `Item: ${line.supplyName}`,
        `Quantity: ${line.quantity}`,
        `Direction: ${line.direction}`,
        primarySite ? `First stop: ${primarySite.site_name} (#${primarySite.stop_order})` : null,
      ].filter(Boolean).join(' ');

      await enqueue({
        type: 'field_report_create',
        reportType: 'SUPPLY_REQUEST',
        siteId: primarySite?.site_id ?? null,
        description,
        priority: 'HIGH',
        photos: null,
        requestedItems: [{ supply_id: line.supplyId, qty: line.quantity }],
        requestedDate: null,
      });

      await syncNow();

      Alert.alert('Request sent', 'Supply request sent to operations.');
    } catch (error) {
      Alert.alert('Unable to send request', error instanceof Error ? error.message : 'Try again when online.');
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  if (!activeRoute) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>No route found</Text>
        <Text style={styles.emptyText}>Return to Route tab and refresh.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerCard}>
        <Text style={styles.title}>Tonight&apos;s Load</Text>
        <Text style={styles.subtitle}>Load these before leaving for your first stop.</Text>
      </View>

      {lines.map((line) => {
        const checkedValue = !!checked[line.key];
        const breakdownText = line.siteBreakdown
          .sort((a, b) => a.stop_order - b.stop_order)
          .map((site) => `${site.quantity} for ${site.site_name}`)
          .join(', ');

        return (
          <View key={line.key} style={styles.itemCard}>
            <TouchableOpacity
              style={styles.itemMain}
              onPress={() => toggleLine(line.key)}
              activeOpacity={0.75}
            >
              <View style={[styles.checkbox, checkedValue && styles.checkboxChecked]}>
                {checkedValue ? <Text style={styles.checkMark}>✓</Text> : null}
              </View>
              <View style={styles.itemTextWrap}>
                <Text style={styles.itemText}>
                  {line.quantity} {line.unit ?? ''} {line.supplyName}
                </Text>
                <Text style={styles.itemMeta}>{breakdownText}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.notAvailableButton}
              onPress={() => void markNotAvailable(line)}
            >
              <Text style={styles.notAvailableText}>Not Available</Text>
            </TouchableOpacity>
          </View>
        );
      })}

      <TouchableOpacity
        style={[styles.primaryButton, !allChecked && styles.primaryButtonDisabled]}
        disabled={!allChecked}
        onPress={() => {
          if (nextStop) {
            router.replace(`/route/stop/${nextStop.id}`);
            return;
          }
          router.replace('/(tabs)/route');
        }}
      >
        <Text style={styles.primaryButtonText}>All Loaded</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.surface },
  content: { padding: 16, paddingBottom: 24 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  headerCard: {
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  title: { fontSize: 22, fontWeight: '700', color: Colors.light.text },
  subtitle: { marginTop: 5, color: Colors.light.textSecondary, fontSize: 14 },
  itemCard: {
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  itemMain: { flexDirection: 'row', gap: 10 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: Colors.light.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  checkMark: { color: '#fff', fontWeight: '700', fontSize: 13 },
  itemTextWrap: { flex: 1 },
  itemText: { color: Colors.light.text, fontWeight: '600', fontSize: 15 },
  itemMeta: { marginTop: 4, color: Colors.light.textSecondary, fontSize: 12, lineHeight: 17 },
  notAvailableButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.warning,
    backgroundColor: `${Colors.light.warning}12`,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  notAvailableText: { color: Colors.light.warning, fontSize: 12, fontWeight: '700' },
  primaryButton: {
    marginTop: 12,
    borderRadius: 10,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
    paddingVertical: 13,
  },
  primaryButtonDisabled: { opacity: 0.45 },
  primaryButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.light.text },
  emptyText: { marginTop: 8, fontSize: 14, color: Colors.light.textSecondary, textAlign: 'center' },
});
