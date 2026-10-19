// What a new-expense notification says and who gets it (SPEC §11).

import { formatRupees } from './format';

export const EXPENSE_CHANNEL = 'expenses';
const MAX_PER_REQUEST = 100; // Expo push service limit

// Title: trip name. Body: "Rahul added ₹1,200 · Cab to Baga (Travel)".
// Without a description: "Rahul added ₹1,200 · Travel".
export function expenseMessage({ tripName, adderName, amount, description, categoryName }) {
  const what = description ? `${description} (${categoryName})` : categoryName;
  return {
    title: tripName,
    body: `${adderName} added ${formatRupees(amount)} · ${what}`,
  };
}

/**
 * Push tokens to notify: current members except the person who added the
 * expense, without duplicates. `tokenDocs` are [{ uid, token }].
 */
export function recipientTokens(tokenDocs, memberUids, adderUid) {
  const tokens = new Set();
  for (const { uid, token } of tokenDocs) {
    if (uid !== adderUid && memberUids.includes(uid) && token) tokens.add(token);
  }
  return [...tokens];
}

// Text for trip close / final close / reopen notifications (SPEC §9).
// `summary` is the member's settleUpSummary ("You owe Priya ₹4,500.").
export function tripEventBody(event, summary) {
  if (event === 'reopened') return 'Reopened for 24 hours to fix expenses.';
  const intro = event === 'final' ? 'The trip is now final.' : 'The trip is closed.';
  return `${intro} ${summary}`;
}

// Expo push messages, in batches of at most 100 per request.
export function pushBatches(tokens, { title, body }, data) {
  const messages = tokens.map((to) => ({
    to,
    title,
    body,
    data,
    channelId: EXPENSE_CHANNEL,
    priority: 'high',
  }));
  const batches = [];
  for (let i = 0; i < messages.length; i += MAX_PER_REQUEST) {
    batches.push(messages.slice(i, i + MAX_PER_REQUEST));
  }
  return batches;
}

// Where tapping a notification goes.
export function notificationRoute(data) {
  if (data?.tripId && data?.expenseId) return `/trips/${data.tripId}/expenses/${data.expenseId}`;
  if (data?.tripId && data?.screen === 'balances') return `/trips/${data.tripId}/balances`;
  if (data?.tripId) return `/trips/${data.tripId}`;
  return null;
}
