// Are we connected to the server? (SPEC §12) Free and without a native
// network package: Firestore marks data that came only from this phone's
// cache, which is what happens when it can't reach the server.

import { doc, onSnapshot } from '@react-native-firebase/firestore';

import { WITH_PENDING, db } from './firebase';

// Calls onChange(true) while only cached data is available (offline), and
// onChange(false) once the server answers. Returns the unsubscribe function.
export function subscribeToConnection(uid, onChange) {
  return onSnapshot(
    doc(db, 'users', uid),
    WITH_PENDING,
    (snapshot) => onChange(snapshot.metadata.fromCache),
    () => onChange(true),
  );
}
