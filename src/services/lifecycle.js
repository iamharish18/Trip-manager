// Closing, reopening and finalising trips, and marking payments (SPEC §4,
// §9). Free plan: the phone does what a server would; the security rules
// check every step. Closing and reopening need internet.

import {
  collection,
  doc,
  getDocFromServer,
  getDocsFromServer,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  waitForPendingWrites,
  writeBatch,
} from '@react-native-firebase/firestore';

import { samePlan, settlementPlan } from '@/logic/settlements';
import { isReopenWindowOpen } from '@/logic/trips';

import { WITH_PENDING, db, docExists, withPending } from './firebase';

const fail = (code, message) => Object.assign(new Error(message), { code });

// Waits for this phone's queued changes to reach the server. Offline that
// would wait forever, so give up after 10 seconds and report "offline".
function flushWrites() {
  return Promise.race([
    waitForPendingWrites(db),
    new Promise((_, reject) =>
      setTimeout(() => reject(fail('firestore/unavailable', 'Offline')), 10000),
    ),
  ]);
}
const tripRef = (tripId) => doc(db, 'trips', tripId);
const settlementsRef = (tripId) => collection(db, 'trips', tripId, 'settlements');

async function readFromServer(tripId) {
  const [tripSnap, expensesSnap, peopleSnap, settlementsSnap] = await Promise.all([
    getDocFromServer(tripRef(tripId)),
    getDocsFromServer(collection(db, 'trips', tripId, 'expenses')),
    getDocsFromServer(collection(db, 'trips', tripId, 'participants')),
    getDocsFromServer(settlementsRef(tripId)),
  ]);
  if (!docExists(tripSnap)) throw fail('trips/not-found', 'Trip not found');
  const list = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return {
    trip: tripSnap.data(),
    expenses: list(expensesSnap),
    participants: list(peopleSnap),
    settlements: list(settlementsSnap),
  };
}

function newSettlement(payment, round) {
  return {
    ...payment,
    round,
    isPaid: false,
    isRecordedPayment: false,
    markedByUid: null,
    markedAt: null,
    createdAt: serverTimestamp(),
  };
}

/**
 * Closes the trip: Active → Closed (round 1), or Reopened → Final (round 2).
 * The creator can close; once a reopen's 24 hours have passed, any member
 * can finalise. Returns { status, settlements, participants, trip } for
 * the notifications.
 */
export async function closeTrip(tripId) {
  // Our own queued changes must reach the server before we add things up.
  await flushWrites();
  const { trip, expenses, participants, settlements } = await readFromServer(tripId);
  if (!['active', 'reopened'].includes(trip.status)) throw fail('close/already', 'Already closed');

  const round = trip.status === 'active' ? 1 : 2;
  const status = round === 1 ? 'closed' : 'final';
  const recorded = settlements
    .filter((s) => s.isRecordedPayment)
    .map(({ fromPid, toPid, amount }) => ({ fromPid, toPid, amount }));
  const plan = settlementPlan(expenses, participants, recorded);

  const batch = writeBatch(db);
  batch.update(tripRef(tripId), { status, closedAt: serverTimestamp() });
  const created = plan.map((payment) => {
    const ref = doc(settlementsRef(tripId));
    batch.set(ref, newSettlement(payment, round));
    return ref;
  });
  await batch.commit();

  // Double-check: an expense may have been saved by someone else while we
  // were adding up. If so, replace the settlements (none is paid yet).
  const fresh = await getDocsFromServer(collection(db, 'trips', tripId, 'expenses'));
  const freshPlan = settlementPlan(
    fresh.docs.map((d) => d.data()),
    participants,
    recorded,
  );
  let finalPlan = plan;
  if (!samePlan(plan, freshPlan)) {
    const redo = writeBatch(db);
    for (const ref of created) redo.delete(ref);
    for (const payment of freshPlan)
      redo.set(doc(settlementsRef(tripId)), newSettlement(payment, round));
    await redo.commit();
    finalPlan = freshPlan;
  }

  return { status, settlements: finalPlan, participants, trip };
}

// Finalises a reopened trip whose 24 hours have passed (any member).
export async function finaliseIfExpired(trip) {
  if (trip?.status !== 'reopened' || isReopenWindowOpen(trip)) return null;
  return closeTrip(trip.id);
}

/**
 * Reopens a closed trip for 24 hours (creator, once). Payments marked paid
 * are kept as recorded payments; unpaid settlements are discarded.
 */
export async function reopenTrip(tripId) {
  await flushWrites();
  const tripSnap = await getDocFromServer(tripRef(tripId));
  const trip = tripSnap.data();
  if (trip.status !== 'closed') throw fail('reopen/not-closed', 'Not closed');
  if (trip.reopenUsed) throw fail('reopen/used', 'Already reopened once');

  const settlementsSnap = await getDocsFromServer(settlementsRef(tripId));
  const batch = writeBatch(db);
  batch.update(tripRef(tripId), {
    status: 'reopened',
    reopenUsed: true,
    reopenedAt: serverTimestamp(),
  });
  for (const s of settlementsSnap.docs) {
    const data = s.data();
    if (data.isRecordedPayment) continue;
    if (data.isPaid) batch.update(s.ref, { isRecordedPayment: true });
    else batch.delete(s.ref);
  }
  await batch.commit();
  return { trip };
}

// Mark paid / not paid. Works offline; syncs later.
export function markSettlement(tripId, settlementId, isPaid, uid) {
  return updateDoc(doc(settlementsRef(tripId), settlementId), {
    isPaid,
    markedByUid: uid,
    markedAt: serverTimestamp(),
  });
}

export function subscribeToSettlements(tripId, onChange, onError) {
  return onSnapshot(
    settlementsRef(tripId),
    WITH_PENDING,
    (snapshot) => onChange(snapshot.docs.map(withPending)),
    onError,
  );
}
