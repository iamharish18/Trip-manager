// Checks which screen the app lands on for logged-out and logged-in users,
// using the real route files in src/app with Firebase mocked out.

import { renderRouter, screen } from 'expo-router/testing-library';

let mockSession;

jest.mock('@/state/session', () => ({
  SessionProvider: ({ children }) => children,
  useSession: () => mockSession,
}));
jest.mock('@/services/firebase', () => ({ auth: {}, db: {} }));
jest.mock('@react-native-firebase/auth', () => ({}));
jest.mock('@react-native-firebase/firestore', () => ({}));

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

  it('cannot reach Home', async () => {
    await renderRouter('./src/app', { initialUrl: '/home' });
    expect(screen).toHavePathname('/login');
  });

  it('cannot reach Account', async () => {
    await renderRouter('./src/app', { initialUrl: '/account' });
    expect(screen).toHavePathname('/login');
  });
});

describe('when logged in', () => {
  beforeEach(() => {
    mockSession = LOGGED_IN;
  });

  it('opens on Home', async () => {
    await renderRouter('./src/app', { initialUrl: '/' });
    expect(screen).toHavePathname('/home');
    expect(screen.getByText('Your trips')).toBeTruthy();
  });

  it('cannot reach Log in', async () => {
    await renderRouter('./src/app', { initialUrl: '/login' });
    expect(screen).toHavePathname('/home');
  });
});
