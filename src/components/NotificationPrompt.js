import { StyleSheet, View } from 'react-native';
import { Button, Icon, Text } from 'react-native-paper';

import { useNotifications } from '@/state/notifications';
import { useAppTheme } from '@/theme';

// Home card asking to allow notifications, shown until answered (SPEC §11).
export default function NotificationPrompt() {
  const theme = useAppTheme();
  const { shouldPrompt, enable, dismissPrompt } = useNotifications();
  if (!shouldPrompt) return null;

  return (
    <View style={[styles.card, { backgroundColor: theme.app.primaryTint }]}>
      <View style={styles.row}>
        <Icon source="bell-outline" size={22} color={theme.app.primary} />
        <Text style={styles.text}>Get notified when friends add expenses.</Text>
      </View>
      <View style={styles.actions}>
        <Button compact onPress={dismissPrompt}>
          Not now
        </Button>
        <Button compact mode="contained" onPress={() => enable().catch(() => {})}>
          Allow
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, padding: 12, marginBottom: 12, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  text: { flex: 1 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
});
