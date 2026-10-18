// Everything under one trip shares its live data through TripProvider.

import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';

import LoadingScreen from '@/components/LoadingScreen';
import Screen from '@/components/Screen';
import { TripProvider, useTrip } from '@/state/trips';
import { useAppTheme } from '@/theme';

function TripGate() {
  const theme = useAppTheme();
  const router = useRouter();
  const { isLoading, notFound } = useTrip();

  if (isLoading) return <LoadingScreen />;

  if (notFound) {
    return (
      <Screen>
        <View style={styles.center}>
          <Text variant="titleMedium">Trip not available</Text>
          <Text style={[styles.text, { color: theme.app.muted }]}>
            It may have been deleted, or you’re no longer a member.
          </Text>
          <Button mode="contained" onPress={() => router.replace('/home')}>
            Go to your trips
          </Button>
        </View>
      </Screen>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function TripLayout() {
  const { tripId } = useLocalSearchParams();
  return (
    <TripProvider tripId={tripId}>
      <TripGate />
    </TripProvider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  text: { textAlign: 'center', maxWidth: 260 },
});
