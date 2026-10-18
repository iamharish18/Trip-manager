import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { useAppTheme } from '@/theme';

const LABELS = { active: 'Active', reopened: 'Reopened', closed: 'Closed', final: 'Closed' };

// Trip status pill: green while open, grey once closed.
export default function StatusBadge({ status }) {
  const theme = useAppTheme();
  const open = status === 'active' || status === 'reopened';
  return (
    <View
      style={[styles.badge, { borderColor: theme.app.border, backgroundColor: theme.app.card }]}
    >
      <Text variant="labelSmall" style={{ color: open ? theme.app.positive : theme.app.muted }}>
        {LABELS[status] ?? status}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
});
