// M0 connection check: reads health/ping from Firestore. Removed in M1.

import { doc, getDoc } from '@react-native-firebase/firestore';

import { db } from './firebase';

export async function readHealthMessage() {
  const snapshot = await getDoc(doc(db, 'health', 'ping'));
  const data = snapshot.data();
  if (!data) {
    throw new Error('health/ping document not found');
  }
  return data.message;
}
