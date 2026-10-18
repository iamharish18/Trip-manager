// Checks which screen the app lands on for logged-out and logged-in users,
// using the real route files in src/app with Firebase mocked out.

import { renderRouter, screen } from 'expo-router/testing-library';

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
    onChange(tripId === 't1' ? mockTrip : null);
    return () => {};
  },
  subscribeToParticipants: (tripId, onChange) => {
    onChange(tripId === 't1' ? mockParticipants : []);
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

  it('opens a trip on the Expenses placeholder', async () => {
    await renderRouter('./src/app', { initialUrl: '/trips/t1' });
    expect(screen.getByText('Expenses are coming soon')).toBeTruthy();
  });

  it('explains when a trip is not available', async () => {
    await renderRouter('./src/app', { initialUrl: '/trips/missing' });
    expect(screen.getByText('Trip not available')).toBeTruthy();
  });
});
