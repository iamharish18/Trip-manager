import { Pressable, StyleSheet, View } from 'react-native';
import { Icon, Text } from 'react-native-paper';

import StatusBadge from '@/components/StatusBadge';
import { formatTripDates } from '@/logic/dates';
import { peopleLabel } from '@/logic/trips';
import { useParticipants } from '@/state/trips';
import { useAppTheme } from '@/theme';

// One trip on Home: icon, name, dates, number of people and status.
export default function TripCard({ trip, onPress }) {
  const theme = useAppTheme();
  const { participants, isLoading } = useParticipants(trip.id);

  const details = [
    formatTripDates(trip.startDate, trip.endDate),
    isLoading ? null : peopleLabel(participants.length),
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${trip.name}, ${details}`}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.app.card, borderColor: theme.app.border },
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.icon, { backgroundColor: theme.app.primaryTint }]}>
        <Icon source="bag-suitcase-outline" size={20} color={theme.app.primary} />
      </View>
      <View style={styles.text}>
        <Text variant="titleSmall" numberOfLines={1}>
          {trip.name}
        </Text>
        <Text variant="bodySmall" style={{ color: theme.app.muted }} numberOfLines={1}>
          {details}
        </Text>
      </View>
      <StatusBadge status={trip.status} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  pressed: { opacity: 0.7 },
  icon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, minWidth: 0 },
});
