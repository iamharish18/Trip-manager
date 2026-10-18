import {
  computeBalances,
  expenseCountFor,
  expenseCountForCategory,
  parseAmount,
  splitEqually,
  totalSpent,
  totalsByCategory,
} from './money';

const expense = (overrides) => ({
  amount: 100,
  paidByPid: 'a',
  splitAmongPids: ['a', 'b', 'c'],
  categoryId: 'food',
  isDeleted: false,
  ...overrides,
});

describe('splitEqually', () => {
  it('matches the SPEC example: ₹100 among 3, paid by Priya', () => {
    expect(splitEqually(100, ['priya', 'rahul', 'amit'], 'priya')).toEqual({
      priya: 34,
      rahul: 33,
      amit: 33,
    });
  });

  it('splits evenly when there is no remainder', () => {
    expect(splitEqually(1200, ['a', 'b', 'c', 'd'], 'b')).toEqual({
      a: 300,
      b: 300,
      c: 300,
      d: 300,
    });
  });

  it('gives the payer all leftover rupees', () => {
    expect(splitEqually(10, ['a', 'b', 'c', 'd'], 'c')).toEqual({ a: 2, b: 2, c: 4, d: 2 });
  });

  it('handles amounts smaller than the number of people', () => {
    expect(splitEqually(2, ['a', 'b', 'c'], 'b')).toEqual({ a: 0, b: 2, c: 0 });
  });

  it('handles one person', () => {
    expect(splitEqually(999, ['a'], 'a')).toEqual({ a: 999 });
  });

  it('always adds up to the amount, in whole rupees (random cases)', () => {
    let seed = 42;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let i = 0; i < 2000; i += 1) {
      const n = 1 + Math.floor(random() * 20);
      const pids = Array.from({ length: n }, (_, k) => `p${k}`);
      const amount = 1 + Math.floor(random() * 1000000);
      const payer = pids[Math.floor(random() * n)];
      const shares = splitEqually(amount, pids, payer);
      const values = Object.values(shares);
      expect(values.reduce((s, v) => s + v, 0)).toBe(amount);
      expect(values.every(Number.isInteger)).toBe(true);
      const base = Math.floor(amount / n);
      for (const pid of pids) {
        if (pid !== payer) expect(shares[pid]).toBe(base);
      }
      expect(shares[payer] - base).toBeLessThan(n);
    }
  });
});

describe('computeBalances', () => {
  const participants = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];

  it('works out paid, share and net per person', () => {
    const balances = computeBalances(
      [
        expense({ amount: 18000, paidByPid: 'a', splitAmongPids: ['a', 'b', 'c', 'd'] }),
        expense({ amount: 2400, paidByPid: 'b', splitAmongPids: ['a', 'b', 'c', 'd'] }),
        expense({ amount: 1200, paidByPid: 'c', splitAmongPids: ['a', 'b', 'c', 'd'] }),
        expense({ amount: 6000, paidByPid: 'd', splitAmongPids: ['a', 'b', 'c', 'd'] }),
      ],
      participants,
    );
    expect(balances).toEqual({
      a: { paid: 18000, share: 6900, net: 11100 },
      b: { paid: 2400, share: 6900, net: -4500 },
      c: { paid: 1200, share: 6900, net: -5700 },
      d: { paid: 6000, share: 6900, net: -900 },
    });
  });

  it('only charges people in each expense’s split', () => {
    const balances = computeBalances(
      [expense({ amount: 300, paidByPid: 'a', splitAmongPids: ['a', 'b', 'c'] })],
      participants,
    );
    expect(balances.d).toEqual({ paid: 0, share: 0, net: 0 });
    expect(balances.a.net).toBe(200);
  });

  it('ignores deleted expenses', () => {
    const balances = computeBalances([expense({ isDeleted: true })], participants);
    expect(Object.values(balances).every((b) => b.net === 0 && b.paid === 0)).toBe(true);
  });

  it('always nets to zero across everyone (random trips)', () => {
    let seed = 7;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let trip = 0; trip < 200; trip += 1) {
      const n = 2 + Math.floor(random() * 10);
      const pids = Array.from({ length: n }, (_, k) => `p${k}`);
      const expenses = Array.from({ length: 1 + Math.floor(random() * 30) }, () => {
        const split = pids.slice(0, 1 + Math.floor(random() * n));
        return expense({
          amount: 1 + Math.floor(random() * 50000),
          paidByPid: split[Math.floor(random() * split.length)],
          splitAmongPids: split,
          isDeleted: random() < 0.1,
        });
      });
      const balances = computeBalances(
        expenses,
        pids.map((id) => ({ id })),
      );
      const values = Object.values(balances);
      expect(values.reduce((s, b) => s + b.net, 0)).toBe(0);
      expect(values.reduce((s, b) => s + b.paid, 0)).toBe(totalSpent(expenses));
    }
  });
});

describe('totals', () => {
  const expenses = [
    expense({ amount: 18000, categoryId: 'stay' }),
    expense({ amount: 2400, categoryId: 'food' }),
    expense({ amount: 600, categoryId: 'food' }),
    expense({ amount: 1200, categoryId: 'travel' }),
    expense({ amount: 999, categoryId: 'travel', isDeleted: true }),
  ];

  it('totals active expenses', () => {
    expect(totalSpent(expenses)).toBe(22200);
  });

  it('totals by category, largest first', () => {
    expect(totalsByCategory(expenses)).toEqual([
      { categoryId: 'stay', total: 18000 },
      { categoryId: 'food', total: 3000 },
      { categoryId: 'travel', total: 1200 },
    ]);
  });
});

describe('expense counts', () => {
  const expenses = [
    expense({ paidByPid: 'a', splitAmongPids: ['a', 'b'], categoryId: 'food' }),
    expense({ paidByPid: 'b', splitAmongPids: ['b', 'c'], categoryId: 'tips' }),
    expense({ paidByPid: 'c', splitAmongPids: ['c', 'd'], categoryId: 'tips', isDeleted: true }),
  ];

  it('counts expenses a person paid for or shares in', () => {
    expect(expenseCountFor('a', expenses)).toBe(1);
    expect(expenseCountFor('b', expenses)).toBe(2);
    expect(expenseCountFor('d', expenses)).toBe(0);
  });

  it('counts expenses using a category', () => {
    expect(expenseCountForCategory('tips', expenses)).toBe(1);
    expect(expenseCountForCategory('stay', expenses)).toBe(0);
  });
});

describe('parseAmount', () => {
  it('reads whole rupees, ignoring commas and spaces', () => {
    expect(parseAmount('1,200')).toBe(1200);
    expect(parseAmount(' 10,00,000 ')).toBe(1000000);
    expect(parseAmount('₹500')).toBe(500);
  });

  it('rejects anything else', () => {
    expect(parseAmount('')).toBeNull();
    expect(parseAmount('12.50')).toBeNull();
    expect(parseAmount('-5')).toBeNull();
    expect(parseAmount('abc')).toBeNull();
  });
});
