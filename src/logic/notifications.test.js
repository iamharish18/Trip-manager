import { expenseMessage, notificationRoute, pushBatches, recipientTokens } from './notifications';

describe('expenseMessage', () => {
  it('uses the trip name as title and describes the expense', () => {
    expect(
      expenseMessage({
        tripName: 'Goa trip',
        adderName: 'Rahul',
        amount: 1200,
        description: 'Cab to Baga',
        categoryName: 'Travel',
      }),
    ).toEqual({ title: 'Goa trip', body: 'Rahul added ₹1,200 · Cab to Baga (Travel)' });
  });

  it('falls back to the category without a description', () => {
    expect(
      expenseMessage({
        tripName: 'Goa trip',
        adderName: 'Priya',
        amount: 100000,
        description: '',
        categoryName: 'Stay',
      }).body,
    ).toBe('Priya added ₹1,00,000 · Stay');
  });
});

describe('recipientTokens', () => {
  const docs = [
    { uid: 'me', token: 'T-me' },
    { uid: 'a', token: 'T-a' },
    { uid: 'b', token: 'T-b' },
    { uid: 'left', token: 'T-left' },
    { uid: 'c', token: 'T-a' }, // same phone, two accounts
    { uid: 'd', token: '' },
  ];

  it('notifies current members except the adder, once per phone', () => {
    expect(recipientTokens(docs, ['me', 'a', 'b', 'c', 'd'], 'me')).toEqual(['T-a', 'T-b']);
  });

  it('skips people who are no longer members', () => {
    expect(recipientTokens(docs, ['me', 'a'], 'me')).toEqual(['T-a']);
  });
});

describe('pushBatches', () => {
  it('builds high-priority messages on the expenses channel', () => {
    const [batch] = pushBatches(['T1'], { title: 'Goa', body: 'Hi' }, { tripId: 't' });
    expect(batch).toEqual([
      {
        to: 'T1',
        title: 'Goa',
        body: 'Hi',
        data: { tripId: 't' },
        channelId: 'expenses',
        priority: 'high',
      },
    ]);
  });

  it('splits into requests of at most 100', () => {
    const tokens = Array.from({ length: 250 }, (_, i) => `T${i}`);
    expect(pushBatches(tokens, { title: '', body: '' }, {}).map((b) => b.length)).toEqual([
      100, 100, 50,
    ]);
    expect(pushBatches([], { title: '', body: '' }, {})).toEqual([]);
  });
});

describe('notificationRoute', () => {
  it('opens the expense, or the trip', () => {
    expect(notificationRoute({ tripId: 't1', expenseId: 'e1' })).toBe('/trips/t1/expenses/e1');
    expect(notificationRoute({ tripId: 't1' })).toBe('/trips/t1');
    expect(notificationRoute(undefined)).toBeNull();
  });
});
