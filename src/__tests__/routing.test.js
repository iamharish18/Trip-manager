// Checks which screen the app lands on for logged-out and logged-in users,
// using the real route files in src/app with Firebase mocked out.

import { renderRouter, screen, waitFor } from 'expo-router/testing-library';

// Rendering the whole app is slow on a cold Jest cache; allow for it.
jest.setTimeout(20000);

let mockSession;

const mockTrip = {
  id: 't1',
  name: 'Goa trip',
  startDate: '2026-12-12',
  endDate: null,
  creatorUid: 'u1',
  memberUids: ['u1'],
  status: 'active',
  joinCode: 'GQA7K2',
};
const mockParticipants = [
  { id: 'p1', name: 'Rahul', claimedByUid: 'u1', addedAt: null },
  { id: 'p2', name: 'Amit', claimedByUid: null, addedAt: null },
];
// A trip someone else created, which u1 joined (as Rahul).
const mockJoinedTrip = {
  ...mockTrip,
  id: 't2',
  name: 'Manali trip',
  creatorUid: 'u9',
  memberUids: ['u9', 'u1'],
  joinCode: 'MNL234',
};
const mockJoinedParticipants = [
  { id: 'q9', name: 'Zoya', claimedByUid: 'u9', addedAt: null },
  { id: 'q1', name: 'Rahul', claimedByUid: 'u1', addedAt: null },
  { id: 'q3', name: 'Priya', claimedByUid: null, leftAt: { seconds: 1 }, addedAt: null },
];
// The same trip after closing (t3), while reopened (t4) and once final (t5).
const mockHoursAgo = (h) => ({ toMillis: () => Date.now() - h * 60 * 60 * 1000 });
const mockClosedTrip = { ...mockTrip, id: 't3', status: 'closed' };
const mockReopenedTrip = {
  ...mockTrip,
  id: 't4',
  status: 'reopened',
  reopenUsed: true,
  reopenedAt: mockHoursAgo(1),
};
const mockFinalTrip = {
  ...mockTrip,
  id: 't5',
  status: 'final',
  reopenUsed: true,
  reopenedAt: mockHoursAgo(30),
};
const mockTrips = {
  t1: mockTrip,
  t2: mockJoinedTrip,
  t3: mockClosedTrip,
  t4: mockReopenedTrip,
  t5: mockFinalTrip,
};
const mockPeople = {
  t1: mockParticipants,
  t2: mockJoinedParticipants,
  t3: mockParticipants,
  t4: mockParticipants,
  t5: mockParticipants,
};
const mockSettlements = {
  t3: [
    {
      id: 's1',
      fromPid: 'p2',
      toPid: 'p1',
      amount: 600,
      round: 1,
      isPaid: false,
      isRecordedPayment: false,
    },
  ],
  t5: [
    {
      id: 's0',
      fromPid: 'p2',
      toPid: 'p1',
      amount: 600,
      round: 1,
      isPaid: true,
      isRecordedPayment: true,
    },
  ],
};
let mockExpenses = [];
const mockCategories = [{ id: 'c-fuel', name: 'Fuel', createdAt: null }];
const cabExpense = {
  id: 'e1',
  amount: 1201,
  paidByPid: 'p1',
  categoryId: 'travel',
  date: '2026-12-14',
  description: 'Cab to Baga',
  splitAmongPids: ['p1', 'p2'],
  createdAt: null,
  isDeleted: false,
};

