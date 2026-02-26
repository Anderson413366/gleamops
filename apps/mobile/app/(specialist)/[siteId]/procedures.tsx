import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useMySites } from '../../../src/hooks/use-my-sites';
import ProcedureStep from '../../../src/components/procedure-step';
import { Colors } from '../../../src/lib/constants';

function parseSteps(value: string | null): string[] {
  if (!value) return [];
  return value
    .split('\n')
    .map((line) => line.replace(/^\s*[-*]?\s*/, '').trim())
    .filter(Boolean);
}

export default function ProceduresScreen() {
  const { siteId } = useLocalSearchParams<{ siteId: string }>();
  const { sites, loading } = useMySites();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  const site = sites.find((item) => item.id === String(siteId)) ?? null;
  const steps = parseSteps(site?.cleaning_procedures ?? null);
  const photos = Array.isArray(site?.cleaning_procedures_photos) ? site!.cleaning_procedures_photos! : [];

  if (!site) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>Site not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerCard}>
        <Text style={styles.siteName}>{site.name}</Text>
        <Text style={styles.siteCode}>{site.site_code}</Text>
      </View>

      {steps.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No procedures available yet.</Text>
        </View>
      ) : (
        <View style={styles.steps}>
          {steps.map((step, index) => (
            <ProcedureStep
              key={`${index}-${step}`}
              index={index}
              text={step}
              photoUrl={photos[index] ?? null}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.surface,
  },
  content: {
    padding: 16,
    gap: 12,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCard: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 12,
    backgroundColor: Colors.light.background,
    padding: 14,
  },
  siteName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.text,
  },
  siteCode: {
    marginTop: 4,
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  steps: {
    gap: 10,
  },
  emptyCard: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 12,
    backgroundColor: Colors.light.background,
    padding: 16,
  },
  emptyTitle: {
    fontSize: 15,
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
});

