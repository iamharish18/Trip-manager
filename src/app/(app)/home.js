// Home: your trips, plus Create trip and Join trip.

import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Icon, Snackbar, Text } from 'react-native-paper';

import Avatar from '@/components/Avatar';
import Screen from '@/components/Screen';
import ScreenHeader from '@/components/ScreenHeader';
import TripCard from '@/components/TripCard';
import { sortTrips } from '@/logic/trips';
import { useSession } from '@/state/session';
import { useMyTrips } from '@/state/trips';
import { useAppTheme } from '@/theme';

export default function HomeScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const { displayName } = useSession();
  const { trips, isLoading } = useMyTrips();
  const [notice, setNotice] = useState('');

  let body;
  if (isLoading) {
    body = (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  } else if (trips.length === 0) {
    body = (
      <View style={styles.center}>
        <View style={[styles.emptyIcon, { backgroundColor: theme.app.primaryTint }]}>
          <Icon source="bag-suitcase-outline" size={34} color={theme.app.primary} />
        </View>
        <Text variant="titleMedium">Start your first trip</Text>
        <Text style={[styles.emptyText, { color: theme.app.muted }]}>
          Create a trip and add friends, or join one with a Trip ID.
        </Text>
      </View>
    );
  } else {
    body = (
      <FlatList
        style={styles.list}
        data={sortTrips(trips)}
        keyExtractor={(trip) => trip.id}
        renderItem={({ item }) => (
          <TripCard trip={item} onPress={() => router.push(`/trips/${item.id}`)} />
        )}
      />
    );
  }

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

      {body}

      <View style={styles.actions}>
        <Button mode="contained" style={styles.action} onPress={() => router.push('/trips/new')}>
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyText: { textAlign: 'center', maxWidth: 240 },
  list: { flex: 1, marginBottom: 8 },
  actions: { flexDirection: 'row', gap: 8 },
  action: { flex: 1 },
});