jest.mock('@/state/session', () => ({
  SessionProvider: ({ children }) => children,
  useSession: () => mockSession,
}));
jest.mock('@/services/firebase', () => ({ auth: {}, db: {} }));
jest.mock('@react-native-firebase/auth', () => ({}));
jest.mock('@react-native-firebase/firestore', () => ({}));
jest.mock('@/services/trips', () => ({
  subscribeToMyTrips: (uid, onChange) => {
    onChange([mockTrip]);
    return () => {};
  },
  subscribeToTrip: (tripId, onChange) => {
    onChange(mockTrips[tripId] ?? null);
    return () => {};
  },
  subscribeToParticipants: (tripId, onChange) => {
    onChange(mockPeople[tripId] ?? []);
    return () => {};
  },
}));
let mockPermission = 'undetermined';
const mockRequestPermission = jest.fn(() =>
  Promise.resolve({ status: 'granted', canAskAgain: true }),
);
jest.mock('@/services/notifications', () => ({
  configureNotificationDisplay: () => {},
  getPermission: () => Promise.resolve({ status: mockPermission, canAskAgain: true }),
  requestPermission: () => mockRequestPermission(),
  getPushToken: () => Promise.resolve('ExponentPushToken[test]'),
  saveTokenToTrips: () => Promise.resolve(),
  removeTokenFromTrips: () => Promise.resolve(),
  catchUpNotifications: () => Promise.resolve(),
  listenForTaps: () => () => {},
  notifyNewExpense: () => Promise.resolve(),
  notifyTripEvent: () => Promise.resolve(),
}));
jest.mock('@/services/lifecycle', () => ({
  subscribeToSettlements: (tripId, onChange) => {
    onChange(mockSettlements[tripId] ?? []);
    return () => {};
  },
  finaliseIfExpired: () => Promise.resolve(null),
  closeTrip: () => Promise.resolve({ status: 'closed', settlements: [] }),
  reopenTrip: () => Promise.resolve({}),
  markSettlement: () => Promise.resolve(),
}));
let mockOffline = false;
jest.mock('@/services/connection', () => ({
  subscribeToConnection: (uid, onChange) => {
    onChange(mockOffline);
    return () => {};
  },
}));
let mockComments = [];
jest.mock('@/services/comments', () => ({
  subscribeToComments: (tripId, onChange) => {
    onChange(tripId === 't1' ? mockComments : []);
    return () => {};
  },
}));
jest.mock('@/services/expenses', () => ({
  subscribeToExpenses: (tripId, onChange) => {
    onChange(tripId === 't1' ? mockExpenses : []);
    return () => {};
  },
  subscribeToCategories: (tripId, onChange) => {
    onChange(tripId === 't1' ? mockCategories : []);
    return () => {};
  },
}));

const LOGGED_OUT = { isLoading: false, user: null, profile: null, displayName: '' };
const LOGGED_IN = {
  isLoading: false,
  user: { uid: 'u1', email: 'rahul@example.com' },
  profile: { name: 'Rahul' },
  displayName: 'Rahul',
};

describe('when logged out', () => {
  beforeEach(() => {
    mockSession = LOGGED_OUT;
  });

  it('opens on Log in', async () => {
    await renderRouter('./src/app', { initialUrl: '/' });
    expect(screen).toHavePathname('/login');
    expect(screen.getByText('Split trip costs with friends')).toBeTruthy();
  });

  it.each(['/home', '/account', '/trips/new', '/trips/t1/members'])(
    'cannot reach %s',
    async (url) => {
      await renderRouter('./src/app', { initialUrl: url });
      expect(screen).toHavePathname('/login');
    },
  );
});

