// Home: the user's trips. Until M2 there are none, so this is the empty state.

import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, Icon, Snackbar, Text } from 'react-native-paper';

import Avatar from '@/components/Avatar';
import Screen from '@/components/Screen';
import ScreenHeader from '@/components/ScreenHeader';
import { useSession } from '@/state/session';
import { useAppTheme } from '@/theme';

export default function HomeScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const { displayName } = useSession();
  const [notice, setNotice] = useState('');

  return (
    <Screen>
      <ScreenHeader
        title="Your trips"
        right={
          <Pressable
            onPress={() => router.push('/account')}
            accessibilityRole="button"
            accessibilityLabel="Account"
            hitSlop={8}
          >
            <Avatar name={displayName} size={34} />
          </Pressable>
        }
      />

      <View style={styles.empty}>
        <View style={[styles.emptyIcon, { backgroundColor: theme.app.primaryTint }]}>
          <Icon source="bag-suitcase-outline" size={34} color={theme.app.primary} />
        </View>
        <Text variant="titleMedium">Start your first trip</Text>
        <Text style={[styles.emptyText, { color: theme.app.muted }]}>
          Create a trip and add friends, or join one with a Trip ID.
        </Text>
      </View>

      <View style={styles.actions}>
        <Button
          mode="contained"
          style={styles.action}
          onPress={() => setNotice('Creating trips is coming soon.')}
        >
          Create trip
        </Button>
        <Button
          mode="outlined"
          style={styles.action}
          onPress={() => setNotice('Joining trips is coming soon.')}
        >
          Join trip
        </Button>
      </View>

      <Snackbar visible={Boolean(notice)} onDismiss={() => setNotice('')} duration={2500}>
        {notice}
      </Snackbar>
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyText: { textAlign: 'center', maxWidth: 240 },
  actions: { flexDirection: 'row', gap: 8 },
  action: { flex: 1 },
});
