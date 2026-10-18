// Calendar dates are stored as "YYYY-MM-DD" strings (no time or time zone),
// and shown as "17 Oct 2026" (SPEC §15.3).

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const ISO_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function parts(iso) {
  const match = ISO_PATTERN.exec(iso ?? '');
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

export function isIsoDate(iso) {
  const p = parts(iso);
  if (!p) return false;
  const date = new Date(p.year, p.month - 1, p.day);
  return (
    date.getFullYear() === p.year && date.getMonth() === p.month - 1 && date.getDate() === p.day
  );
}

// Local calendar date of a JS Date, e.g. 2026-12-12.
export function toIsoDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// JS Date at local midnight, for date pickers.
export function fromIsoDate(iso) {
  const p = parts(iso);
  return p ? new Date(p.year, p.month - 1, p.day) : undefined;
}

export function formatDate(iso) {
  const p = parts(iso);
  return p ? `${p.day} ${MONTHS[p.month - 1]} ${p.year}` : '';
}

// "From 12 Dec 2026", "12 – 16 Dec 2026", "28 Nov – 3 Dec 2026",
// or "28 Dec 2026 – 3 Jan 2027".
export function formatTripDates(startIso, endIso) {
  const start = parts(startIso);
  if (!start) return '';
  const end = parts(endIso);
  if (!end || endIso === startIso) {
    return end ? formatDate(startIso) : `From ${formatDate(startIso)}`;
  }
  if (start.year !== end.year) return `${formatDate(startIso)} – ${formatDate(endIso)}`;
  if (start.month !== end.month) {
    return `${start.day} ${MONTHS[start.month - 1]} – ${formatDate(endIso)}`;
  }
  return `${start.day} – ${formatDate(endIso)}`;
}