describe('when logged in', () => {
  beforeEach(() => {
    mockSession = LOGGED_IN;
    mockExpenses = [];
    mockComments = [];
    mockPermission = 'undetermined';
    mockRequestPermission.mockClear();
    mockOffline = false;
  });

  it('opens on Home with the trip list', async () => {
    await renderRouter('./src/app', { initialUrl: '/' });
    expect(screen).toHavePathname('/home');
    expect(screen.getByText('Your trips')).toBeTruthy();
    expect(screen.getByText('Goa trip')).toBeTruthy();
    expect(screen.getByText('From 12 Dec 2026 · 2 people')).toBeTruthy();
  });

  it('cannot reach Log in', async () => {
    await renderRouter('./src/app', { initialUrl: '/login' });
    expect(screen).toHavePathname('/home');
  });

  it('opens Create trip', async () => {
    await renderRouter('./src/app', { initialUrl: '/trips/new' });
    expect(screen).toHavePathname('/trips/new');
    expect(screen.getByText('Who’s going? · 1 of 20')).toBeTruthy();
  });

  it('shows the Members tab with the Trip ID and people', async () => {
    await renderRouter('./src/app', { initialUrl: '/trips/t1/members' });
    expect(screen).toHavePathname('/trips/t1/members');
    expect(screen.getByText('GQA7K2')).toBeTruthy();
    expect(screen.getByText('Not joined yet')).toBeTruthy();
    expect(screen.getByText('Creator')).toBeTruthy();
    expect(screen.getByText('Add person')).toBeTruthy();
  });

  it('opens a trip on the Expenses tab, empty at first', async () => {
    await renderRouter('./src/app', { initialUrl: '/trips/t1' });
    expect(screen.getByText('No expenses yet')).toBeTruthy();
    expect(screen.getByLabelText('Add expense')).toBeTruthy();
  });

  it('lists expenses with the total and your position', async () => {
    mockExpenses = [cabExpense, { ...cabExpense, id: 'e2', amount: 500, isDeleted: true }];
    await renderRouter('./src/app', { initialUrl: '/trips/t1' });
    expect(screen.getByText('Cab to Baga')).toBeTruthy();
    expect(screen.getByText('You paid')).toBeTruthy();
    // ₹1,201 split between 2: Rahul (payer) ₹601, Amit ₹600. Deleted ₹500 ignored.
    expect(screen.getAllByText('₹1,201').length).toBeGreaterThan(0);
    expect(screen.getByText('You’re owed ₹600')).toBeTruthy();
  });

  it('opens Add expense with the split preview', async () => {
    await renderRouter('./src/app', { initialUrl: '/trips/t1/expenses/new' });
    expect(screen.getByText('Split equally among 2')).toBeTruthy();
    expect(screen.getByText('Fuel')).toBeTruthy();
  });

  it('shows an expense with its split', async () => {
    mockExpenses = [cabExpense];
    await renderRouter('./src/app', { initialUrl: '/trips/t1/expenses/e1' });
    expect(screen.getByText('Split equally among 2')).toBeTruthy();
    expect(screen.getByText('₹601')).toBeTruthy();
    expect(screen.getByText('₹600')).toBeTruthy();
    expect(screen.getByLabelText('Delete expense')).toBeTruthy();
  });

  it('shows Home cards with the total and your balance', async () => {
    mockExpenses = [cabExpense];
    await renderRouter('./src/app', { initialUrl: '/home' });
    expect(screen.getByText('Total ₹1,201')).toBeTruthy();
    expect(screen.getByText('You’re owed ₹600')).toBeTruthy();
  });

  it('shows balances as all square before any expenses', async () => {
    await renderRouter('./src/app', { initialUrl: '/trips/t1/balances' });
    expect(screen.getByText('You’re all square')).toBeTruthy();
    expect(screen.getByText('Add expenses to see balances.')).toBeTruthy();
    expect(screen.getByText('Who pays whom appears when the trip is closed.')).toBeTruthy();
  });

  it('shows each person’s paid, share and net', async () => {
    mockExpenses = [cabExpense];
    await renderRouter('./src/app', { initialUrl: '/trips/t1/balances' });
    expect(screen.getByText('You’re owed ₹600')).toBeTruthy();
    expect(screen.getByText('Paid ₹1,201 · Share ₹601')).toBeTruthy();
    expect(screen.getByText('Paid ₹0 · Share ₹600')).toBeTruthy();
    expect(screen.getByText('+₹600')).toBeTruthy();
    expect(screen.getByText('−₹600')).toBeTruthy();
  });

  it('shows no chart before any spending', async () => {
    await renderRouter('./src/app', { initialUrl: '/trips/t1/insights' });
    expect(screen.getByText('No spending yet')).toBeTruthy();
  });

  it('shows spending by category with percentages', async () => {
    mockExpenses = [
      cabExpense,
      { ...cabExpense, id: 'e2', amount: 3603, categoryId: 'food', description: 'Dinner' },
    ];
    await renderRouter('./src/app', { initialUrl: '/trips/t1/insights' });
    expect(screen.getByText('₹4,804')).toBeTruthy();
    expect(screen.getByText('75%')).toBeTruthy();
    expect(screen.getByText('25%')).toBeTruthy();
    expect(screen.getByText('Food')).toBeTruthy();
    expect(screen.getByText('Travel')).toBeTruthy();
  });

  it('shows comments on an expense, with Sending… for unsynced ones', async () => {
    mockExpenses = [cabExpense];
    const at = (date) => ({ toMillis: () => date.getTime(), toDate: () => date });
    mockComments = [
      {
        id: 'c1',
        expenseId: 'e1',
        text: 'Was this including tip?',
        authorUid: 'u2',
        authorPid: 'p2',
        createdAt: at(new Date(2026, 11, 14, 21, 42)),
        pending: false,
      },
      {
        id: 'c2',
        expenseId: 'e1',
        text: 'Yes, ₹200 tip',
        authorUid: 'u1',
        authorPid: 'p1',
        createdAt: null,
        pending: true,
      },
    ];
    await renderRouter('./src/app', { initialUrl: '/trips/t1/expenses/e1' });
    expect(screen.getByText('Was this including tip?')).toBeTruthy();
    expect(screen.getByText('You · Sending…')).toBeTruthy();
    expect(screen.getByLabelText('Comment')).toBeTruthy();
    // Only your own comment can be deleted.
    expect(screen.getAllByLabelText('Delete comment')).toHaveLength(1);
  });

  it('shows comment counts on the Expenses list', async () => {
    mockExpenses = [cabExpense];
    mockComments = [
      { id: 'c1', expenseId: 'e1', text: 'a', authorUid: 'u1', authorPid: 'p1' },
      { id: 'c2', expenseId: 'e1', text: 'b', authorUid: 'u1', authorPid: 'p1' },
    ];
    await renderRouter('./src/app', { initialUrl: '/trips/t1' });
    expect(screen.getByText('You paid · 2 comments')).toBeTruthy();
  });

  it('asks Android for notification permission right after login (on by default)', async () => {
    await renderRouter('./src/app', { initialUrl: '/home' });
    await waitFor(() => expect(mockRequestPermission).toHaveBeenCalledTimes(1));
  });

  it('does not ask again once notifications are allowed', async () => {
    mockPermission = 'granted';
    await renderRouter('./src/app', { initialUrl: '/home' });
    expect(await screen.findByText('Your trips')).toBeTruthy();
    expect(mockRequestPermission).not.toHaveBeenCalled();
  });

  it('shows the Notifications switch on Account', async () => {
    mockPermission = 'granted';
    await renderRouter('./src/app', { initialUrl: '/account' });
    expect(await screen.findByLabelText('Notifications')).toBeTruthy();
    expect(screen.getByText('When friends add expenses to your trips')).toBeTruthy();
  });

  it('offers Close trip to the creator of an Active trip', async () => {
    await renderRouter('./src/app', { initialUrl: '/trips/t1/settings' });
    expect(screen.getAllByText('Close trip').length).toBeGreaterThan(0);
  });

  it('shows Settle up on a closed trip, with Mark paid', async () => {
    await renderRouter('./src/app', { initialUrl: '/trips/t3/balances' });
    expect(screen.getByText('Trip closed')).toBeTruthy();
    expect(screen.getByText('Settle up · 0 of 1 paid')).toBeTruthy();
    expect(screen.getByText('Mark paid')).toBeTruthy();
    expect(screen.queryByText('Who pays whom appears when the trip is closed.')).toBeNull();
  });

  it('locks a closed trip: no + button, Reopen offered', async () => {
    await renderRouter('./src/app', { initialUrl: '/trips/t3' });
    expect(screen.queryByLabelText('Add expense')).toBeNull();
    await renderRouter('./src/app', { initialUrl: '/trips/t3/settings' });
    expect(screen.getByText('Reopen for 24 hours')).toBeTruthy();
  });

  it('shows the countdown while reopened, and Close now', async () => {
    await renderRouter('./src/app', { initialUrl: '/trips/t4' });
    expect(screen.getByText(/Reopened · locks again in 2[23] h/)).toBeTruthy();
    expect(screen.getByLabelText('Add expense')).toBeTruthy();
    await renderRouter('./src/app', { initialUrl: '/trips/t4/settings' });
    expect(screen.getAllByText('Close now').length).toBeGreaterThan(0);
  });

  it('shows a final trip with earlier payments and nothing left to pay', async () => {
    await renderRouter('./src/app', { initialUrl: '/trips/t5/balances' });
    expect(screen.getByText('Trip is final')).toBeTruthy();
    expect(screen.getByText('Earlier payments')).toBeTruthy();
    expect(screen.getByText('Everyone’s settled up. Nothing to pay.')).toBeTruthy();
  });

  it('shows Synced in the trip header when everything is saved', async () => {
    await renderRouter('./src/app', { initialUrl: '/trips/t1' });
    expect(screen.getByLabelText('Sync status: Synced')).toBeTruthy();
    expect(screen.queryByText('You’re offline · changes will sync later')).toBeNull();
  });

  it('shows Saving… while changes are waiting to upload', async () => {
    mockExpenses = [{ ...cabExpense, pending: true }];
    await renderRouter('./src/app', { initialUrl: '/trips/t1' });
    expect(screen.getByLabelText('Sync status: Saving…')).toBeTruthy();
  });

  it('shows the offline banner and icon when offline', async () => {
    mockOffline = true;
    await renderRouter('./src/app', { initialUrl: '/trips/t1' });
    expect(
      await screen.findByText('You’re offline · changes will sync later', {}, { timeout: 6000 }),
    ).toBeTruthy();
    expect(screen.getByLabelText('Sync status: Offline')).toBeTruthy();
  });

  it('opens Join trip from its route', async () => {
    await renderRouter('./src/app', { initialUrl: '/join' });
    expect(screen.getByText('Join a trip')).toBeTruthy();
    expect(screen.getByText('Find trip')).toBeTruthy();
  });

  it('shows a joined trip’s members without creator controls', async () => {
    await renderRouter('./src/app', { initialUrl: '/trips/t2/members' });
    expect(screen.getByText('Left the trip')).toBeTruthy();
    expect(screen.getByText('Joined')).toBeTruthy();
    expect(screen.queryByText('Add person')).toBeNull();
    expect(screen.queryByLabelText('Options for Priya')).toBeNull();
  });

  it('offers Leave trip to members but not to the creator', async () => {
    await renderRouter('./src/app', { initialUrl: '/trips/t2/settings' });
    expect(screen.getByText('Leave trip')).toBeTruthy();
    expect(screen.getByText('Only the trip’s creator can change its name and dates.')).toBeTruthy();
  });

  it('does not offer Leave trip to the creator', async () => {
    await renderRouter('./src/app', { initialUrl: '/trips/t1/settings' });
    expect(screen.getByText('Edit trip')).toBeTruthy();
    expect(screen.queryByText('Leave trip')).toBeNull();
  });

  it('marks people who left on Balances', async () => {
    await renderRouter('./src/app', { initialUrl: '/trips/t2/balances' });
    expect(screen.getByText(' · left')).toBeTruthy();
  });

  it('shows categories with how often each is used', async () => {
    mockExpenses = [{ ...cabExpense, categoryId: 'c-fuel' }];
    await renderRouter('./src/app', { initialUrl: '/trips/t1/categories' });
    expect(screen.getByText('Fuel')).toBeTruthy();
    expect(screen.getByText('Used in 1 expense')).toBeTruthy();
    expect(screen.getByLabelText("Fuel can't be deleted")).toBeTruthy();
  });

  it('explains when a trip is not available', async () => {
    await renderRouter('./src/app', { initialUrl: '/trips/missing' });
    expect(screen.getByText('Trip not available')).toBeTruthy();
  });
});
