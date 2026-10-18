// Start route ("/"). Always reachable, so the app never opens on an
// unmatched page; it sends you to Home or Log in.

import { Redirect } from 'expo-router';

import { useSession } from '@/state/session';

export default function Start() {
  const { user } = useSession();
  return <Redirect href={user ? '/home' : '/login'} />;
}
