import { Pressable, StyleSheet, View } from 'react-native';
import { Icon, Text } from 'react-native-paper';

import StatusBadge from '@/components/StatusBadge';
import { formatTripDates } from '@/logic/dates';
import { formatRupees } from '@/logic/format';
import { computeBalances, totalSpent } from '@/logic/money';
import { describePosition } from '@/logic/position';
import { peopleLabel } from '@/logic/trips';
import { useSession } from '@/state/session';
import { useExpenses, useParticipants } from '@/state/trips';
import { useAppTheme } from '@/theme';

// One trip on Home: icon, name, dates, people, status, total and your balance.
export default function TripCard({ trip, onPress }) {
  const theme = useAppTheme();
  const { user } = useSession();
  const { participants, isLoading } = useParticipants(trip.id);
  const { expenses } = useExpenses(trip.id);

  const details = [
    formatTripDates(trip.startDate, trip.endDate),
    isLoading ? null : peopleLabel(participants.length),
  ]
    .filter(Boolean)
    .join(' · ');

  const me = participants.find((p) => user && p.claimedByUid === user.uid);
  const total = totalSpent(expenses);
  const position =
    me && expenses.length
      ? describePosition(computeBalances(expenses, participants)[me.id]?.net ?? 0)
      : null;
  const toneColor = {
    positive: theme.app.positive,
    negative: theme.app.negative,
    neutral: theme.app.muted,
  };

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${trip.name}, ${details}, total ${formatRupees(total)}`}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.app.card, borderColor: theme.app.border },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.top}>
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
      </View>
      <View style={styles.bottom}>
        <Text variant="bodySmall" style={{ color: theme.app.muted }}>
          Total {formatRupees(total)}
        </Text>
        {position ? (
          <Text variant="labelLarge" style={{ color: toneColor[position.tone] }}>
            {position.text}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 10,
  },
  pressed: { opacity: 0.7 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  icon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, minWidth: 0 },
});
