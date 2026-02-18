import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSyncInbox } from '../../src/hooks/use-sync-inbox';
import { Colors } from '../../src/lib/constants';

export default function SyncInboxScreen() {
  const { items, loading, refresh, retryOne, dismissOne } = useSyncInbox();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sync Inbox</Text>
      <Text style={styles.subtitle}>Resolve failed offline sync items.</Text>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={Colors.light.primary} />}
        ListEmptyComponent={<Text style={styles.empty}>No failed sync items.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.operation}>{item.type}</Text>
            <Text style={styles.meta}>Created: {new Date(item.createdAt).toLocaleString()}</Text>
            <Text style={styles.meta}>Error: {item.lastError ?? 'Unknown'}</Text>

            <View style={styles.actions}>
              <TouchableOpacity style={styles.retryBtn} onPress={() => retryOne(item.id)}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dismissBtn} onPress={() => dismissOne(item.id)}>
                <Text style={styles.dismissText}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background, padding: 16 },
  title: { fontSize: 22, fontWeight: '700', color: Colors.light.text },
  subtitle: { marginTop: 4, marginBottom: 12, fontSize: 13, color: Colors.light.textSecondary },
  empty: { marginTop: 32, textAlign: 'center', color: Colors.light.textSecondary },
  card: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  operation: { fontSize: 14, fontWeight: '600', color: Colors.light.text },
  meta: { marginTop: 4, fontSize: 12, color: Colors.light.textSecondary },
  actions: { marginTop: 10, flexDirection: 'row', gap: 8 },
  retryBtn: { backgroundColor: Colors.light.primary, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  retryText: { color: '#fff', fontWeight: '600', fontSize: 12 },
  dismissBtn: { borderColor: Colors.light.border, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  dismissText: { color: Colors.light.textSecondary, fontWeight: '600', fontSize: 12 },
});
