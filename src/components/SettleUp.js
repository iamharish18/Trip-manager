// Settle up (SPEC §9, mockup 6): who pays whom, with Mark paid, shown on
// the Balances tab once the trip is closed.

import { StyleSheet, View } from 'react-native';
import { Button, Icon, Text } from 'react-native-paper';

import { formatRupees } from '@/logic/format';
import { markSettlement } from '@/services/lifecycle';
import { useSession } from '@/state/session';
import { useTrip } from '@/state/trips';
import { useAppTheme } from '@/theme';

function SettlementRow({ settlement, nameOf, mePid, canMark, onToggle }) {
  const theme = useAppTheme();
  const from = settlement.fromPid === mePid ? 'You' : nameOf(settlement.fromPid);
  const to = settlement.toPid === mePid ? 'You' : nameOf(settlement.toPid);
  const amountColor =
    settlement.fromPid === mePid
      ? theme.app.negative
      : settlement.toPid === mePid
        ? theme.app.positive
        : theme.app.text;
  const paid = settlement.isPaid;

  return (
    <View style={[styles.row, { backgroundColor: theme.app.card, borderColor: theme.app.border }]}>
      <View style={styles.grow}>
        <Text>
          <Text style={styles.bold}>{from}</Text> {from === 'You' ? 'pay' : 'pays'}{' '}
          <Text style={styles.bold}>{to}</Text>
        </Text>
        <Text
          variant="titleSmall"
          style={[{ color: paid ? theme.app.muted : amountColor }, paid && styles.struck]}
        >
          {formatRupees(settlement.amount)}
        </Text>
      </View>
      {canMark ? (
        <Button
          mode={paid ? 'text' : 'outlined'}
          compact
          icon={paid ? 'check' : undefined}
          textColor={paid ? theme.app.positive : undefined}
          onPress={onToggle}
          accessibilityLabel={
            paid ? `Paid. Tap to mark ${from} → ${to} as not paid` : `Mark ${from} → ${to} as paid`
          }
        >
          {paid ? 'Paid' : 'Mark paid'}
        </Button>
      ) : (
        <Text variant="bodySmall" style={{ color: paid ? theme.app.positive : theme.app.muted }}>
          {paid ? 'Paid' : 'Not paid'}
        </Text>
      )}
    </View>
  );
}

export default function SettleUp() {
  const theme = useAppTheme();
  const { user } = useSession();
  const { trip, tripId, participants, settlements, me, isCreator, track } = useTrip();

  const nameOf = (pid) => participants.find((p) => p.id === pid)?.name ?? 'Someone';
  const claimedBy = (pid) => participants.find((p) => p.id === pid)?.claimedByUid;
  const canMark = (s) =>
    isCreator || claimedBy(s.fromPid) === user.uid || claimedBy(s.toPid) === user.uid;

  const earlier = settlements.filter((s) => s.isRecordedPayment);
  const current = settlements
    .filter((s) => !s.isRecordedPayment)
    .sort((a, b) => b.amount - a.amount || a.fromPid.localeCompare(b.fromPid));
  const paidCount = current.filter((s) => s.isPaid).length;
  const isFinal = trip.status === 'final';

  function toggle(s) {
    // Works offline; syncs later.
    track(markSettlement(tripId, s.id, !s.isPaid, user.uid), 'Marking the payment');
  }

  return (
    <View style={styles.section}>
      <View style={[styles.banner, { backgroundColor: theme.app.primaryTint }]}>
        <Icon source="lock-outline" size={20} color={theme.app.primary} />
        <View style={styles.grow}>
          <Text style={styles.bold}>{isFinal ? 'Trip is final' : 'Trip closed'}</Text>
          <Text variant="bodySmall" style={{ color: theme.app.muted }}>
            Expenses are locked. Settle up below.
          </Text>
        </View>
      </View>

      {current.length === 0 ? (
        <Text style={[styles.square, { color: theme.app.muted }]}>
          Everyone’s settled up. Nothing to pay.
        </Text>
      ) : (
        <>
          <Text variant="labelMedium" style={[styles.label, { color: theme.app.muted }]}>
            Settle up · {paidCount} of {current.length} paid
          </Text>
          {current.map((s) => (
            <SettlementRow
              key={s.id}
              settlement={s}
              nameOf={nameOf}
              mePid={me?.id}
              canMark={canMark(s)}
              onToggle={() => toggle(s)}
            />
          ))}
        </>
      )}

      {earlier.length ? (
        <>
          <Text variant="labelMedium" style={[styles.label, { color: theme.app.muted }]}>
            Earlier payments
          </Text>
          {earlier.map((s) => (
            <View
              key={s.id}
              style={[
                styles.row,
                { backgroundColor: theme.app.card, borderColor: theme.app.border },
              ]}
            >
              <Text style={styles.grow}>
                {s.fromPid === me?.id ? 'You' : nameOf(s.fromPid)} paid{' '}
                {s.toPid === me?.id ? 'you' : nameOf(s.toPid)}
              </Text>
              <Text variant="titleSmall" style={{ color: theme.app.muted }}>
                {formatRupees(s.amount)}
              </Text>
            </View>
          ))}
        </>
      ) : null}

      <Text variant="labelMedium" style={[styles.label, { color: theme.app.muted }]}>
        Balances
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 4 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, padding: 12 },
  grow: { flex: 1, minWidth: 0 },
  bold: { fontWeight: '500' },
  label: { marginTop: 14, marginBottom: 8 },
  square: { textAlign: 'center', marginVertical: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 8,
    marginBottom: 8,
  },
  struck: { textDecorationLine: 'line-through' },
});
