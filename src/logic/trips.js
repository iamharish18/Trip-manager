// Small helpers about trips and participants, shared by screens.

export function isTripOpen(trip) {
  return trip?.status === 'active' || trip?.status === 'reopened';
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

// "Creator", "Joined" or "Not joined yet".
export function participantStatus(participant, creatorUid) {
  if (participant.claimedByUid && participant.claimedByUid === creatorUid) return 'Creator';
  if (participant.claimedByUid) return 'Joined';
  return 'Not joined yet';
}

// Newest start date first.
export function sortTrips(trips) {
  return [...trips].sort((a, b) => (b.startDate ?? '').localeCompare(a.startDate ?? ''));
}

export function peopleLabel(count) {
  return count === 1 ? '1 person' : `${count} people`;
}
