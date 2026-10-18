// Account actions (SPEC §3.1). Errors are Firebase errors with a `code`;
// screens turn them into messages with describeAuthError.

import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from '@react-native-firebase/auth';

import { auth } from './firebase';
import { createProfile } from './users';

export async function signUp({ name, email, password }) {
  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  const { user } = credential;
  await Promise.all([
    updateProfile(user, { displayName: name.trim() }),
    createProfile(user.uid, { name: name.trim(), email: user.email }),
  ]);
}

export function logIn({ email, password }) {
  return signInWithEmailAndPassword(auth, email.trim(), password);
}

export function logOut() {
  return signOut(auth);
}

// Succeeds the same way whether or not the email has an account, so the UI
// never reveals which emails are registered.
export async function requestPasswordReset(email) {
  try {
    await sendPasswordResetEmail(auth, email.trim());
  } catch (error) {
    if (error?.code !== 'auth/user-not-found') throw error;
  }
}

// Calls onChange with the Firebase user, or null when logged out.
export function subscribeToAuth(onChange) {
  return onAuthStateChanged(auth, onChange);
}
