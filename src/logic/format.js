// Display formatting for money (SPEC §15.3): whole rupees, Indian digit grouping.

const MINUS = '−';

// Groups digits the Indian way: last three, then pairs (1,00,000).
function groupIndian(digits) {
  if (digits.length <= 3) return digits;
  const lastThree = digits.slice(-3);
  const rest = digits.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `${rest},${lastThree}`;
}

/**
 * Formats a whole-rupee amount, e.g. 100000 → "₹1,00,000", -900 → "−₹900".
 * With { signed: true }, positive amounts get a "+" (e.g. "+₹11,100").
 */
export function formatRupees(amount, { signed = false } = {}) {
  const rounded = Math.round(amount);
  const body = `₹${groupIndian(String(Math.abs(rounded)))}`;
  if (rounded < 0) return `${MINUS}${body}`;
  if (signed && rounded > 0) return `+${body}`;
  return body;
}
