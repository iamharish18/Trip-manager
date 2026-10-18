// Balances tab: your position, then everyone's Paid / Share / Net (SPEC §8).
// Who pays whom appears when the trip is closed (M8).

import { FlatList, StyleSheet, View } from 'react-native';
import { Icon, Text } from 'react-native-paper';

import Avatar from '@/components/Avatar';
import { formatRupees } from '@/logic/format';
import { orderBalances } from '@/logic/insights';
import { computeBalances } from '@/logic/money';
import { describePosition } from '@/logic/position';
import { useTrip } from '@/state/trips';
import { useAppTheme } from '@/theme';

export default function BalancesTab() {
  const theme = useAppTheme();
  const { participants, expenses, me } = useTrip();

  const balances = computeBalances(expenses, participants);
  const rows = orderBalances(participants, balances, me?.id);
  const position = me ? describePosition(balances[me.id]?.net ?? 0) : null;
  const toneColor = {
    positive: theme.app.positive,
    negative: theme.app.negative,
    neutral: theme.app.muted,
  };
  const netColor = (net) => toneColor[net > 0 ? 'positive' : net < 0 ? 'negative' : 'neutral'];

  const header = (
    <View>
      {position ? (
        <View style={[styles.position, { backgroundColor: theme.app.primaryTint }]}>
          <Text variant="bodySmall" style={{ color: theme.app.muted }}>
            Your position
          </Text>
          <Text variant="headlineSmall" style={{ color: toneColor[position.tone] }}>
            {position.text}
          </Text>
        </View>
      ) : null}
      {expenses.length === 0 ? (
        <Text variant="bodySmall" style={[styles.hint, { color: theme.app.muted }]}>
          Add expenses to see balances.
        </Text>
      ) : null}
    </View>
  );

  const footer = (
    <View style={styles.footer}>
      <Icon source="lock-outline" size={16} color={theme.app.muted} />
      <Text variant="bodySmall" style={[styles.grow, { color: theme.app.muted }]}>
        Who pays whom appears when the trip is closed.
      </Text>
    </View>
  );

  return (
    <FlatList
      data={rows}
      keyExtractor={(row) => row.participant.id}
      contentContainerStyle={styles.list}
      ListHeaderComponent={header}
      ListFooterComponent={footer}
      renderItem={({ item }) => {
        const { participant, paid, share, net } = item;
        const isMe = participant.id === me?.id;
        const label = participant.claimedByUid
          ? null
          : participant.leftAt
            ? ' · left'
            : ' · not joined';
        return (
          <View
            style={[styles.row, { backgroundColor: theme.app.card, borderColor: theme.app.border }]}
          >
            <Avatar name={participant.name} />
            <View style={styles.grow}>
              <Text numberOfLines={1}>
                {participant.name}
                {isMe ? <Text style={{ color: theme.app.muted }}> · You</Text> : null}
                {label ? <Text style={{ color: theme.app.muted }}>{label}</Text> : null}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.app.muted }}>
                Paid {formatRupees(paid)} · Share {formatRupees(share)}
              </Text>
            </View>
            <Text variant="titleSmall" style={{ color: netColor(net) }}>
              {formatRupees(net, { signed: true })}
            </Text>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
  position: { borderRadius: 12, padding: 14, marginBottom: 12, gap: 2 },
  hint: { marginHorizontal: 4, marginBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  grow: { flex: 1, minWidth: 0 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, marginHorizontal: 4 },
});
