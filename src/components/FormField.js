// Outlined text input with its error message underneath.
// Pass `secure` for passwords: adds a show/hide eye icon.

import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { HelperText, TextInput } from 'react-native-paper';

export default function FormField({ label, error, secure = false, ...inputProps }) {
  const [hidden, setHidden] = useState(true);

  return (
    <View style={styles.field}>
      <TextInput
        mode="outlined"
        label={label}
        error={Boolean(error)}
        secureTextEntry={secure && hidden}
        right={
          secure ? (
            <TextInput.Icon
              icon={hidden ? 'eye-outline' : 'eye-off-outline'}
              accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
              onPress={() => setHidden((value) => !value)}
            />
          ) : undefined
        }
        {...inputProps}
      />
      {error ? (
        <HelperText type="error" padding="none">
          {error}
        </HelperText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: 12 },
});
