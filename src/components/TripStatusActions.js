// Creator's Close / Reopen / Close now controls in Trip settings (SPEC §4,
// §9). Each needs internet and notifies the other members afterwards.

import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Dialog, Icon, Portal, Text } from 'react-native-paper';

import FormMessage from '@/components/FormMessage';
import { describeError } from '@/logic/errors';
import { closeTrip, reopenTrip } from '@/services/lifecycle';
import { notifyTripEvent } from '@/services/notifications';
import { useSession } from '@/state/session';
import { useSync } from '@/state/sync';
import { useTrip } from '@/state/trips';
import { useAppTheme } from '@/theme';

const ACTIONS = {
  close: {
    title: 'Close trip',
    explain:
      'Locks expenses, expires the Trip ID and shows who pays whom. You can reopen once, for 24 hours.',
    confirmTitle: 'Close this trip?',
    confirmText: 'Expenses will be locked and everyone will see who pays whom. Needs internet.',
    button: 'Close trip',
  },
  closeNow: {
    title: 'Close now',
    explain: 'Finish the reopen early. This close is final.',
    confirmTitle: 'Close for good?',
    confirmText:
      'This is the final close: expenses lock for good and the final settlements are worked out. Needs internet.',
    button: 'Close for good',
  },
  reopen: {
    title: 'Reopen for 24 hours',
    explain: 'To fix expenses. You can reopen only once.',
    confirmTitle: 'Reopen this trip?',
    confirmText:
      'You can reopen only once, for 24 hours. Payments already marked paid are kept. Needs internet.',
    button: 'Reopen',
  },
};

export default function TripStatusActions() {
  const theme = useAppTheme();
  const router = useRouter();
  const { user } = useSession();
  const { trip, tripId, isOpen } = useTrip();
  const { requireOnline } = useSync();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  let action = null;
  let note = null;
  if (trip.status === 'active') action = 'close';
  else if (trip.status === 'reopened' && isOpen) action = 'closeNow';
  else if (trip.status === 'closed' && !trip.reopenUsed) action = 'reopen';
  else if (trip.status === 'closed') note = 'Closed. The one reopen has been used.';
  else note = 'This trip is final.';

  async function run() {
    setBusy(true);
    setError(null);
    try {
      requireOnline(action === 'reopen' ? 'reopenTrip' : 'closeTrip');
      if (action === 'reopen') {
        await reopenTrip(tripId);
        notifyTripEvent(tripId, user.uid, 'reopened').catch(() => {});
        router.replace(`/trips/${tripId}`);
      } else {
        const result = await closeTrip(tripId);
        notifyTripEvent(tripId, user.uid, result.status, result.settlements).catch(() => {});
        router.replace(`/trips/${tripId}/balances`);
      }
    } catch (err) {
      setError(describeError(err).message);
      setBusy(false);
      setConfirming(false);
    }
  }

  if (note) {
    return (
      <View style={[styles.note, { backgroundColor: theme.app.primaryTint }]}>
        <Icon source="lock-outline" size={18} color={theme.app.primary} />
        <Text variant="bodySmall" style={[styles.grow, { color: theme.app.muted }]}>
          {note}
        </Text>
      </View>
    );
  }

  const copy = ACTIONS[action];
  return (
    <View style={[styles.card, { backgroundColor: theme.app.card, borderColor: theme.app.border }]}>
      <View style={styles.row}>
        <Icon
          source={action === 'reopen' ? 'lock-open-variant-outline' : 'lock-outline'}
          size={20}
          color={theme.app.primary}
        />
        <View style={styles.grow}>
          <Text style={styles.bold}>{copy.title}</Text>
          <Text variant="bodySmall" style={{ color: theme.app.muted }}>
            {copy.explain}
          </Text>
        </View>
      </View>
      <FormMessage message={error} style={styles.error} />
      <Button mode="contained" onPress={() => setConfirming(true)} style={styles.button}>
        {copy.button}
      </Button>

      <Portal>
        <Dialog visible={confirming} onDismiss={() => !busy && setConfirming(false)}>
          <Dialog.Title>{copy.confirmTitle}</Dialog.Title>
          <Dialog.Content>
            <Text>{copy.confirmText}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirming(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onPress={run} loading={busy} disabled={busy}>
              {copy.button}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: 12, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  grow: { flex: 1, minWidth: 0 },
  bold: { fontWeight: '500' },
  button: { marginTop: 10 },
  error: { marginTop: 10, marginBottom: 0 },
  note: { flexDirection: 'row', gap: 8, borderRadius: 12, padding: 12, marginBottom: 12 },
});
