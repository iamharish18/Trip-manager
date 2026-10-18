import { formatRupees } from './format';

// Your position in words (SPEC §8): positive net means others owe you.
// Returns { text, tone } where tone is 'positive', 'negative' or 'neutral'.
export function describePosition(net) {
  if (net > 0) return { text: `You’re owed ${formatRupees(net)}`, tone: 'positive' };
  if (net < 0) return { text: `You owe ${formatRupees(-net)}`, tone: 'negative' };
  return { text: 'You’re all square', tone: 'neutral' };
}

// "You paid" for yourself, otherwise "Priya paid".
export function payerLabel(payerPid, participants, mePid) {
  if (payerPid === mePid) return 'You paid';
  const payer = participants.find((p) => p.id === payerPid);
  return `${payer?.name ?? 'Someone'} paid`;
}
