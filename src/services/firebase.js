// Single place where the app gets its Firebase instances.
// Firestore offline persistence is on by default in React Native Firebase.

import { getApp } from '@react-native-firebase/app';
import { getAuth } from '@react-native-firebase/auth';
import { getFirestore } from '@react-native-firebase/firestore';

const app = getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);

// Listener options that also report when changes reach the server, so each
// item can say whether it's still waiting to upload (`pending`).
export const WITH_PENDING = { includeMetadataChanges: true };

// A document as { id, ...data, pending }.
export function withPending(snapshot) {
  return { id: snapshot.id, ...snapshot.data(), pending: snapshot.metadata.hasPendingWrites };
}

// `exists` is a method in the modular API but a property in older versions.
export function docExists(snapshot) {
  return typeof snapshot.exists === 'function' ? snapshot.exists() : Boolean(snapshot.exists);
}
