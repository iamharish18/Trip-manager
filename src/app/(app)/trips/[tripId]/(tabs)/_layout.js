// Trip screen: header with name, dates and settings, then the four tabs.

import { Tabs, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Icon, IconButton, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { formatTripDates } from '@/logic/dates';
import { formatTimeLeft, peopleLabel } from '@/logic/trips';
import { useTrip } from '@/state/trips';
import { useAppTheme } from '@/theme';

function TripHeader() {
  const theme = useAppTheme();
  const router = useRouter();
  const { trip, tripId, participants } = useTrip();

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/home');
  }

  return (
    <View style={styles.header}>
      <IconButton
        icon="arrow-left"
        accessibilityLabel="Back"
        onPress={goBack}
        style={styles.back}
      />
      <View style={styles.titles}>
        <Text variant="titleLarge" numberOfLines={1}>
          {trip.name}
        </Text>
        <Text variant="bodySmall" style={{ color: theme.app.muted }} numberOfLines={1}>
          {formatTripDates(trip.startDate, trip.endDate)} · {peopleLabel(participants.length)}
        </Text>
      </View>
      <IconButton
        icon="cog-outline"
        accessibilityLabel="Trip settings"
        onPress={() => router.push(`/trips/${tripId}/settings`)}
      />
    </View>
  );
}

// While reopened: "Reopened · locks again in 23 h 12 m" (SPEC §9).
function ReopenedBanner() {
  const theme = useAppTheme();
  const { isOpen, trip, reopenEndsAt, now } = useTrip();
  if (trip.status !== 'reopened' || !isOpen) return null;
  const left = reopenEndsAt === null ? null : reopenEndsAt - now;
  return (
    <View style={[styles.banner, { backgroundColor: theme.app.primaryTint }]}>
      <Icon source="lock-open-variant-outline" size={18} color={theme.app.primary} />
      <Text variant="bodySmall" style={styles.titles}>
        Reopened
        {left === null ? '' : ` · locks again in ${formatTimeLeft(left)}`}
      </Text>
    </View>
  );
}

const tabIcon = (name) =>
  function TabIcon({ color, size }) {
    return <Icon source={name} color={color} size={size} />;
  };

export default function TripTabsLayout() {
  const theme = useAppTheme();
  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: theme.app.background }]} edges={['top']}>
      <TripHeader />
      <ReopenedBanner />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: theme.app.primary,
          tabBarInactiveTintColor: theme.app.muted,
          tabBarStyle: { backgroundColor: theme.app.card, borderTopColor: theme.app.border },
          sceneStyle: { backgroundColor: theme.app.background },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{ title: 'Expenses', tabBarIcon: tabIcon('receipt-text-outline') }}
        />
        <Tabs.Screen
          name="balances"
          options={{ title: 'Balances', tabBarIcon: tabIcon('scale-balance') }}
        />
        <Tabs.Screen
          name="insights"
          options={{ title: 'Insights', tabBarIcon: tabIcon('chart-donut') }}
        />
        <Tabs.Screen
          name="members"
          options={{ title: 'Members', tabBarIcon: tabIcon('account-group-outline') }}
        />
      </Tabs>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingBottom: 4 },
  back: { marginRight: 0 },
  titles: { flex: 1, minWidth: 0 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 4,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
});
