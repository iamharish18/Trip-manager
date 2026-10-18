import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { useAppTheme } from '@/theme';

// Circle with the first letter of a name.
export default function Avatar({ name, size = 32 }) {
  const theme = useAppTheme();
  const initial = (name ?? '').trim().charAt(0).toUpperCase() || '?';
  return (
    <View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: theme.app.primaryTint,
        },
      ]}
    >
      <Text style={{ color: theme.app.primary, fontSize: size * 0.4, fontWeight: '500' }}>
        {initial}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
});
