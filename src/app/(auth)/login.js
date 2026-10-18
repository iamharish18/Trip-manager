import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Icon, Text } from 'react-native-paper';

import FormField from '@/components/FormField';
import FormMessage from '@/components/FormMessage';
import Screen from '@/components/Screen';
import { describeError } from '@/logic/errors';
import { collectErrors, validateEmail, validateLoginPassword } from '@/logic/validation';
import { logIn } from '@/services/auth';
import { useAppTheme } from '@/theme';

export default function LoginScreen() {
  const theme = useAppTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  async function handleLogIn() {
    const found = collectErrors({
      email: validateEmail(email),
      password: validateLoginPassword(password),
    });
    setErrors(found);
    if (Object.keys(found).length) return;

    setSubmitting(true);
    try {
      await logIn({ email, password });
      // The session switches to Home automatically.
    } catch (error) {
      const { field, message } = describeError(error);
      setErrors({ [field ?? 'form']: message });
      setSubmitting(false);
    }
  }

  return (
    <Screen form>
      <View style={styles.brand}>
        <View style={[styles.logo, { backgroundColor: theme.app.primary }]}>
          <Icon source="bag-suitcase-outline" size={30} color={theme.app.onPrimary} />
        </View>
        <Text variant="headlineSmall">Trip Manager</Text>
        <Text style={{ color: theme.app.muted }}>Split trip costs with friends</Text>
      </View>

      <FormField
        label="Email"
        value={email}
        onChangeText={(text) => {
          setEmail(text);
          setErrors((e) => ({ ...e, email: undefined, form: undefined }));
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
          setErrors((e) => ({ ...e, password: undefined, form: undefined }));
        }}
        error={errors.password}
        autoCapitalize="none"
        autoComplete="current-password"
        textContentType="password"
        onSubmitEditing={handleLogIn}
      />

      <Link href="/forgot-password" asChild>
        <Button mode="text" compact style={styles.forgot}>
          Forgot password?
        </Button>
      </Link>

      <FormMessage message={errors.form} />

      <Button mode="contained" onPress={handleLogIn} loading={submitting} disabled={submitting}>
        Log in
      </Button>

      <View style={styles.switchRow}>
        <Text style={{ color: theme.app.muted }}>New here?</Text>
        <Link href="/signup" asChild>
          <Button mode="text" compact>
            Create an account
          </Button>
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brand: { alignItems: 'center', gap: 6, marginTop: 48, marginBottom: 32 },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  forgot: { alignSelf: 'flex-end', marginTop: -4, marginBottom: 12 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
});
