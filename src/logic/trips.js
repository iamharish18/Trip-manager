// Small helpers about trips and participants, shared by screens.

export const REOPEN_HOURS = 24;
const HOUR = 60 * 60 * 1000;

// When a reopened trip locks again (ms), or null.
export function reopenEndsAt(trip) {
  const start = trip?.reopenedAt?.toMillis?.();
  return start == null ? null : start + REOPEN_HOURS * HOUR;
}

// Reopened and still within its 24 hours. A reopen not yet confirmed by the
// server (no reopenedAt yet) counts as open.
export function isReopenWindowOpen(trip, now = Date.now()) {
  if (trip?.status !== 'reopened') return false;
  const ends = reopenEndsAt(trip);
  return ends === null || now < ends;
}

// Open for changes (SPEC §4): Active, or Reopened within its 24 hours.
export function isTripOpen(trip, now = Date.now()) {
  return trip?.status === 'active' || isReopenWindowOpen(trip, now);
}

// Closed for settling up: Closed, Final, or a reopen whose time ran out.
export function isSettling(trip, now = Date.now()) {
  return Boolean(trip) && !isTripOpen(trip, now);
}

// "23 h 12 m", "45 m", or "less than a minute".
export function formatTimeLeft(ms) {
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return 'less than a minute';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h} h ${m} m` : `${m} m`;
}

// Creator first, then in the order people were added (new ones last).
export function sortParticipants(participants, creatorUid) {
  const time = (p) => p.addedAt?.toMillis?.() ?? Number.MAX_SAFE_INTEGER;
  return [...participants].sort((a, b) => {
    const aCreator = a.claimedByUid === creatorUid ? 0 : 1;
    const bCreator = b.claimedByUid === creatorUid ? 0 : 1;
    if (aCreator !== bCreator) return aCreator - bCreator;
    return time(a) - time(b) || a.name.localeCompare(b.name);
  });
}

// "Creator", "Joined", "Left the trip" or "Not joined yet".
export function participantStatus(participant, creatorUid) {
  if (participant.claimedByUid && participant.claimedByUid === creatorUid) return 'Creator';
  if (participant.claimedByUid) return 'Joined';
  if (participant.leftAt) return 'Left the trip';
  return 'Not joined yet';
}

// Newest start date first.
export function sortTrips(trips) {
  return [...trips].sort((a, b) => (b.startDate ?? '').localeCompare(a.startDate ?? ''));
}

export function peopleLabel(count) {
  return count === 1 ? '1 person' : `${count} people`;
}
