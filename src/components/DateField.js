// A date input that opens a calendar. Values are "YYYY-MM-DD" strings.
// With `optional`, an × clears the date.

import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { HelperText, IconButton, TextInput } from 'react-native-paper';
import { DatePickerModal, enGB, registerTranslation } from 'react-native-paper-dates';

import { formatDate, fromIsoDate, toIsoDate } from '@/logic/dates';

// British English gives dd/mm order and weeks starting on Monday.
registerTranslation('en-GB', enGB);

export default function DateField({ label, value, onChange, optional = false, minDate, error }) {
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.field}>
      <View style={styles.row}>
        <Pressable
          style={styles.grow}
          onPress={() => setOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${value ? formatDate(value) : 'not set'}`}
        >
          <View pointerEvents="none">
            <TextInput
              mode="outlined"
              label={label}
              value={value ? formatDate(value) : ''}
              placeholder="Not set"
              editable={false}
              error={Boolean(error)}
              right={<TextInput.Icon icon="calendar-blank-outline" />}
            />
          </View>
        </Pressable>
        {optional && value ? (
          <IconButton
            icon="close"
            accessibilityLabel={`Clear ${label.toLowerCase()}`}
            onPress={() => onChange(null)}
          />
        ) : null}
      </View>
      {error ? (
        <HelperText type="error" padding="none">
          {error}
        </HelperText>
      ) : null}

      <DatePickerModal
        locale="en-GB"
        mode="single"
        label={label}
        visible={open}
        date={value ? fromIsoDate(value) : (fromIsoDate(minDate) ?? new Date())}
        validRange={minDate ? { startDate: fromIsoDate(minDate) } : undefined}
        onDismiss={() => setOpen(false)}
        onConfirm={({ date }) => {
          setOpen(false);
          if (date) onChange(toIsoDate(date));
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center' },
  grow: { flex: 1 },
});
