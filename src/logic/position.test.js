import { describePosition, payerLabel } from './position';

describe('describePosition', () => {
  it('describes being owed, owing, and being square', () => {
    expect(describePosition(11100)).toEqual({ text: 'You’re owed ₹11,100', tone: 'positive' });
    expect(describePosition(-900)).toEqual({ text: 'You owe ₹900', tone: 'negative' });
    expect(describePosition(0)).toEqual({ text: 'You’re all square', tone: 'neutral' });
  });
});

describe('payerLabel', () => {
  const people = [
    { id: 'p1', name: 'Rahul' },
    { id: 'p2', name: 'Priya' },
  ];

  it('says "You paid" for yourself and the name otherwise', () => {
    expect(payerLabel('p1', people, 'p1')).toBe('You paid');
    expect(payerLabel('p2', people, 'p1')).toBe('Priya paid');
    expect(payerLabel('gone', people, 'p1')).toBe('Someone paid');
  });
});
