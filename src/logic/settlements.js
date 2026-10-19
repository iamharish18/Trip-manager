// Settling up (SPEC §9): who pays whom so that everyone ends at ₹0.

import { computeBalances } from './money';

/**
 * Nets per person after payments already made. A payment from A to B
 * raises A's net (A owes less) and lowers B's (B is owed less).
 * `payments` are [{ fromPid, toPid, amount }].
 */
export function netsAfterPayments(balances, payments = []) {
  const nets = {};
  for (const [pid, b] of Object.entries(balances)) nets[pid] = b.net;
  for (const p of payments) {
    nets[p.fromPid] = (nets[p.fromPid] ?? 0) + p.amount;
    nets[p.toPid] = (nets[p.toPid] ?? 0) - p.amount;
  }
  return nets;
}

/**
 * Debt simplification: repeatedly the person owed the most is paid by the
 * person who owes the most, for the smaller of the two amounts. Gives at
 * most n − 1 payments, in whole rupees. Ties are broken by id so every
 * phone computes the same result. Returns [{ fromPid, toPid, amount }].
 */
export function simplifyDebts(nets) {
  const byNet = (a, b) => b.amount - a.amount || a.pid.localeCompare(b.pid);
  const creditors = Object.entries(nets)
    .filter(([, net]) => net > 0)
    .map(([pid, net]) => ({ pid, amount: net }));
  const debtors = Object.entries(nets)
    .filter(([, net]) => net < 0)
    .map(([pid, net]) => ({ pid, amount: -net }));

  const payments = [];
  while (creditors.length && debtors.length) {
    creditors.sort(byNet);
    debtors.sort(byNet);
    const creditor = creditors[0];
    const debtor = debtors[0];
    const amount = Math.min(creditor.amount, debtor.amount);
    payments.push({ fromPid: debtor.pid, toPid: creditor.pid, amount });
    creditor.amount -= amount;
    debtor.amount -= amount;
    if (creditor.amount === 0) creditors.shift();
    if (debtor.amount === 0) debtors.shift();
  }
  return payments;
}

// The settlements to create when closing: balances from all expenses,
// minus payments recorded before a reopen.
export function settlementPlan(expenses, participants, recordedPayments = []) {
  const balances = computeBalances(expenses, participants);
  return simplifyDebts(netsAfterPayments(balances, recordedPayments));
}

// Same payments, ignoring order (to compare a plan with what was saved).
export function samePlan(a, b) {
  const key = (p) => `${p.fromPid}>${p.toPid}:${p.amount}`;
  const keys = (list) => list.map(key).sort().join('|');
  return keys(a) === keys(b);
}

/**
 * One member's summary after closing, for their notification:
 * "You owe Priya ₹4,500.", "Amit owes you ₹900.", "You're all settled."
 * `nameOf(pid)` gives a person's trip name. `formatRupees` formats amounts.
 */
export function settleUpSummary(pid, settlements, nameOf, formatRupees) {
  const owes = settlements.filter((s) => s.fromPid === pid);
  const owed = settlements.filter((s) => s.toPid === pid);
  const total = (list) => list.reduce((sum, s) => sum + s.amount, 0);
  const parts = [];
  if (owes.length === 1) {
    parts.push(`You owe ${nameOf(owes[0].toPid)} ${formatRupees(owes[0].amount)}.`);
  } else if (owes.length > 1) {
    parts.push(`You owe ${formatRupees(total(owes))} to ${owes.length} people.`);
  }
  if (owed.length === 1) {
    parts.push(`${nameOf(owed[0].fromPid)} owes you ${formatRupees(owed[0].amount)}.`);
  } else if (owed.length > 1) {
    parts.push(`${owed.length} people owe you ${formatRupees(total(owed))}.`);
  }
  return parts.length ? parts.join(' ') : 'You’re all settled.';
}
