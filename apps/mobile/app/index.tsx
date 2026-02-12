import { Redirect } from 'expo-router';
import { useAuth } from '../src/contexts/auth-context';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Colors } from '../src/lib/constants';

export default function Index() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  if (session) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/login" />;
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.light.background },
});
