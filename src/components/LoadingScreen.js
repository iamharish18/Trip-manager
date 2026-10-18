import { StyleSheet, View } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';

import { useAppTheme } from '@/theme';

// Shown while Firebase restores the saved session.
export default function LoadingScreen() {
  const theme = useAppTheme();
  return (
    <View style={[styles.container, { backgroundColor: theme.app.background }]}>
      <ActivityIndicator size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
