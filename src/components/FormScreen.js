import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ScreenHeader from '@/components/ScreenHeader';
import { useAppTheme } from '@/theme';

// A screen with a padded header and a body that manages its own scrolling.
export default function FormScreen({ title, right = null, children }) {
  const theme = useAppTheme();
  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: theme.app.background }]}>
      <View style={styles.header}>
        <ScreenHeader title={title} back right={right} />
      </View>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 16 },
});
