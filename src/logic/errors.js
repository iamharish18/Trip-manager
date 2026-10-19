// Turns Firebase and app error codes into plain-English messages for the UI.
// Returns { field, message }: field is 'email' or 'password' when the error
// belongs under that input, or null for a general message.

const MESSAGES = {
  'auth/email-already-in-use': {
    field: 'email',
    message: 'That email already has an account. Try logging in.',
  },
  'auth/invalid-email': { field: 'email', message: 'Enter a valid email, like name@example.com.' },
  'auth/missing-email': { field: 'email', message: 'Enter your email.' },
  'auth/weak-password': { field: 'password', message: 'Choose a stronger password.' },
  'auth/wrong-password': { field: null, message: 'Wrong email or password.' },
  'auth/user-not-found': { field: null, message: 'Wrong email or password.' },
  'auth/invalid-credential': { field: null, message: 'Wrong email or password.' },
  'auth/user-disabled': { field: null, message: 'This account has been disabled.' },
  'auth/too-many-requests': {
    field: null,
    message: 'Too many attempts. Wait a few minutes and try again.',
  },
  'auth/network-request-failed': {
    field: null,
    message: 'You’re offline. Connect to the internet and try again.',
  },
  'firestore/unavailable': {
    field: null,
    message: 'You’re offline. Connect to the internet and try again.',
  },
  'firestore/permission-denied': {
    field: null,
    message: 'You don’t have permission to do that.',
  },
  'trips/code-unavailable': {
    field: null,
    message: 'Couldn’t create a Trip ID. Try again.',
  },
  'join/invalid-code': {
    field: 'code',
    message: 'A Trip ID has 6 letters and numbers, like GQA7K2.',
  },
  'join/not-found': { field: 'code', message: 'No trip found with that ID.' },
  'join/expired': { field: 'code', message: 'This trip is closed, so its Trip ID has expired.' },
  'join/taken': { field: null, message: 'Someone just took this name. Pick another.' },
  'join/name-gone': { field: null, message: 'That name was just removed. Pick another.' },
  'join/already-member': { field: null, message: 'You’re already on this trip.' },
  'leave/closed': { field: null, message: 'This trip is closed, so you can’t leave it.' },
  'leave/creator': { field: null, message: 'The trip’s creator can’t leave it.' },
  'close/already': { field: null, message: 'This trip is already closed.' },
  'reopen/not-closed': { field: null, message: 'Only a closed trip can be reopened.' },
  'reopen/used': { field: null, message: 'This trip has already been reopened once.' },
  'trips/not-found': { field: null, message: 'This trip no longer exists.' },
};

const FALLBACK = { field: null, message: 'Something went wrong. Try again.' };

export function describeError(error) {
  // Errors created by the app itself can carry their own message.
  if (error?.userMessage) return { field: null, message: error.userMessage };
  return MESSAGES[error?.code] ?? FALLBACK;
}
