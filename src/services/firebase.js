// Single place where the app gets its Firebase instances.
// Firestore offline persistence is on by default in React Native Firebase.

import { getApp } from '@react-native-firebase/app';
import { getAuth } from '@react-native-firebase/auth';
import { getFirestore } from '@react-native-firebase/firestore';

const app = getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
