// Connection status and change failures for the signed-in app (SPEC §12):
// whether we're offline, an app-wide message when the server rejects a
// change, and a check for actions that need internet.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Snackbar } from 'react-native-paper';

import { failureMessage, offlineError } from '@/logic/sync';
import { subscribeToConnection } from '@/services/connection';
import { useSession } from '@/state/session';

const SyncContext = createContext(null);

// Ignore the moment at app start when data comes from the phone before the
// server answers: only call it offline after a few seconds.
const OFFLINE_AFTER_MS = 3000;

export function SyncProvider({ children }) {
  const { user } = useSession();
  const uid = user?.uid;
  const [fromCache, setFromCache] = useState(false);
  const [offline, setOffline] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!uid) return undefined;
    return subscribeToConnection(uid, setFromCache);
  }, [uid]);

  useEffect(() => {
    if (!fromCache) {
      const timer = setTimeout(() => setOffline(false), 0);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => setOffline(true), OFFLINE_AFTER_MS);
    return () => clearTimeout(timer);
  }, [fromCache]);

  /**
   * Reports a change the server rejected, e.g.
   * trackWrite(promise, 'Your expense “Dinner”', () => tripIsLocked).
   * Returns the promise with the failure handled.
   */
  const trackWrite = useCallback((promise, what, isTripLocked) => {
    return Promise.resolve(promise).catch((error) => {
      setNotice(failureMessage(what, error, { tripLocked: Boolean(isTripLocked?.()) }));
    });
  }, []);

  // Throws an "offline" error for actions that need internet.
  const requireOnline = useCallback(
    (action) => {
      if (offline) throw offlineError(action);
    },
    [offline],
  );

  const value = useMemo(
    // showMessage: a short app-wide message at the bottom of the screen.
    () => ({ offline, trackWrite, requireOnline, showMessage: setNotice }),
    [offline, trackWrite, requireOnline],
  );

  return (
    <SyncContext.Provider value={value}>
      <View style={styles.fill}>
        {children}
        <Snackbar visible={Boolean(notice)} onDismiss={() => setNotice('')} duration={5000}>
          {notice}
        </Snackbar>
      </View>
    </SyncContext.Provider>
  );
}

export function useSync() {
  const value = useContext(SyncContext);
  if (!value) throw new Error('useSync must be used inside <SyncProvider>');
  return value;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
