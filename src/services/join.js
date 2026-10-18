// Joining and leaving trips (SPEC §5) without Cloud Functions: every step
// is a transaction, so it needs internet and either fully happens or not
// at all. The security rules allow only the joiner/leaver's own changes.

import {
  collection,
  doc,
  getDocFromServer,
  getDocsFromServer,
  runTransaction,
  serverTimestamp,
} from '@react-native-firebase/firestore';

import { isValidJoinCode, normalizeJoinCode } from '@/logic/joinCode';

import { db, docExists } from './firebase';

const fail = (code, message) => Object.assign(new Error(message), { code });

/**
 * Looks up a Trip ID. Returns { tripId, trip, participants, isMember }.
 * Errors: join/invalid-code, join/not-found, join/expired, or offline.
 */
export async function lookupTrip(rawCode, uid) {
  const code = normalizeJoinCode(rawCode);
  if (!isValidJoinCode(code)) throw fail('join/invalid-code', 'Invalid Trip ID');

  const codeSnap = await getDocFromServer(doc(db, 'joinCodes', code));
  if (!docExists(codeSnap)) throw fail('join/not-found', 'No trip with that ID');
  const { tripId } = codeSnap.data();

  let tripSnap;
  try {
    tripSnap = await getDocFromServer(doc(db, 'trips', tripId));
  } catch (error) {
    // Non-members can only read Active trips, so a refusal means it's closed.
    if (error?.code === 'firestore/permission-denied') {
      throw fail('join/expired', 'Trip closed');
    }
    throw error;
  }
  if (!docExists(tripSnap)) throw fail('join/not-found', 'No trip with that ID');
  const trip = { id: tripId, ...tripSnap.data() };

  const isMember = trip.memberUids.includes(uid);
  if (!isMember && trip.status !== 'active') throw fail('join/expired', 'Trip closed');

  const peopleSnap = await getDocsFromServer(collection(db, 'trips', tripId, 'participants'));
  const participants = peopleSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return { tripId, trip, participants, isMember };
}

// Reads the trip inside a transaction and checks it can still be joined.
async function readJoinableTrip(tx, tripId, uid) {
  const tripSnap = await tx.get(doc(db, 'trips', tripId));
  if (!docExists(tripSnap)) throw fail('join/not-found', 'No trip with that ID');
  const trip = tripSnap.data();
  if (trip.status !== 'active') throw fail('join/expired', 'Trip closed');
  if (trip.memberUids.includes(uid)) throw fail('join/already-member', 'Already a member');
  return trip;
}

// Claims an unclaimed name and joins the trip.
export function claimSpot(tripId, participantId, uid) {
  return runTransaction(db, async (tx) => {
    const trip = await readJoinableTrip(tx, tripId, uid);
    const personRef = doc(db, 'trips', tripId, 'participants', participantId);
    const personSnap = await tx.get(personRef);
    if (!docExists(personSnap)) throw fail('join/name-gone', 'Name removed');
    if (personSnap.data().claimedByUid) throw fail('join/taken', 'Name taken');

    tx.update(personRef, { claimedByUid: uid, leftAt: null });
    tx.update(doc(db, 'trips', tripId), { memberUids: [...trip.memberUids, uid] });
  });
}

// Adds you as a new person (your name wasn't on the list) and joins the trip.
// Name checks (unique, 20-person limit) are done by the screen beforehand.
export function joinAsNewPerson(tripId, name, uid) {
  return runTransaction(db, async (tx) => {
    const trip = await readJoinableTrip(tx, tripId, uid);
    const personRef = doc(collection(db, 'trips', tripId, 'participants'));
    tx.set(personRef, { name: name.trim(), claimedByUid: uid, addedAt: serverTimestamp() });
    tx.update(doc(db, 'trips', tripId), { memberUids: [...trip.memberUids, uid] });
  });
}

// Releases your name (it stays on the trip as "Left the trip") and leaves.
export function leaveTrip(tripId, participantId, uid) {
  return runTransaction(db, async (tx) => {
    const tripRef = doc(db, 'trips', tripId);
    const tripSnap = await tx.get(tripRef);
    const trip = tripSnap.data();
    if (trip.status !== 'active') throw fail('leave/closed', 'Trip closed');
    if (trip.creatorUid === uid) throw fail('leave/creator', 'Creator cannot leave');

    tx.update(doc(db, 'trips', tripId, 'participants', participantId), {
      claimedByUid: null,
      leftAt: serverTimestamp(),
    });
    tx.update(tripRef, { memberUids: trip.memberUids.filter((m) => m !== uid) });
  });
}
