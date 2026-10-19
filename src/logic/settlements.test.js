import { formatRupees } from './format';
import {
  netsAfterPayments,
  samePlan,
  settleUpSummary,
  settlementPlan,
  simplifyDebts,
} from './settlements';

const expense = (amount, paidByPid, splitAmongPids, overrides = {}) => ({
  amount,
  paidByPid,
  splitAmongPids,
  categoryId: 'food',
  isDeleted: false,
  ...overrides,
});

// Applies payments to nets and returns what's left for each person.
function apply(nets, payments) {
  const left = { ...nets };
  for (const p of payments) {
    left[p.fromPid] += p.amount;
    left[p.toPid] -= p.amount;
  }
  return left;
}

describe('simplifyDebts', () => {
  it('settles the mockup trip with everyone paying the one creditor', () => {
    const payments = simplifyDebts({ you: 11100, priya: -4500, rahul: -5700, amit: -900 });
    expect(payments).toEqual([
      { fromPid: 'rahul', toPid: 'you', amount: 5700 },
      { fromPid: 'priya', toPid: 'you', amount: 4500 },
      { fromPid: 'amit', toPid: 'you', amount: 900 },
    ]);
  });

  it('pays the largest creditor from the largest debtor first', () => {
    expect(simplifyDebts({ a: 500, b: 300, c: -600, d: -200 })).toEqual([
      { fromPid: 'c', toPid: 'a', amount: 500 },
      { fromPid: 'd', toPid: 'b', amount: 200 },
      { fromPid: 'c', toPid: 'b', amount: 100 },
    ]);
  });

  it('returns nothing when everyone is square', () => {
    expect(simplifyDebts({ a: 0, b: 0 })).toEqual([]);
    expect(simplifyDebts({})).toEqual([]);
  });

  it('is the same whatever order people are listed in', () => {
    const one = simplifyDebts({ a: 100, b: 100, c: -100, d: -100 });
    const two = simplifyDebts({ d: -100, c: -100, b: 100, a: 100 });
    expect(one).toEqual(two);
  });

  it('always clears every balance, with at most n − 1 whole-rupee payments (random cases)', () => {
    let seed = 11;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let trip = 0; trip < 2000; trip += 1) {
      const n = 2 + Math.floor(random() * 19);
      const nets = {};
      let sum = 0;
      for (let k = 0; k < n - 1; k += 1) {
        const net = Math.floor(random() * 200001) - 100000;
        nets[`p${k}`] = net;
        sum += net;
      }
      nets[`p${n - 1}`] = -sum; // nets always add up to zero
      const payments = simplifyDebts(nets);
      expect(payments.length).toBeLessThanOrEqual(n - 1);
      for (const p of payments) {
        expect(Number.isInteger(p.amount)).toBe(true);
        expect(p.amount).toBeGreaterThan(0);
        expect(p.fromPid).not.toBe(p.toPid);
      }
      expect(Object.values(apply(nets, payments)).every((v) => v === 0)).toBe(true);
    }
  });
});

describe('netsAfterPayments', () => {
  it('counts payments already made', () => {
    const balances = { rahul: { net: -1000 }, priya: { net: 1000 } };
    expect(
      netsAfterPayments(balances, [{ fromPid: 'rahul', toPid: 'priya', amount: 1000 }]),
    ).toEqual({ rahul: 0, priya: 0 });
  });
});

describe('settlementPlan', () => {
  const people = [{ id: 'rahul' }, { id: 'priya' }, { id: 'amit' }];

  it('matches the SPEC §9 example across a reopen', () => {
    // First close: Rahul owes Priya ₹1,000 (Amit is square).
    const before = [expense(2000, 'priya', ['rahul', 'priya'])];
    const first = settlementPlan(before, people);
    expect(first).toEqual([{ fromPid: 'rahul', toPid: 'priya', amount: 1000 }]);

    // Rahul pays; then a ₹300 expense paid by Priya, split 3 ways.
    const after = [...before, expense(300, 'priya', ['rahul', 'priya', 'amit'])];
    const final = settlementPlan(after, people, first);
    // Amit and Rahul both owe ₹100; ties go in id order.
    expect(final).toEqual([
      { fromPid: 'amit', toPid: 'priya', amount: 100 },
      { fromPid: 'rahul', toPid: 'priya', amount: 100 },
    ]);
  });

  it('can reverse a payment when an expense is removed after a reopen', () => {
    const before = [expense(2000, 'priya', ['rahul', 'priya'])];
    const paid = settlementPlan(before, people);
    const removed = [{ ...before[0], isDeleted: true }];
    expect(settlementPlan(removed, people, paid)).toEqual([
      { fromPid: 'priya', toPid: 'rahul', amount: 1000 },
    ]);
  });
});

describe('samePlan', () => {
  it('compares plans ignoring order', () => {
    const a = [
      { fromPid: 'x', toPid: 'y', amount: 5 },
      { fromPid: 'z', toPid: 'y', amount: 3 },
    ];
    expect(samePlan(a, [...a].reverse())).toBe(true);
    expect(samePlan(a, [a[0]])).toBe(false);
  });
});

describe('settleUpSummary', () => {
  const names = { you: 'Rahul', priya: 'Priya', amit: 'Amit', zoya: 'Zoya' };
  const nameOf = (pid) => names[pid];
  const summary = (pid, list) => settleUpSummary(pid, list, nameOf, formatRupees);

  it('describes one payment each way', () => {
    const list = [{ fromPid: 'priya', toPid: 'you', amount: 4500 }];
    expect(summary('priya', list)).toBe('You owe Rahul ₹4,500.');
    expect(summary('you', list)).toBe('Priya owes you ₹4,500.');
    expect(summary('amit', list)).toBe('You’re all settled.');
  });

  it('totals several payments', () => {
    const list = [
      { fromPid: 'priya', toPid: 'you', amount: 4500 },
      { fromPid: 'amit', toPid: 'you', amount: 900 },
      { fromPid: 'zoya', toPid: 'priya', amount: 100 },
    ];
    expect(summary('you', list)).toBe('2 people owe you ₹5,400.');
    expect(summary('priya', list)).toBe('You owe Rahul ₹4,500. Zoya owes you ₹100.');
  });
});
