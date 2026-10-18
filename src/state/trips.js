// Live trip data for screens. Values come from Firestore's offline cache
// first, so they work without internet.

import { createContext, useContext, useEffect, useState } from 'react';

import { isTripOpen } from '@/logic/trips';
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

  const trip = tripState.value ?? null;
  const value = {
    tripId,
    trip,
    participants,
    isLoading: tripState.isLoading,
    // Missing, or no longer readable (e.g. removed from the trip).
    notFound: !tripState.isLoading && !trip,
    isCreator: Boolean(trip && user && trip.creatorUid === user.uid),
    isOpen: isTripOpen(trip),
  };

  return <TripContext.Provider value={value}>{children}</TripContext.Provider>;
}

export function useTrip() {
  const value = useContext(TripContext);
  if (!value) throw new Error('useTrip must be used inside <TripProvider>');
  return value;
}
