// Input checks for accounts (SPEC §3.1) and trips (SPEC §5).
// Each function returns an error message, or null when the value is valid.

import { isIsoDate } from './dates';

export const NAME_MAX = 40;
export const PASSWORD_MIN = 8;
export const TRIP_NAME_MAX = 60;
export const MAX_PARTICIPANTS = 20;

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

export function validateTripName(name) {
  const trimmed = (name ?? '').trim();
  if (!trimmed) return 'Enter a trip name.';
  if (trimmed.length > TRIP_NAME_MAX) return `Use ${TRIP_NAME_MAX} characters or fewer.`;
  return null;
}

export function validateStartDate(startDate) {
  return isIsoDate(startDate) ? null : 'Choose a start date.';
}

// The end date is optional, but can't be before the start date.
export function validateEndDate(startDate, endDate) {
  if (!endDate) return null;
  if (!isIsoDate(endDate)) return 'Choose a valid end date.';
  if (isIsoDate(startDate) && endDate < startDate) return 'The end date can’t be before the start.';
  return null;
}

// Same name ignoring capitals and surrounding spaces.
export function sameName(a, b) {
  return (a ?? '').trim().toLowerCase() === (b ?? '').trim().toLowerCase();
}

// A person's name on a trip: 1–40 characters and unique on that trip.
// `otherNames` are the names already on the trip (excluding the one being renamed).
export function validateParticipantName(name, otherNames = []) {
  const basic = validateName(name);
  if (basic) return basic === 'Enter your name.' ? 'Enter a name.' : basic;
  const clash = otherNames.find((other) => sameName(other, name));
  if (clash) return `${clash.trim()} is already on this trip.`;
  return null;
}

// Returns { field: message } for every invalid field; empty when all are valid.
export function collectErrors(checks) {
  const errors = {};
  for (const [field, message] of Object.entries(checks)) {
    if (message) errors[field] = message;
  }
  return errors;
}
