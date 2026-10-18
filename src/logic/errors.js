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
};

const FALLBACK = { field: null, message: 'Something went wrong. Try again.' };

export function describeError(error) {
  return MESSAGES[error?.code] ?? FALLBACK;
}
