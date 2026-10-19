// Live trip data for screens. Values come from Firestore's offline cache
// first, so they work without internet.

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

import { activeExpenses } from '@/logic/money';
import { isReopenWindowOpen, isSettling, isTripOpen, reopenEndsAt } from '@/logic/trips';
import { subscribeToComments } from '@/services/comments';
import { subscribeToCategories, subscribeToExpenses } from '@/services/expenses';
import { finaliseIfExpired, subscribeToSettlements } from '@/services/lifecycle';
import { notifyTripEvent } from '@/services/notifications';
import { subscribeToMyTrips, subscribeToParticipants, subscribeToTrip } from '@/services/trips';
import { useSession } from '@/state/session';
import { useSync } from '@/state/sync';

// Keeps `{ key, value }` so a value from a previous key is never shown.
function useKeyedSubscription(key, subscribe) {
  const [state, setState] = useState({ key: null, value: undefined, error: null });

  useEffect(() => {
    if (!key) return undefined;
    return subscribe(
      key,
      (value) => setState({ key, value, error: null }),
      (error) => setState({ key, value: null, error }),
    );
  }, [key, subscribe]);

  const current = state.key === key;
  return {
    value: current ? state.value : undefined,
    error: current ? state.error : null,
    isLoading: Boolean(key) && (!current || state.value === undefined),
  };
}

// Trips you're a member of.
export function useMyTrips() {
  const { user } = useSession();
  const { value, error, isLoading } = useKeyedSubscription(user?.uid, subscribeToMyTrips);
  return { trips: value ?? [], error, isLoading };
}

export function useParticipants(tripId) {
  const { value, error, isLoading } = useKeyedSubscription(tripId, subscribeToParticipants);
  return { participants: value ?? [], error, isLoading };
}

// Non-deleted expenses of a trip.
export function useExpenses(tripId) {
  const { value, error, isLoading } = useKeyedSubscription(tripId, subscribeToExpenses);
  return { expenses: activeExpenses(value ?? []), error, isLoading };
}

// ---- One open trip, shared by its tabs and settings ----

const TripContext = createContext(null);

// The current time, refreshed every 30 seconds while `ticking` (for the
// reopen countdown and the moment the 24 hours run out).
function useNow(ticking) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!ticking) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, [ticking]);
  return now;
}

export function TripProvider({ tripId, children }) {
  const { user } = useSession();
  const tripState = useKeyedSubscription(tripId, subscribeToTrip);
  const { participants } = useParticipants(tripId);
  const expensesState = useKeyedSubscription(tripId, subscribeToExpenses);
  const categoriesState = useKeyedSubscription(tripId, subscribeToCategories);
  const commentsState = useKeyedSubscription(tripId, subscribeToComments);
  const settlementsState = useKeyedSubscription(tripId, subscribeToSettlements);
  // The last deleted expense, offered for Undo on the Expenses tab.
  const [deletedExpenseId, setDeletedExpenseId] = useState(null);

  const trip = tripState.value ?? null;
  const now = useNow(trip?.status === 'reopened');
  const { trackWrite } = useSync();

  // Whether the trip is locked right now, for messages about changes the
  // server rejected later (SPEC §12).
  const lockedRef = useRef(false);
  const locked = isSettling(trip, now);
  useEffect(() => {
    lockedRef.current = locked;
  }, [locked]);
  const track = useCallback(
    (promise, what) => trackWrite(promise, what, () => lockedRef.current),
    [trackWrite],
  );
  const allExpenses = expensesState.value ?? [];
  const isOpen = isTripOpen(trip, now);
  const isMember = Boolean(trip && user && trip.memberUids?.includes(user.uid));

  // If a reopen's 24 hours have run out, the first member to open the trip
  // finalises it and lets the others know (SPEC §9). Needs internet; tried
  // once per visit.
  const finaliseTried = useRef(false);
  const uid = user?.uid;
  useEffect(() => {
    if (!trip || !isMember || finaliseTried.current) return;
    if (trip.status !== 'reopened' || isReopenWindowOpen(trip, now)) return;
    finaliseTried.current = true;
    finaliseIfExpired(trip)
      .then((result) => result && notifyTripEvent(trip.id, uid, 'final', result.settlements))
      .catch(() => {});
  }, [trip, isMember, now, uid]);

  const value = {
    tripId,
    trip,
    participants,
    // Includes soft-deleted ones (needed for Undo); use `expenses` for display.
    allExpenses,
    expenses: activeExpenses(allExpenses),
    expensesLoading: expensesState.isLoading,
    customCategories: categoriesState.value ?? [],
    // All comments on the trip; each has `expenseId` and `pending`.
    comments: commentsState.value ?? [],
    // Your own spot on the trip, if you've claimed one.
    me: participants.find((p) => user && p.claimedByUid === user.uid) ?? null,
    isLoading: tripState.isLoading,
    // Missing, or no longer readable (e.g. removed from the trip).
    notFound: !tripState.isLoading && !trip,
    isCreator: Boolean(trip && user && trip.creatorUid === user.uid),
    isOpen,
    // Closed for settling up (Closed, Final, or a reopen that ran out).
    isSettling: locked,
    // Reports it if the server later rejects this change, e.g.
    // track(updateExpense(...), 'Your expense “Dinner”').
    track,
    // When a reopened trip locks again (ms), and the current time.
    reopenEndsAt: reopenEndsAt(trip),
    now,
    settlements: settlementsState.value ?? [],
    // Changes on this trip still waiting to upload (SPEC §12).
    pendingCount: [
      trip ? [trip] : [],
      participants,
      allExpenses,
      categoriesState.value ?? [],
      commentsState.value ?? [],
      settlementsState.value ?? [],
    ]
      .flat()
      .filter((item) => item.pending).length,
    // Can add, edit and delete expenses and categories (SPEC §6).
    canWrite: isOpen && isMember,
    deletedExpenseId,
    setDeletedExpenseId,
  };

  return <TripContext.Provider value={value}>{children}</TripContext.Provider>;
}

export function useTrip() {
  const value = useContext(TripContext);
  if (!value) throw new Error('useTrip must be used inside <TripProvider>');
  return value;
}
