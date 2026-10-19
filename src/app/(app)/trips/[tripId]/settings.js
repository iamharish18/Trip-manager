// Trip settings: edit the name and dates and close / reopen (creator),
// manage categories, and leave the trip (members). Delete and export come later.

import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, Dialog, Icon, Portal, Text } from 'react-native-paper';

import DateField from '@/components/DateField';
import FormField from '@/components/FormField';
import FormMessage from '@/components/FormMessage';
import Screen from '@/components/Screen';
import ScreenHeader from '@/components/ScreenHeader';
import TripStatusActions from '@/components/TripStatusActions';
import { formatTripDates } from '@/logic/dates';
import { describeError } from '@/logic/errors';
import {
  collectErrors,
  validateEndDate,
  validateStartDate,
  validateTripName,
} from '@/logic/validation';
import { leaveTrip } from '@/services/join';
import { updateTripDetails } from '@/services/trips';
import { useSession } from '@/state/session';
import { useSync } from '@/state/sync';
import { useTrip } from '@/state/trips';
import { useAppTheme } from '@/theme';

function InfoNote({ children }) {
  const theme = useAppTheme();
  return (
    <View style={[styles.note, { backgroundColor: theme.app.primaryTint }]}>
      <Icon source="information-outline" size={18} color={theme.app.primary} />
      <Text variant="bodySmall" style={[styles.grow, { color: theme.app.muted }]}>
        {children}
      </Text>
    </View>
  );
}

function CategoriesLink({ tripId }) {
  const theme = useAppTheme();
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push(`/trips/${tripId}/categories`)}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.card,
        styles.linkRow,
        { backgroundColor: theme.app.card, borderColor: theme.app.border },
        pressed && styles.pressed,
      ]}
    >
      <Icon source="tag-multiple-outline" size={20} color={theme.app.muted} />
      <Text style={styles.grow}>Categories</Text>
      <Icon source="chevron-right" size={20} color={theme.app.muted} />
    </Pressable>
  );
}

// Leave trip (members only, Active trips only). Needs internet.
function LeaveTrip() {
  const theme = useAppTheme();
  const router = useRouter();
  const { user } = useSession();
  const { tripId, trip, me } = useTrip();
  const { requireOnline } = useSync();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function leave() {
    setBusy(true);
    setError(null);
    try {
      requireOnline('leaveTrip');
      await leaveTrip(tripId, me.id, user.uid);
      router.replace('/home');
    } catch (err) {
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
          styles.card,
          styles.linkRow,
          { backgroundColor: theme.app.card, borderColor: theme.app.negative },
          pressed && styles.pressed,
        ]}
      >
        <Icon source="logout" size={20} color={theme.app.negative} />
        <View style={styles.grow}>
          <Text style={{ color: theme.app.negative }}>Leave trip</Text>
          <Text variant="bodySmall" style={{ color: theme.app.muted }}>
            Needs internet
          </Text>
        </View>
      </Pressable>

      <Portal>
        <Dialog visible={confirming} onDismiss={() => !busy && setConfirming(false)}>
          <Dialog.Title>Leave {trip.name}?</Dialog.Title>
          <Dialog.Content>
            <Text>
              The trip will disappear from your list. Your name stays on it, and your expenses and
              balance don’t change. You can rejoin with the Trip ID while the trip is open.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirming(false)} disabled={busy}>
              Cancel
            </Button>
            <Button textColor={theme.app.negative} onPress={leave} loading={busy} disabled={busy}>
              Leave
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
}

export default function TripSettingsScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const { trip, tripId, isCreator, isOpen, me, track } = useTrip();

  const [name, setName] = useState(trip.name);
  const [startDate, setStartDate] = useState(trip.startDate);
  const [endDate, setEndDate] = useState(trip.endDate ?? null);
  const [errors, setErrors] = useState({});

  const canEdit = isCreator && isOpen;

  function save() {
    const found = collectErrors({
      name: validateTripName(name),
      startDate: validateStartDate(startDate),
      endDate: validateEndDate(startDate, endDate),
    });
    setErrors(found);
    if (Object.keys(found).length) return;

    // Applies to the local cache at once, also offline; reported if the
    // server later rejects it (e.g. the trip was closed meanwhile).
    track(updateTripDetails(tripId, { name, startDate, endDate }), 'Your change to the trip');
    router.back();
  }

  if (!canEdit) {
    return (
      <Screen>
        <ScreenHeader title="Trip settings" back />
        <View
          style={[styles.card, { backgroundColor: theme.app.card, borderColor: theme.app.border }]}
        >
          <Text variant="titleMedium">{trip.name}</Text>
          <Text style={{ color: theme.app.muted }}>
            {formatTripDates(trip.startDate, trip.endDate)}
          </Text>
        </View>
        <CategoriesLink tripId={tripId} />
        {isCreator ? <TripStatusActions /> : null}
        <InfoNote>
          {isCreator
            ? 'This trip is closed, so its name and dates can’t be changed.'
            : 'Only the trip’s creator can change its name and dates.'}
        </InfoNote>
        {!isCreator && me && trip.status === 'active' ? (
          <View style={styles.leave}>
            <LeaveTrip />
          </View>
        ) : null}
      </Screen>
    );
  }

  return (
    <Screen form>
      <ScreenHeader title="Edit trip" back />

      <FormField
        label="Trip name"
        value={name}
        onChangeText={(text) => {
          setName(text);
          setErrors((e) => ({ ...e, name: undefined }));
        }}
        error={errors.name}
        autoCapitalize="sentences"
        maxLength={80}
      />
      <DateField
        label="Start date"
        value={startDate}
        onChange={(value) => {
          setStartDate(value);
          setErrors((e) => ({ ...e, startDate: undefined, endDate: undefined }));
        }}
        error={errors.startDate}
      />
      <DateField
        label="End date (optional)"
        value={endDate}
        optional
        minDate={startDate}
        onChange={(value) => {
          setEndDate(value);
          setErrors((e) => ({ ...e, endDate: undefined }));
        }}
        error={errors.endDate}
      />
      <Text variant="bodySmall" style={[styles.hint, { color: theme.app.muted }]}>
        The end date can’t be before the start date. Tap × to clear it.
      </Text>

      <CategoriesLink tripId={tripId} />

      <TripStatusActions />

      <InfoNote>Export PDF and delete trip arrive in later updates.</InfoNote>

      <Button mode="contained" onPress={save} style={styles.save}>
        Save changes
      </Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1 },
  hint: { marginTop: -4, marginBottom: 12, marginHorizontal: 4 },
  note: { flexDirection: 'row', gap: 8, borderRadius: 12, padding: 12, marginBottom: 12 },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    gap: 2,
  },
  save: { marginTop: 'auto' },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  leave: { marginTop: 'auto' },
  pressed: { opacity: 0.7 },
});
