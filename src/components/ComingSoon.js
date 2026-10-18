import { StyleSheet, View } from 'react-native';
import { Icon, Text } from 'react-native-paper';

import { useAppTheme } from '@/theme';

// Placeholder for a tab that a later milestone fills in.
export default function ComingSoon({ icon, title, message }) {
  const theme = useAppTheme();
  return (
    <View style={styles.center}>
      <View style={[styles.icon, { backgroundColor: theme.app.primaryTint }]}>
        <Icon source={icon} size={28} color={theme.app.primary} />
      </View>
      <Text variant="titleMedium">{title}</Text>
      <Text style={[styles.text, { color: theme.app.muted }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 },
  icon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  text: { textAlign: 'center', maxWidth: 240 },
});
