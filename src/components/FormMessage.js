import { StyleSheet, View } from 'react-native';
import { Icon, Text } from 'react-native-paper';

import { useAppTheme } from '@/theme';

// A message box for a whole form: an error, or a confirmation ("info").
export default function FormMessage({ message, type = 'error', style }) {
  const theme = useAppTheme();
  if (!message) return null;

  const isError = type === 'error';
  const color = isError ? theme.app.negative : theme.app.primary;

  return (
    <View
      style={[
        styles.box,
        isError
          ? { borderColor: theme.app.negative, borderWidth: StyleSheet.hairlineWidth }
          : { backgroundColor: theme.app.primaryTint },
        style,
      ]}
      accessibilityLiveRegion="polite"
    >
      <Icon
        source={isError ? 'alert-circle-outline' : 'email-check-outline'}
        size={20}
        color={color}
      />
      <Text style={[styles.text, isError && { color }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  text: { flex: 1 },
});
