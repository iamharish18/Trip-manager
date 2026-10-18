import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { Button, Text } from 'react-native-paper';

import FormField from '@/components/FormField';
import FormMessage from '@/components/FormMessage';
import Screen from '@/components/Screen';
import ScreenHeader from '@/components/ScreenHeader';
import { describeError } from '@/logic/errors';
import { validateEmail } from '@/logic/validation';
import { requestPasswordReset } from '@/services/auth';

const SENT_MESSAGE =
  'If an account exists for that email, a reset link is on its way. Check your inbox and spam folder.';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState({});
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSend() {
    const emailError = validateEmail(email);
    setErrors(emailError ? { email: emailError } : {});
    if (emailError) return;

    setSubmitting(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (error) {
      const { field, message } = describeError(error);
      setErrors({ [field ?? 'form']: message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen form>
      <ScreenHeader title="Reset password" back />

      <Text style={styles.intro}>
        Enter your account email. We’ll send you a link to set a new password.
      </Text>

      <FormField
        label="Email"
        value={email}
        onChangeText={(text) => {
          setEmail(text);
          setSent(false);
          setErrors({});
        }}
        error={errors.email}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        onSubmitEditing={handleSend}
      />

      <FormMessage message={errors.form} />

      <Button mode="contained" onPress={handleSend} loading={submitting} disabled={submitting}>
        Send reset link
      </Button>

      {sent && <FormMessage type="info" message={SENT_MESSAGE} style={styles.sent} />}

      <Button mode="text" onPress={() => router.back()} style={styles.back}>
        Back to log in
      </Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { marginBottom: 16 },
  sent: { marginTop: 16 },
  back: { marginTop: 'auto' },
});
