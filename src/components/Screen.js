// Page wrapper: safe areas, background color, and (for forms) a scroll view
// that keeps inputs visible above the keyboard.

import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppTheme } from '@/theme';

export default function Screen({ children, form = false, style }) {
  const theme = useAppTheme();
  const background = { backgroundColor: theme.app.background };

  if (!form) {
    return (
      <SafeAreaView style={[styles.fill, background]}>
        <View style={[styles.fill, styles.padding, style]}>{children}</View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.fill, background]}>
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.grow, styles.padding, style]}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  grow: { flexGrow: 1 },
  padding: { padding: 16 },
});
