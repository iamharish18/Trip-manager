import { StyleSheet, View } from 'react-native';
import { Icon, Text } from 'react-native-paper';

import { useSync } from '@/state/sync';
import { useAppTheme } from '@/theme';

// "You're offline · changes will sync later" (SPEC §12).
export default function OfflineBanner({ style }) {
  const theme = useAppTheme();
  const { offline } = useSync();
  if (!offline) return null;
  return (
    <View
      style={[
        styles.banner,
        { backgroundColor: theme.app.card, borderColor: theme.app.border },
        style,
      ]}
      accessibilityLiveRegion="polite"
    >
      <Icon source="cloud-off-outline" size={16} color={theme.app.muted} />
      <Text variant="bodySmall" style={{ color: theme.app.muted }}>
        You’re offline · changes will sync later
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 8,
  },
});
