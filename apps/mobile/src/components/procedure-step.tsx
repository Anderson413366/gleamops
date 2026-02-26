import { View, Text, StyleSheet, Image } from 'react-native';
import { Colors } from '../lib/constants';

interface ProcedureStepProps {
  index: number;
  text: string;
  photoUrl?: string | null;
}

export default function ProcedureStep({ index, text, photoUrl }: ProcedureStepProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{index + 1}</Text>
        </View>
        <Text style={styles.text}>{text}</Text>
      </View>

      {photoUrl ? (
        <Image
          source={{ uri: photoUrl }}
          style={styles.photo}
          resizeMode="cover"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 12,
    backgroundColor: Colors.light.background,
    padding: 12,
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  badge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.primary,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  text: {
    flex: 1,
    color: Colors.light.text,
    fontSize: 14,
    lineHeight: 20,
  },
  photo: {
    width: '100%',
    height: 180,
    borderRadius: 10,
    backgroundColor: Colors.light.surface,
  },
});

