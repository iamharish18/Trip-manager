// Trip IDs (SPEC §5): 6 characters with no look-alikes (0/O, 1/I/L).

export const JOIN_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const JOIN_CODE_LENGTH = 6;

const JOIN_CODE_PATTERN = new RegExp(`^[${JOIN_CODE_ALPHABET}]{${JOIN_CODE_LENGTH}}$`);

// `random` returns a number in [0, 1); injectable for tests.
export function generateJoinCode(random = Math.random) {
  let code = '';
  for (let i = 0; i < JOIN_CODE_LENGTH; i += 1) {
    code += JOIN_CODE_ALPHABET[Math.floor(random() * JOIN_CODE_ALPHABET.length)];
  }
  return code;
}

// Accepts what a person might type: lowercase, spaces, or a dash.
export function normalizeJoinCode(input) {
  return (input ?? '').toUpperCase().replace(/[\s-]/g, '');
}

export function isValidJoinCode(code) {
  return JOIN_CODE_PATTERN.test(code ?? '');
}

// Join links open the app's Join screen with the Trip ID filled in. The page
// is on Firebase Hosting, so people without the app still see the Trip ID.
export const JOIN_LINK_HOST = 'trip-manager-a75e6.web.app';

export function joinLink(code) {
  return `https://${JOIN_LINK_HOST}/join?code=${encodeURIComponent(code)}`;
}

export function joinShareMessage(trip) {
  return (
    `Join my trip "${trip.name}" on Trip Manager.\n` +
    `Tap to join: ${joinLink(trip.joinCode)}\n` +
    `Or enter the Trip ID: ${trip.joinCode}`
  );
}
