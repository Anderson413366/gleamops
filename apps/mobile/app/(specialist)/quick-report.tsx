import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { useFieldReport } from '../../src/hooks/use-field-report';
import { useMySites } from '../../src/hooks/use-my-sites';
import BigButton from '../../src/components/big-button';
import { Colors } from '../../src/lib/constants';

type QuickType = 'SUPPLY_REQUEST' | 'MAINTENANCE' | 'DAY_OFF' | 'GENERAL' | null;

export default function QuickReportScreen() {
  const { submitReport, reports } = useFieldReport();
  const { sites } = useMySites();
  const [activeType, setActiveType] = useState<QuickType>(null);
  const [siteId, setSiteId] = useState<string | null>(sites[0]?.id ?? null);
  const [description, setDescription] = useState('');
  const [itemsNeeded, setItemsNeeded] = useState('');
  const [requestedDate, setRequestedDate] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!siteId && sites.length > 0) {
      setSiteId(sites[0].id);
    }
  }, [siteId, sites]);

  const typeLabel = useMemo(() => {
    switch (activeType) {
      case 'SUPPLY_REQUEST':
        return 'I need supplies';
      case 'MAINTENANCE':
        return 'Something is broken';
      case 'DAY_OFF':
        return 'Day off request';
      case 'GENERAL':
        return 'Other';
      default:
        return '';
    }
  }, [activeType]);

  const submit = async () => {
    if (!activeType) return;
    if (!description.trim()) return;

    setSubmitting(true);
    try {
      const normalizedDescription = activeType === 'SUPPLY_REQUEST' && itemsNeeded.trim()
        ? `${description.trim()}\nItems needed: ${itemsNeeded.trim()}`
        : description.trim();

      await submitReport({
        report_type: activeType,
        site_id: siteId,
        description: normalizedDescription,
        priority: activeType === 'MAINTENANCE' ? 'HIGH' : 'NORMAL',
        photos: photoUrl.trim() ? [photoUrl.trim()] : null,
        requested_items: null,
        requested_date: activeType === 'DAY_OFF' ? (requestedDate.trim() || null) : null,
      });

      setDescription('');
      setItemsNeeded('');
      setRequestedDate('');
      setPhotoUrl('');
      setActiveType(null);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.actions}>
        <BigButton
          label="I Need Supplies"
          onPress={() => setActiveType('SUPPLY_REQUEST')}
          variant={activeType === 'SUPPLY_REQUEST' ? 'primary' : 'secondary'}
        />
        <BigButton
          label="Something Is Broken"
          onPress={() => setActiveType('MAINTENANCE')}
          variant={activeType === 'MAINTENANCE' ? 'primary' : 'secondary'}
        />
        <BigButton
          label="Day Off Request"
          onPress={() => setActiveType('DAY_OFF')}
          variant={activeType === 'DAY_OFF' ? 'primary' : 'secondary'}
        />
        <BigButton
          label="Other"
          onPress={() => setActiveType('GENERAL')}
          variant={activeType === 'GENERAL' ? 'primary' : 'secondary'}
        />
      </View>

      {activeType ? (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>{typeLabel}</Text>

          <Text style={styles.label}>Site (optional)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sitePills}>
            {sites.map((site) => (
              <TouchableOpacity
                key={site.id}
                onPress={() => setSiteId(site.id)}
                style={[styles.sitePill, siteId === site.id && styles.sitePillActive]}
              >
                <Text style={[styles.sitePillText, siteId === site.id && styles.sitePillTextActive]}>{site.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {activeType === 'SUPPLY_REQUEST' ? (
            <>
              <Text style={styles.label}>What do you need?</Text>
              <TextInput
                value={itemsNeeded}
                onChangeText={setItemsNeeded}
                placeholder="Gloves, Virex, trash bags..."
                style={styles.input}
              />
            </>
          ) : null}

          {activeType === 'DAY_OFF' ? (
            <>
              <Text style={styles.label}>What date? (YYYY-MM-DD)</Text>
              <TextInput
                value={requestedDate}
                onChangeText={setRequestedDate}
                placeholder="2026-03-15"
                style={styles.input}
              />
            </>
          ) : null}

          {activeType === 'MAINTENANCE' ? (
            <>
              <Text style={styles.label}>Photo URL (optional)</Text>
              <TextInput
                value={photoUrl}
                onChangeText={setPhotoUrl}
                placeholder="https://..."
                style={styles.input}
              />
            </>
          ) : null}

          <Text style={styles.label}>Describe the issue</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Briefly explain what happened..."
            multiline
            style={[styles.input, styles.textarea]}
          />

          <BigButton
            label={submitting ? 'Sending...' : 'Send Report'}
            onPress={() => void submit()}
            variant="primary"
            disabled={submitting || !description.trim()}
          />
        </View>
      ) : null}

      <View style={styles.historyCard}>
        <Text style={styles.historyTitle}>Recent reports</Text>
        {reports.length === 0 ? (
          <Text style={styles.historyEmpty}>No reports sent yet.</Text>
        ) : (
          <View style={styles.historyList}>
            {reports.slice(0, 6).map((report) => (
              <View key={report.id} style={styles.historyItem}>
                <Text style={styles.historyItemTitle}>{report.report_code} - {report.report_type}</Text>
                <Text style={styles.historyItemMeta}>{report.status} · {new Date(report.created_at).toLocaleDateString()}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
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
    gap: 14,
    paddingBottom: 28,
  },
  actions: {
    gap: 10,
  },
  formCard: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 12,
    backgroundColor: Colors.light.background,
    padding: 14,
    gap: 10,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.text,
  },
  label: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  sitePills: {
    gap: 8,
    paddingVertical: 2,
  },
  sitePill: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 999,
    backgroundColor: Colors.light.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  sitePillActive: {
    borderColor: Colors.light.primary,
    backgroundColor: Colors.light.primary,
  },
  sitePillText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  sitePillTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  input: {
    height: 42,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 10,
    backgroundColor: Colors.light.surface,
    paddingHorizontal: 12,
    color: Colors.light.text,
  },
  textarea: {
    minHeight: 100,
    height: 100,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
  historyCard: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 12,
    backgroundColor: Colors.light.background,
    padding: 14,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.text,
  },
  historyEmpty: {
    marginTop: 8,
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  historyList: {
    marginTop: 8,
    gap: 8,
  },
  historyItem: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 10,
    backgroundColor: Colors.light.surface,
    padding: 10,
  },
  historyItemTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.text,
  },
  historyItemMeta: {
    marginTop: 2,
    fontSize: 11,
    color: Colors.light.textSecondary,
  },
});
