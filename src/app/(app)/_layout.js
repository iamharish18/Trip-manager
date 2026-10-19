import { Stack } from 'expo-router';

import { NotificationsProvider } from '@/state/notifications';
import { SyncProvider } from '@/state/sync';

export const unstable_settings = {
  anchor: 'home',
};

export default function AppLayout() {
  return (
    <SyncProvider>
      <NotificationsProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </NotificationsProvider>
    </SyncProvider>
  );
}
