import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';

import FormField from '@/components/FormField';
import FormMessage from '@/components/FormMessage';
import Screen from '@/components/Screen';
import ScreenHeader from '@/components/ScreenHeader';
import { describeError } from '@/logic/errors';
import {
  collectErrors,
  validateEmail,
  validateName,
  validateNewPassword,
} from '@/logic/validation';
import { signUp } from '@/services/auth';
import { useAppTheme } from '@/theme';

export default function SignUpScreen() {
  const theme = useAppTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  function clearError(field) {
    setErrors((e) => ({ ...e, [field]: undefined, form: undefined }));
  }

  async function handleSignUp() {
    const found = collectErrors({
      name: validateName(name),
      email: validateEmail(email),
      password: validateNewPassword(password),
    });
    setErrors(found);
    if (Object.keys(found).length) return;

    setSubmitting(true);
    try {
      await signUp({ name, email, password });
      // The session switches to Home automatically.
    } catch (error) {
      const { field, message } = describeError(error);
      setErrors({ [field ?? 'form']: message });
      setSubmitting(false);
    }
  }

  return (
    <Screen form>
      <ScreenHeader title="Create your account" back />

      <FormField
        label="Your name"
        value={name}
        onChangeText={(text) => {
          setName(text);
          clearError('name');
        }}
        error={errors.name}
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        maxLength={60}
      />
      <FormField
        label="Email"
        value={email}
        onChangeText={(text) => {
          setEmail(text);
          clearError('email');
        }}
        error={errors.email}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
      />
      <FormField
        label="Password"
        secure
        value={password}
        onChangeText={(text) => {
          setPassword(text);
          clearError('password');
        }}
        error={errors.password}
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        onSubmitEditing={handleSignUp}
      />

      <FormMessage message={errors.form} />

      <Button mode="contained" onPress={handleSignUp} loading={submitting} disabled={submitting}>
        Create account
      </Button>

      <View style={styles.switchRow}>
        <Text style={{ color: theme.app.muted }}>Already have an account?</Text>
        <Link href="/login" asChild>
          <Button mode="text" compact>
            Log in
          </Button>
        </Link>
      </View>

      <Text variant="bodySmall" style={[styles.note, { color: theme.app.muted }]}>
        Your password is handled by Firebase and never stored by the app.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  note: { textAlign: 'center', marginTop: 'auto', paddingTop: 24 },
});
