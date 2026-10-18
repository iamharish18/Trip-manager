// Live trip data for screens. Values come from Firestore's offline cache
// first, so they work without internet.

import { createContext, useContext, useEffect, useState } from 'react';

import { activeExpenses } from '@/logic/money';
import { isTripOpen } from '@/logic/trips';
import { subscribeToCategories, subscribeToExpenses } from '@/services/expenses';
import { subscribeToMyTrips, subscribeToParticipants, subscribeToTrip } from '@/services/trips';
import { useSession } from '@/state/session';

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

// ---- One open trip, shared by its tabs and settings ----

const TripContext = createContext(null);

export function TripProvider({ tripId, children }) {
  const { user } = useSession();
  const tripState = useKeyedSubscription(tripId, subscribeToTrip);
  const { participants } = useParticipants(tripId);
  const expensesState = useKeyedSubscription(tripId, subscribeToExpenses);
  const categoriesState = useKeyedSubscription(tripId, subscribeToCategories);
  // The last deleted expense, offered for Undo on the Expenses tab.
  const [deletedExpenseId, setDeletedExpenseId] = useState(null);

  const trip = tripState.value ?? null;
  const allExpenses = expensesState.value ?? [];
  const isOpen = isTripOpen(trip);
  const isMember = Boolean(trip && user && trip.memberUids?.includes(user.uid));

  const value = {
    tripId,
    trip,
    participants,
    // Includes soft-deleted ones (needed for Undo); use `expenses` for display.
    allExpenses,
    expenses: activeExpenses(allExpenses),
    expensesLoading: expensesState.isLoading,
    customCategories: categoriesState.value ?? [],
    // Your own spot on the trip, if you've claimed one.
    me: participants.find((p) => user && p.claimedByUid === user.uid) ?? null,
    isLoading: tripState.isLoading,
    // Missing, or no longer readable (e.g. removed from the trip).
    notFound: !tripState.isLoading && !trip,
    isCreator: Boolean(trip && user && trip.creatorUid === user.uid),
    isOpen,
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
