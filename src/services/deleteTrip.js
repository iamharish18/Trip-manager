// Deleting a trip (creator, SPEC §13) without a server: mark it as being
// deleted, notify the members, remove everything inside it, then the trip
// and its Trip ID. If interrupted, calling it again resumes. Needs internet.

import {
  collection,
  doc,
  getDocFromServer,
  getDocsFromServer,
  updateDoc,
  writeBatch,
} from '@react-native-firebase/firestore';

import { db, docExists } from './firebase';
import { notifyTripEvent } from './notifications';

const SUBCOLLECTIONS = [
  'comments',
  'expenses',
  'categories',
  'settlements',
  'pushTokens',
  'participants',
];
const BATCH_SIZE = 400; // Firestore allows up to 500 writes per batch.

async function deleteAll(refs) {
  for (let i = 0; i < refs.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    for (const ref of refs.slice(i, i + BATCH_SIZE)) batch.delete(ref);
    await batch.commit();
  }
}

// `onMarked` is called once the trip is safely marked as being deleted;
// from then on, an interrupted delete is finished later (see Home).
export async function deleteTrip(tripId, uid, { onMarked } = {}) {
  const tripRef = doc(db, 'trips', tripId);
  const snap = await getDocFromServer(tripRef);
  if (!docExists(snap)) return; // Already gone.
  const trip = snap.data();

  if (!trip.deleting) {
    await updateDoc(tripRef, { deleting: true });
    onMarked?.();
    // Tell the others while their push addresses still exist.
    await notifyTripEvent(tripId, uid, 'deleted').catch(() => {});
  } else {
    onMarked?.();
  }

  for (const name of SUBCOLLECTIONS) {
    const docs = await getDocsFromServer(collection(db, 'trips', tripId, name));
    await deleteAll(docs.docs.map((d) => d.ref));
  }

  const last = writeBatch(db);
  last.delete(doc(db, 'joinCodes', trip.joinCode));
  last.delete(tripRef);
  await last.commit();
}
