// Numbers for the Balances and Insights tabs (SPEC §8, §15.5).

/**
 * Whole-number percentages that always add up to exactly 100 (largest
 * remainder method). `values` are amounts; returns percentages in the same
 * order. All zeros give all zeros.
 */
export function wholePercentages(values) {
  const total = values.reduce((sum, v) => sum + v, 0);
  if (total <= 0) return values.map(() => 0);

  const exact = values.map((v) => (v / total) * 100);
  const result = exact.map(Math.floor);
  let left = 100 - result.reduce((sum, v) => sum + v, 0);

  // Give the leftover points to the largest fractional parts (ties: larger value first).
  const order = exact
    .map((e, i) => ({ i, fraction: e - Math.floor(e), value: values[i] }))
    .sort((a, b) => b.fraction - a.fraction || b.value - a.value);
  for (const { i } of order) {
    if (left === 0) break;
    result[i] += 1;
    left -= 1;
  }
  return result;
}

/**
 * People for the Balances tab: you first, then from most owed to most owing.
 * Ties keep the trip's usual order. Returns [{ participant, paid, share, net }].
 */
export function orderBalances(participants, balances, mePid) {
  const rows = participants.map((p, index) => ({
    participant: p,
    index,
    ...(balances[p.id] ?? { paid: 0, share: 0, net: 0 }),
  }));
  rows.sort((a, b) => {
    if (a.participant.id === mePid) return -1;
    if (b.participant.id === mePid) return 1;
    return b.net - a.net || a.index - b.index;
  });
  return rows.map(({ index, ...row }) => row);
}
