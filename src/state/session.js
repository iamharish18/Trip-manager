// Who is signed in, and their profile. Wrap the app in <SessionProvider>
// and read it anywhere with useSession().

import { createContext, useContext, useEffect, useState } from 'react';

import { subscribeToAuth } from '@/services/auth';
import { subscribeToProfile } from '@/services/users';

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  // undefined = Firebase is still restoring the saved session.
  const [user, setUser] = useState(undefined);
  const [profileState, setProfileState] = useState({ uid: null, data: null });

  useEffect(() => subscribeToAuth((nextUser) => setUser(nextUser ?? null)), []);

  const uid = user?.uid ?? null;

  useEffect(() => {
    if (!uid) return undefined;
    return subscribeToProfile(uid, (data) => setProfileState({ uid, data }));
  }, [uid]);

  // Ignore a profile left over from a previous user.
  const profile = profileState.uid === uid ? profileState.data : null;

  const value = {
    isLoading: user === undefined,
    user: user ?? null,
    profile,
    // Falls back to the auth display name until the profile has loaded.
    displayName: profile?.name ?? user?.displayName ?? '',
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const session = useContext(SessionContext);
  if (!session) throw new Error('useSession must be used inside <SessionProvider>');
  return session;
}
