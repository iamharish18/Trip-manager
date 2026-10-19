// Wording for sync status, rejected changes and online-only actions
// (SPEC §12).

const changes = (n) => (n === 1 ? '1 change' : `${n} changes`);

/**
 * The trip header's sync icon. Returns { state, icon, label, explanation }
 * where state is 'offline', 'saving' or 'synced'.
 */
export function describeSync({ offline, pendingCount }) {
  if (offline) {
    return {
      state: 'offline',
      icon: 'cloud-off-outline',
      label: 'Offline',
      explanation: pendingCount
        ? `You’re offline. ${changes(pendingCount)} ${pendingCount === 1 ? 'is' : 'are'} saved on this phone and will upload when you’re back online.`
        : 'You’re offline. You can keep adding and editing; changes will upload when you’re back online.',
    };
  }
  if (pendingCount) {
    return {
      state: 'saving',
      icon: 'cloud-upload-outline',
      label: 'Saving…',
      explanation: `Uploading ${changes(pendingCount)} to the server.`,
    };
  }
  return {
    state: 'synced',
    icon: 'cloud-check-outline',
    label: 'Synced',
    explanation: 'Everything is saved on the server.',
  };
}

/**
 * Message when the server rejects a change. `what` names it, e.g.
 * "Your expense “Dinner”". `tripLocked` says whether the trip is now closed.
 */
export function failureMessage(what, error, { tripLocked = false } = {}) {
  const subject = what ?? 'Your change';
  if (error?.code === 'firestore/permission-denied') {
    if (tripLocked) return `${subject} wasn’t saved: the trip was closed.`;
    return `${subject} wasn’t saved: you no longer have access.`;
  }
  return `${subject} couldn’t be saved. Try again.`;
}

// "Your expense “Dinner”", or with { change: true } "Your change to “Dinner”".
// Uses the category name when there's no description.
export function expenseWhat(description, categoryName, { change = false } = {}) {
  const name = `“${description || categoryName}”`;
  return change ? `Your change to ${name}` : `Your expense ${name}`;
}

const ONLINE_ACTIONS = {
  createTrip: 'Creating a trip',
  joinTrip: 'Joining a trip',
  leaveTrip: 'Leaving a trip',
  closeTrip: 'Closing a trip',
  reopenTrip: 'Reopening a trip',
  deleteTrip: 'Deleting a trip',
};

// "You're offline. Creating a trip needs internet."
export function offlineMessage(action) {
  return `You’re offline. ${ONLINE_ACTIONS[action] ?? 'This'} needs internet.`;
}

// An error that screens can show like any other (`describeError`).
export function offlineError(action) {
  return Object.assign(new Error(offlineMessage(action)), {
    code: 'app/offline',
    userMessage: offlineMessage(action),
  });
}
