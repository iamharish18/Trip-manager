// Trips and their participants (SPEC §5, §14).

import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from '@react-native-firebase/firestore';

import { generateJoinCode } from '@/logic/joinCode';

import { WITH_PENDING, db, docExists, withPending } from './firebase';

const MAX_CODE_ATTEMPTS = 5;

const tripRef = (tripId) => doc(db, 'trips', tripId);
const participantsRef = (tripId) => collection(db, 'trips', tripId, 'participants');
const participantRef = (tripId, pid) => doc(db, 'trips', tripId, 'participants', pid);

/**
 * Creates a trip with its participants and reserves a unique Trip ID.
 * Runs as a transaction, so it needs internet (SPEC §12) and either
 * everything is saved or nothing is. Returns the new trip's id.
 */
export async function createTrip({ uid, creatorName, name, startDate, endDate, otherNames }) {
  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt += 1) {
    const code = generateJoinCode();
    const newTripRef = doc(collection(db, 'trips'));

    const created = await runTransaction(db, async (tx) => {
      const codeRef = doc(db, 'joinCodes', code);
      const existing = await tx.get(codeRef);
      if (docExists(existing)) return false;

      tx.set(newTripRef, {
        name: name.trim(),
        startDate,
        endDate: endDate ?? null,
        creatorUid: uid,
        memberUids: [uid],
        status: 'active',
        joinCode: code,
        createdAt: serverTimestamp(),
      });
      tx.set(codeRef, { tripId: newTripRef.id });

      const participants = [
        { name: creatorName.trim(), claimedByUid: uid },
        ...otherNames.map((other) => ({ name: other.trim(), claimedByUid: null })),
      ];
      for (const participant of participants) {
        tx.set(doc(participantsRef(newTripRef.id)), {
          ...participant,
          addedAt: serverTimestamp(),
        });
      }
      return true;
    });

    if (created) return newTripRef.id;
  }
  throw Object.assign(new Error('Could not reserve a Trip ID'), { code: 'trips/code-unavailable' });
}

// The writes below work offline: the local cache updates immediately and
// syncs later. Their promises resolve only once the server confirms.

export function updateTripDetails(tripId, { name, startDate, endDate }) {
  return updateDoc(tripRef(tripId), { name: name.trim(), startDate, endDate: endDate ?? null });
}

export function addParticipant(tripId, name) {
  return setDoc(doc(participantsRef(tripId)), {
    name: name.trim(),
    claimedByUid: null,
    addedAt: serverTimestamp(),
  });
}

export function renameParticipant(tripId, pid, name) {
  return updateDoc(participantRef(tripId, pid), { name: name.trim() });
}

export function removeParticipant(tripId, pid) {
  return deleteDoc(participantRef(tripId, pid));
}

// Listeners return their unsubscribe function. They read from the offline
// cache first, then keep up with the server.

export function subscribeToMyTrips(uid, onChange, onError) {
  const q = query(collection(db, 'trips'), where('memberUids', 'array-contains', uid));
  return onSnapshot(
    q,
    (snapshot) => onChange(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError,
  );
}

// The trip and its people also say whether changes are still uploading
// (`pending`), for the sync icon (SPEC §12).
export function subscribeToTrip(tripId, onChange, onError) {
  return onSnapshot(
    tripRef(tripId),
    WITH_PENDING,
    (snapshot) => onChange(docExists(snapshot) ? withPending(snapshot) : null),
    onError,
  );
}

export function subscribeToParticipants(tripId, onChange, onError) {
  return onSnapshot(
    participantsRef(tripId),
    WITH_PENDING,
    (snapshot) => onChange(snapshot.docs.map(withPending)),
    onError,
  );
}
