// Join trip (SPEC §5): Trip ID → preview → claim your name, or add yourself.
// Needs internet: each step reads from or writes to the server.

import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, Icon, Text } from 'react-native-paper';

import Avatar from '@/components/Avatar';
import FormField from '@/components/FormField';
import FormMessage from '@/components/FormMessage';
import Screen from '@/components/Screen';
import ScreenHeader from '@/components/ScreenHeader';
import { formatTripDates } from '@/logic/dates';
import { describeError } from '@/logic/errors';
import { sortParticipants } from '@/logic/trips';
import { MAX_PARTICIPANTS, validateParticipantName } from '@/logic/validation';
import { claimSpot, joinAsNewPerson, lookupTrip } from '@/services/join';
import { useSession } from '@/state/session';
import { useAppTheme } from '@/theme';

const NEW_PERSON = 'new';

function Choice({ selected, disabled, onPress, children }) {
  const theme = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled }}
      style={[
        styles.choice,
        {
          backgroundColor: theme.app.card,
          borderColor: selected ? theme.app.primary : theme.app.border,
          borderWidth: selected ? 1.5 : StyleSheet.hairlineWidth,
        },
      ]}
    >
      {children}
      {!disabled ? (
        <Icon
          source={selected ? 'radiobox-marked' : 'radiobox-blank'}
          size={20}
          color={selected ? theme.app.primary : theme.app.muted}
        />
      ) : null}
    </Pressable>
  );
}

export default function JoinTripScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const { user, displayName } = useSession();

  const [code, setCode] = useState('');
  const [found, setFound] = useState(null); // { tripId, trip, participants }
  const [choice, setChoice] = useState(null); // participant id or NEW_PERSON
  const [newName, setNewName] = useState(displayName);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  async function findTrip() {
    setErrors({});
    setBusy(true);
    try {
      const result = await lookupTrip(code, user.uid);
      if (result.isMember) {
        router.replace(`/trips/${result.tripId}`);
        return;
      }
      setFound(result);
      setChoice(null);
    } catch (error) {
      const { field, message } = describeError(error);
      setErrors({ [field === 'code' ? 'code' : 'form']: message });
    } finally {
      setBusy(false);
    }
  }

  async function join() {
    setErrors({});
    if (!choice) {
      setErrors({ form: 'Pick your name, or choose “I’m not on the list”.' });
      return;
    }
    if (choice === NEW_PERSON) {
      const nameError = validateParticipantName(
        newName,
        found.participants.map((p) => p.name),
      );
      if (nameError) {
        setErrors({ newName: nameError });
        return;
      }
    }

    setBusy(true);
    try {
      if (choice === NEW_PERSON) await joinAsNewPerson(found.tripId, newName, user.uid);
      else await claimSpot(found.tripId, choice, user.uid);
      router.replace(`/trips/${found.tripId}`);
    } catch (error) {
      setErrors({ form: describeError(error).message });
      // Someone may have just claimed a name: refresh the list.
      if (['join/taken', 'join/name-gone'].includes(error?.code)) {
        try {
          setFound(await lookupTrip(code, user.uid));
          setChoice(null);
        } catch {
          // Keep the old list; the message above explains what happened.
        }
      }
      setBusy(false);
    }
  }

  if (!found) {
    return (
      <Screen form>
        <ScreenHeader title="Join a trip" back />
        <Text style={styles.intro}>Enter the 6-character Trip ID your friend shared with you.</Text>
        <FormField
          label="Trip ID"
          value={code}
          onChangeText={(text) => {
            setCode(text.toUpperCase());
            setErrors({});
          }}
          error={errors.code}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={9}
          style={styles.codeInput}
          onSubmitEditing={findTrip}
        />
        <FormMessage message={errors.form} />
        <Button mode="contained" onPress={findTrip} loading={busy} disabled={busy}>
          Find trip
        </Button>
        <Text variant="bodySmall" style={[styles.hint, { color: theme.app.muted }]}>
          Joining needs internet.
        </Text>
      </Screen>
    );
  }

  const { trip, participants } = found;
  const creator = participants.find((p) => p.claimedByUid === trip.creatorUid);
  const people = sortParticipants(participants, trip.creatorUid);
  const full = participants.length >= MAX_PARTICIPANTS;
  const chosen = participants.find((p) => p.id === choice);
  const joinLabel =
    choice === NEW_PERSON
      ? `Join as ${newName.trim() || 'new person'}`
      : chosen
        ? `Join as ${chosen.name}`
        : 'Join trip';

  return (
    <Screen form>
      <ScreenHeader title="Join a trip" back />

      <View style={[styles.preview, { backgroundColor: theme.app.primaryTint }]}>
        <View style={[styles.previewIcon, { backgroundColor: theme.app.card }]}>
          <Icon source="bag-suitcase-outline" size={22} color={theme.app.primary} />
        </View>
        <View style={styles.grow}>
          <Text variant="titleMedium">{trip.name}</Text>
          <Text variant="bodySmall" style={{ color: theme.app.muted }}>
            {creator ? `Created by ${creator.name} · ` : ''}
            {formatTripDates(trip.startDate, trip.endDate)}
          </Text>
        </View>
      </View>

      <Text variant="labelMedium" style={[styles.label, { color: theme.app.muted }]}>
        Which one is you?
      </Text>

      {people.map((person) => {
        const taken = Boolean(person.claimedByUid);
        return (
          <Choice
            key={person.id}
            selected={choice === person.id}
            disabled={taken}
            onPress={() => setChoice(person.id)}
          >
            <Avatar name={person.name} />
            <Text style={[styles.grow, taken && { color: theme.app.muted }]} numberOfLines={1}>
              {person.name}
            </Text>
            {taken ? (
              <Text variant="bodySmall" style={{ color: theme.app.muted }}>
                Already joined
              </Text>
            ) : null}
          </Choice>
        );
      })}

      {full ? (
        <Text variant="bodySmall" style={[styles.hint, { color: theme.app.muted }]}>
          This trip already has {MAX_PARTICIPANTS} people, so no one else can be added.
        </Text>
      ) : (
        <Choice selected={choice === NEW_PERSON} onPress={() => setChoice(NEW_PERSON)}>
          <Icon source="account-plus-outline" size={22} color={theme.app.primary} />
          <Text style={styles.grow}>I’m not on the list</Text>
        </Choice>
      )}

      {choice === NEW_PERSON ? (
        <FormField
          label="Your name on this trip"
          value={newName}
          onChangeText={(text) => {
            setNewName(text);
            setErrors({});
          }}
          error={errors.newName}
          autoCapitalize="words"
          maxLength={60}
        />
      ) : null}

      <View style={styles.footer}>
        <FormMessage message={errors.form} />
        <Button mode="contained" onPress={join} loading={busy} disabled={busy}>
          {joinLabel}
        </Button>
        <Button
          mode="text"
          onPress={() => {
            setFound(null);
            setErrors({});
          }}
          disabled={busy}
        >
          Use a different Trip ID
        </Button>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { marginBottom: 16 },
  codeInput: { letterSpacing: 4, fontSize: 20 },
  hint: { textAlign: 'center', marginTop: 8 },
  preview: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, padding: 12 },
  previewIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grow: { flex: 1, minWidth: 0 },
  label: { marginTop: 16, marginBottom: 8 },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 52,
    marginBottom: 8,
  },
  footer: { marginTop: 'auto', paddingTop: 12 },
});
