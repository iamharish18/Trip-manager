// Delete trip (creator, any status, needs internet, SPEC §13).

import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, Dialog, Icon, Portal, Text } from 'react-native-paper';

import FormMessage from '@/components/FormMessage';
import { describeError } from '@/logic/errors';
import { deleteTrip } from '@/services/deleteTrip';
import { useSession } from '@/state/session';
import { useSync } from '@/state/sync';
import { useTrip } from '@/state/trips';
import { useAppTheme } from '@/theme';

export default function DeleteTrip() {
  const theme = useAppTheme();
  const router = useRouter();
  const { user } = useSession();
  const { trip, tripId } = useTrip();
  const { requireOnline } = useSync();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function remove() {
    setBusy(true);
    setError(null);
    let left = false;
    try {
      requireOnline('deleteTrip');
      await deleteTrip(tripId, user.uid, {
        // Once marked, leave the trip's screens before its data disappears;
        // if the rest is interrupted, Home finishes it later.
        onMarked: () => {
          left = true;
          router.replace('/home');
        },
      });
    } catch (err) {
      if (left) return;
      setError(describeError(err).message);
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <>
      <FormMessage message={error} />
      <Pressable
        onPress={() => setConfirming(true)}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.row,
          { backgroundColor: theme.app.card, borderColor: theme.app.negative },
          pressed && styles.pressed,
        ]}
      >
        <Icon source="delete-outline" size={20} color={theme.app.negative} />
        <View style={styles.grow}>
          <Text style={{ color: theme.app.negative }}>Delete trip</Text>
          <Text variant="bodySmall" style={{ color: theme.app.muted }}>
            Removes everything for everyone · needs internet
          </Text>
        </View>
      </Pressable>

      <Portal>
        <Dialog visible={confirming} onDismiss={() => !busy && setConfirming(false)}>
          <Dialog.Title>Delete {trip.name} for everyone?</Dialog.Title>
          <Dialog.Content>
            <Text>
              All expenses, comments and settlements are removed for all members. This can’t be
              undone.
            </Text>
            <Text variant="bodySmall" style={[styles.tip, { color: theme.app.muted }]}>
              Tip: export the PDF first to keep a copy.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirming(false)} disabled={busy}>
              Cancel
            </Button>
            <Button textColor={theme.app.negative} onPress={remove} loading={busy} disabled={busy}>
              Delete
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  pressed: { opacity: 0.7 },
  grow: { flex: 1, minWidth: 0 },
  tip: { marginTop: 8 },
});
