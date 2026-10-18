import { orderBalances, wholePercentages } from './insights';

describe('wholePercentages', () => {
  it('matches the mockup trip (65 / 22 / 9 / 4)', () => {
    expect(wholePercentages([18000, 6000, 2400, 1200])).toEqual([65, 22, 9, 4]);
  });

  it('adds up to 100 where plain rounding would not', () => {
    // Plain rounding gives 33 + 33 + 33 = 99.
    expect(wholePercentages([1, 1, 1])).toEqual([34, 33, 33]);
    // Plain rounding gives 17 × 6 = 102.
    const sixths = wholePercentages([1, 1, 1, 1, 1, 1]);
    expect(sixths.reduce((s, v) => s + v, 0)).toBe(100);
  });

  it('always adds up to 100 (random cases)', () => {
    let seed = 3;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let i = 0; i < 1000; i += 1) {
      const values = Array.from(
        { length: 1 + Math.floor(random() * 12) },
        () => 1 + Math.floor(random() * 100000),
      );
      const result = wholePercentages(values);
      expect(result.reduce((s, v) => s + v, 0)).toBe(100);
      result.forEach((p, k) =>
        expect(Math.abs(p - (values[k] / values.reduce((s, v) => s + v, 0)) * 100)).toBeLessThan(1),
      );
    }
  });

  it('handles a single category and no spending', () => {
    expect(wholePercentages([500])).toEqual([100]);
    expect(wholePercentages([])).toEqual([]);
    expect(wholePercentages([0, 0])).toEqual([0, 0]);
  });
});

describe('orderBalances', () => {
  const people = [
    { id: 'me', name: 'Rahul' },
    { id: 'a', name: 'Amit' },
    { id: 'p', name: 'Priya' },
    { id: 'z', name: 'Zoya' },
  ];
  const balances = {
    me: { paid: 0, share: 500, net: -500 },
    a: { paid: 6000, share: 6900, net: -900 },
    p: { paid: 2400, share: 0, net: 2400 },
    // Zoya has no entry yet: treated as all zeros.
  };

  it('puts you first, then most owed to most owing', () => {
    const rows = orderBalances(people, balances, 'me');
    expect(rows.map((r) => r.participant.id)).toEqual(['me', 'p', 'z', 'a']);
    expect(rows[2]).toEqual({ participant: people[3], paid: 0, share: 0, net: 0 });
  });

  it('works when you have no spot on the trip', () => {
    const rows = orderBalances(people, balances, null);
    expect(rows.map((r) => r.participant.id)).toEqual(['p', 'z', 'me', 'a']);
  });
});
