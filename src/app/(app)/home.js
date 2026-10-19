// Home: your trips, plus Create trip and Join trip.

import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Icon, Text } from 'react-native-paper';

import Avatar from '@/components/Avatar';
import OfflineBanner from '@/components/OfflineBanner';
import Screen from '@/components/Screen';
import ScreenHeader from '@/components/ScreenHeader';
import TripCard from '@/components/TripCard';
import { sortTrips } from '@/logic/trips';
import { deleteTrip } from '@/services/deleteTrip';
import { useSession } from '@/state/session';
import { useMyTrips } from '@/state/trips';
import { useAppTheme } from '@/theme';

// If a delete you started was interrupted (e.g. you went offline), finish
// it. Tried once per trip per visit; needs internet.
function useResumeDeletes(trips, uid) {
  const tried = useRef(new Set());
  useEffect(() => {
    for (const trip of trips) {
      if (!trip.deleting || trip.creatorUid !== uid || tried.current.has(trip.id)) continue;
      tried.current.add(trip.id);
      deleteTrip(trip.id, uid).catch(() => {});
    }
  }, [trips, uid]);
}

export default function HomeScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const { user, displayName } = useSession();
  const { trips: allTrips, isLoading } = useMyTrips();
  // Trips being deleted are hidden (SPEC §13).
  const trips = allTrips.filter((t) => !t.deleting);
  useResumeDeletes(allTrips, user?.uid);

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

      <OfflineBanner />

      {body}

      <View style={styles.actions}>
        <Button mode="contained" style={styles.action} onPress={() => router.push('/trips/new')}>
          Create trip
        </Button>
        <Button mode="outlined" style={styles.action} onPress={() => router.push('/join')}>
          Join trip
        </Button>
      </View>
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
