// Notifications for the signed-in user (SPEC §11): permission, saving this
// phone's push address on your trips, sending notifications that are still
// pending, and opening the right expense when a notification is tapped.

import { useRouter } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { notificationRoute } from '@/logic/notifications';
import {
  catchUpNotifications,
  configureNotificationDisplay,
  getPermission,
  getPushToken,
  listenForTaps,
  removeTokenFromTrips,
  requestPermission,
  saveTokenToTrips,
} from '@/services/notifications';
import { setNotificationsOff } from '@/services/users';
import { useSession } from '@/state/session';
import { useMyTrips } from '@/state/trips';

configureNotificationDisplay();

const NotificationsContext = createContext(null);

// Runs `callback` now and whenever the app comes back to the foreground.
function useOnForeground(callback) {
  useEffect(() => {
    callback();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') callback();
    });
    return () => subscription.remove();
  }, [callback]);
}

export function NotificationsProvider({ children }) {
  const router = useRouter();
  const { user, profile } = useSession();
  const { trips, isLoading: tripsLoading } = useMyTrips();
  const [permission, setPermission] = useState(null); // { status, canAskAgain }
  const [promptDismissed, setPromptDismissed] = useState(false);

  const uid = user?.uid;
  const muted = Boolean(profile?.notificationsOff);
  const tripIdsKey = trips
    .map((t) => t.id)
    .sort()
    .join(',');

  const refreshPermission = useCallback(() => {
    getPermission()
      .then(setPermission)
      .catch(() => {});
  }, []);
  useOnForeground(refreshPermission);

  // Save this phone's push address on every trip you belong to.
  useEffect(() => {
    if (!uid || muted || permission?.status !== 'granted' || !tripIdsKey) return;
    let cancelled = false;
    getPushToken()
      .then((token) => {
        if (!cancelled) return saveTokenToTrips(uid, token, tripIdsKey.split(','));
        return undefined;
      })
      .catch(() => {}); // Offline: tried again next time the app opens.
    return () => {
      cancelled = true;
    };
  }, [uid, muted, permission?.status, tripIdsKey]);

  // Send notifications still pending for expenses you added.
  const catchUp = useCallback(() => {
    if (!uid || tripsLoading || !tripIdsKey) return;
    catchUpNotifications(uid, tripIdsKey.split(',')).catch(() => {});
  }, [uid, tripsLoading, tripIdsKey]);
  useOnForeground(catchUp);

  // Tapping a notification opens its expense.
  useEffect(
    () =>
      listenForTaps((data) => {
        const route = notificationRoute(data);
        if (route) router.push(route);
      }),
    [router],
  );

  async function enable() {
    const result = await requestPermission();
    setPermission(result);
    if (result.status === 'granted' && muted) await setNotificationsOff(uid, false);
    return result;
  }

  // Removes this phone's push address from your trips.
  async function forgetThisPhone() {
    if (tripIdsKey) await removeTokenFromTrips(uid, tripIdsKey.split(',')).catch(() => {});
  }

  async function disable() {
    setNotificationsOff(uid, true).catch(() => {});
    await forgetThisPhone();
  }

  const value = {
    permission,
    muted,
    // On means: Android allows it and you haven't switched it off.
    isOn: permission?.status === 'granted' && !muted,
    // Show the "Get notified" card on Home?
    shouldPrompt: permission?.status === 'undetermined' && !muted && !promptDismissed,
    dismissPrompt: () => setPromptDismissed(true),
    enable,
    disable,
    // Before logging out, so the next account on this phone doesn't get yours.
    forgetThisPhone,
  };

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const value = useContext(NotificationsContext);
  if (!value) throw new Error('useNotifications must be used inside <NotificationsProvider>');
  return value;
}
