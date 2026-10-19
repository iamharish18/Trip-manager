// Create trip: name, dates and the people going (SPEC §5).
// Needs internet, because the Trip ID is reserved on the server.

import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, HelperText, IconButton, Text, TextInput } from 'react-native-paper';

import Avatar from '@/components/Avatar';
import DateField from '@/components/DateField';
import FormField from '@/components/FormField';
import FormMessage from '@/components/FormMessage';
import Screen from '@/components/Screen';
import ScreenHeader from '@/components/ScreenHeader';
import { describeError } from '@/logic/errors';
import {
  MAX_PARTICIPANTS,
  collectErrors,
  validateEndDate,
  validateParticipantName,
  validateStartDate,
  validateTripName,
} from '@/logic/validation';
import { createTrip } from '@/services/trips';
import { useSession } from '@/state/session';
import { useSync } from '@/state/sync';
import { useAppTheme } from '@/theme';

export default function NewTripScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const { user, displayName } = useSession();
  const { requireOnline } = useSync();
  const creatorName = displayName.trim() || 'Me';

  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [others, setOthers] = useState([]);
  const [newPerson, setNewPerson] = useState('');
  const [personError, setPersonError] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const total = others.length + 1;
  const full = total >= MAX_PARTICIPANTS;

  function addPerson() {
    if (!newPerson.trim()) return;
    const error = validateParticipantName(newPerson, [creatorName, ...others]);
    if (error) {
      setPersonError(error);
      return;
    }
    setOthers((list) => [...list, newPerson.trim()]);
    setNewPerson('');
  }

  async function handleCreate() {
    const found = collectErrors({
      name: validateTripName(name),
      startDate: validateStartDate(startDate),
      endDate: validateEndDate(startDate, endDate),
    });
    setErrors(found);

    // Include a name typed in "Add a name" but not yet added with +.
    let otherNames = others;
    if (newPerson.trim() && !full) {
      const error = validateParticipantName(newPerson, [creatorName, ...others]);
      if (error) {
        setPersonError(error);
        return;
      }
      otherNames = [...others, newPerson.trim()];
      setOthers(otherNames);
      setNewPerson('');
    }
    if (Object.keys(found).length) return;

    setSubmitting(true);
    try {
      requireOnline('createTrip');
      const tripId = await createTrip({
        uid: user.uid,
        creatorName,
        name,
        startDate,
        endDate,
        otherNames,
      });
      // Land on Members so the Trip ID is right there to share.
      router.replace(`/trips/${tripId}/members`);
    } catch (error) {
      setErrors({ form: describeError(error).message });
      setSubmitting(false);
    }
  }

  return (
    <Screen form>
      <ScreenHeader title="New trip" back />

      <FormField
        label="Trip name"
        value={name}
        onChangeText={(text) => {
          setName(text);
          setErrors((e) => ({ ...e, name: undefined, form: undefined }));
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

      <Text variant="labelMedium" style={[styles.section, { color: theme.app.muted }]}>
        Who’s going? · {total} of {MAX_PARTICIPANTS}
      </Text>

      <View
        style={[styles.person, { backgroundColor: theme.app.card, borderColor: theme.app.border }]}
      >
        <Avatar name={creatorName} />
        <Text style={styles.grow}>
          {creatorName} <Text style={{ color: theme.app.muted }}>· You</Text>
        </Text>
        <Text variant="bodySmall" style={{ color: theme.app.muted }}>
          Creator
        </Text>
      </View>

      {others.map((person) => (
        <View
          key={person.toLowerCase()}
          style={[
            styles.person,
            { backgroundColor: theme.app.card, borderColor: theme.app.border },
          ]}
        >
          <Avatar name={person} />
          <Text style={styles.grow}>{person}</Text>
          <IconButton
            icon="close"
            size={18}
            accessibilityLabel={`Remove ${person}`}
            onPress={() => setOthers((list) => list.filter((p) => p !== person))}
            style={styles.removeButton}
          />
        </View>
      ))}

      {full ? (
        <Text variant="bodySmall" style={[styles.full, { color: theme.app.muted }]}>
          A trip can have up to {MAX_PARTICIPANTS} people.
        </Text>
      ) : (
        <View style={styles.addRow}>
          <TextInput
            mode="outlined"
            label="Add a name"
            value={newPerson}
            onChangeText={(text) => {
              setNewPerson(text);
              setPersonError(null);
            }}
            error={Boolean(personError)}
            autoCapitalize="words"
            maxLength={60}
            onSubmitEditing={addPerson}
            submitBehavior="submit"
            right={
              <TextInput.Icon icon="plus" accessibilityLabel="Add person" onPress={addPerson} />
            }
          />
          {personError ? (
            <HelperText type="error" padding="none">
              {personError}
            </HelperText>
          ) : null}
        </View>
      )}

      <View style={styles.footer}>
        <FormMessage message={errors.form} />
        <Button mode="contained" onPress={handleCreate} loading={submitting} disabled={submitting}>
          Create trip
        </Button>
        <Text variant="bodySmall" style={[styles.hint, { color: theme.app.muted }]}>
          Needs internet to reserve the Trip ID
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1 },
  section: { marginTop: 4, marginBottom: 8 },
  person: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 48,
    marginBottom: 8,
  },
  removeButton: { margin: 0 },
  addRow: { marginBottom: 12 },
  full: { marginBottom: 12 },
  footer: { marginTop: 'auto', paddingTop: 12 },
  hint: { textAlign: 'center', marginTop: 6 },
});
