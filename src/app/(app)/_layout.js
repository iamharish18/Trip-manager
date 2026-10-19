import { Stack } from 'expo-router';

import { NotificationsProvider } from '@/state/notifications';

export const unstable_settings = {
  anchor: 'home',
};

export default function AppLayout() {
  return (
    <NotificationsProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </NotificationsProvider>
  );
}
