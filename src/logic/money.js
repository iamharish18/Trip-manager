// Money logic (SPEC §6, §8). All amounts are whole rupees.

export const MAX_AMOUNT = 1000000; // ₹10,00,000
export const DESCRIPTION_MAX = 100;

export function activeExpenses(expenses) {
  return expenses.filter((e) => !e.isDeleted);
}

/**
 * Splits an amount equally among people. Everyone gets floor(amount / n);
 * the payer also takes the leftover rupees. Returns { pid: share }.
 */
export function splitEqually(amount, pids, payerPid) {
  const n = pids.length;
  if (n === 0) return {};
  const base = Math.floor(amount / n);
  const remainder = amount - base * n;
  const shares = {};
  for (const pid of pids) shares[pid] = base;
  const absorber = pids.includes(payerPid) ? payerPid : pids[0];
  shares[absorber] += remainder;
  return shares;
}

/**
 * Per person: paid (what they paid for), share (what they owe of all
 * expenses) and net (paid − share; positive means others owe them).
 * Returns { pid: { paid, share, net } } for every participant and anyone
 * referenced by an expense. Deleted expenses are ignored.
 */
export function computeBalances(expenses, participants = []) {
  const balances = {};
  const entry = (pid) => {
    if (!balances[pid]) balances[pid] = { paid: 0, share: 0, net: 0 };
    return balances[pid];
  };
  for (const p of participants) entry(p.id);

  for (const expense of activeExpenses(expenses)) {
    entry(expense.paidByPid).paid += expense.amount;
    const shares = splitEqually(expense.amount, expense.splitAmongPids, expense.paidByPid);
    for (const [pid, share] of Object.entries(shares)) entry(pid).share += share;
  }

  for (const b of Object.values(balances)) b.net = b.paid - b.share;
  return balances;
}

export function totalSpent(expenses) {
  return activeExpenses(expenses).reduce((sum, e) => sum + e.amount, 0);
}

// [{ categoryId, total }], largest first.
export function totalsByCategory(expenses) {
  const totals = {};
  for (const e of activeExpenses(expenses)) {
    totals[e.categoryId] = (totals[e.categoryId] ?? 0) + e.amount;
  }
  return Object.entries(totals)
    .map(([categoryId, total]) => ({ categoryId, total }))
    .sort((a, b) => b.total - a.total);
}

// How many active expenses a person paid for or shares in.
export function expenseCountFor(pid, expenses) {
  return activeExpenses(expenses).filter(
    (e) => e.paidByPid === pid || e.splitAmongPids.includes(pid),
  ).length;
}

// How many active expenses use a category.
export function expenseCountForCategory(categoryId, expenses) {
  return activeExpenses(expenses).filter((e) => e.categoryId === categoryId).length;
}

// Digits typed into the amount field → integer rupees, or null.
export function parseAmount(text) {
  const digits = (text ?? '').replace(/[,\s₹]/g, '');
  if (!/^\d+$/.test(digits)) return null;
  return Number(digits);
}
