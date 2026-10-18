// Root of the app: theme, session, and which screens are reachable.
// Logged-out users can only reach (auth) screens; logged-in users only (app).

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { PaperProvider } from 'react-native-paper';

import LoadingScreen from '@/components/LoadingScreen';
import { SessionProvider, useSession } from '@/state/session';
import { useAppThemeForScheme } from '@/theme';

function RootNavigator() {
  const { isLoading, user } = useSession();

  if (isLoading) return <LoadingScreen />;

  const isLoggedIn = Boolean(user);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={isLoggedIn}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!isLoggedIn}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const theme = useAppThemeForScheme();

  return (
    <PaperProvider theme={theme}>
      <SessionProvider>
        <RootNavigator />
      </SessionProvider>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
    </PaperProvider>
  );
}
