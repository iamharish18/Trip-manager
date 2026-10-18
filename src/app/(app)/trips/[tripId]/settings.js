// Trip settings: edit the name and dates (creator only) and manage categories.
// Close, reopen, delete, leave and export arrive in later milestones.

import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, Icon, Text } from 'react-native-paper';

import DateField from '@/components/DateField';
import FormField from '@/components/FormField';
import Screen from '@/components/Screen';
import ScreenHeader from '@/components/ScreenHeader';
import { formatTripDates } from '@/logic/dates';
import {
  collectErrors,
  validateEndDate,
  validateStartDate,
  validateTripName,
} from '@/logic/validation';
import { updateTripDetails } from '@/services/trips';
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

export default function TripSettingsScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const { trip, tripId, isCreator, isOpen } = useTrip();

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

    // Applies to the local cache at once, also offline. The rules match the
    // checks above, so the server has no reason to reject it.
    updateTripDetails(tripId, { name, startDate, endDate }).catch(() => {});
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
        <InfoNote>
          {isCreator
            ? 'This trip is closed, so its name and dates can’t be changed.'
            : 'Only the trip’s creator can change its name and dates.'}
        </InfoNote>
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

      <InfoNote>Close trip, export PDF and delete trip arrive in later updates.</InfoNote>

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
  pressed: { opacity: 0.7 },
});
