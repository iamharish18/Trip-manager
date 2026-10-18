// Input checks for the account screens (SPEC §3.1).
// Each function returns an error message, or null when the value is valid.

export const NAME_MAX = 40;
export const PASSWORD_MIN = 8;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateName(name) {
  const trimmed = (name ?? '').trim();
  if (!trimmed) return 'Enter your name.';
  if (trimmed.length > NAME_MAX) return `Use ${NAME_MAX} characters or fewer.`;
  return null;
}

export function validateEmail(email) {
  const trimmed = (email ?? '').trim();
  if (!trimmed) return 'Enter your email.';
  if (!EMAIL_PATTERN.test(trimmed)) return 'Enter a valid email, like name@example.com.';
  return null;
}

// Sign up: enforces the minimum length.
export function validateNewPassword(password) {
  if (!password) return 'Enter a password.';
  if (password.length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} characters.`;
  return null;
}

// Log in: only checks that something was entered (older rules may differ).
export function validateLoginPassword(password) {
  return password ? null : 'Enter your password.';
}

// Returns { field: message } for every invalid field; empty when all are valid.
export function collectErrors(checks) {
  const errors = {};
  for (const [field, message] of Object.entries(checks)) {
    if (message) errors[field] = message;
  }
  return errors;
}
