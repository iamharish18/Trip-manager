// Reads and writes the signed-in user's profile at users/{uid} (SPEC §3.1).

import {
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from '@react-native-firebase/firestore';

import { db } from './firebase';

function profileRef(uid) {
  return doc(db, 'users', uid);
}

export function createProfile(uid, { name, email }) {
  return setDoc(profileRef(uid), { name, email, createdAt: serverTimestamp() });
}

// Resolves when the server confirms. The local cache (and every listener)
// updates immediately, so callers don't need to wait for it.
export function updateProfileName(uid, name) {
  return updateDoc(profileRef(uid), { name });
}

// Calls onChange with the profile data, or null if missing or unreadable.
// Returns the unsubscribe function.
export function subscribeToProfile(uid, onChange) {
  return onSnapshot(
    profileRef(uid),
    (snapshot) => onChange(snapshot.data() ?? null),
    () => onChange(null),
  );
}
