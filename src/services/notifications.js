// Notifications for new expenses (SPEC §11), on the free plan: no server.
// Each member's phone saves its Expo push address on every trip it belongs
// to; the phone that adds an expense notifies the others through Expo's
// push service once the expense has reached the server.

import {
  collection,
  deleteDoc,
  doc,
  getDocFromServer,
  getDocsFromServer,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where,
} from '@react-native-firebase/firestore';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { findCategory } from '@/logic/categories';
import { formatRupees } from '@/logic/format';
import {
  EXPENSE_CHANNEL,
  expenseMessage,
  pushBatches,
  recipientTokens,
  tripEventBody,
} from '@/logic/notifications';
import { settleUpSummary } from '@/logic/settlements';

import { db, docExists } from './firebase';

const PUSH_URL = 'https://exp.host/--/api/v2/push/send';

// Show notifications as banners even while the app is open.
export function configureNotificationDisplay() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

// Android needs the channel before asking permission or getting a token.
async function ensureChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(EXPENSE_CHANNEL, {
    name: 'Trip updates',
    description: 'New expenses, and when a trip is closed or reopened',
    // Exported via `export *` in expo-notifications, which the lint rule can't follow.
    // eslint-disable-next-line import/namespace
    importance: Notifications.AndroidImportance.HIGH,
  });
}

// 'granted', 'denied' or 'undetermined'; plus whether Android will still
// show the system prompt.
export async function getPermission() {
  await ensureChannel();
  const settings = await Notifications.getPermissionsAsync();
  return { status: settings.status, canAskAgain: settings.canAskAgain };
}

export async function requestPermission() {
  await ensureChannel();
  const settings = await Notifications.requestPermissionsAsync();
  return { status: settings.status, canAskAgain: settings.canAskAgain };
}

// This phone's Expo push address. Needs internet.
export async function getPushToken() {
  await ensureChannel();
  const { data } = await Notifications.getExpoPushTokenAsync();
  return data;
}

const tokenRef = (tripId, uid) => doc(db, 'trips', tripId, 'pushTokens', uid);

export function saveTokenToTrips(uid, token, tripIds) {
  return Promise.all(
    tripIds.map((tripId) => setDoc(tokenRef(tripId, uid), { token, updatedAt: serverTimestamp() })),
  );
}

export function removeTokenFromTrips(uid, tripIds) {
  return Promise.all(tripIds.map((tripId) => deleteDoc(tokenRef(tripId, uid))));
}

async function postToExpo(messages) {
  const response = await fetch(PUSH_URL, {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify(messages),
  });
  if (!response.ok) throw new Error(`Push service error ${response.status}`);
}

/**
 * Notifies the trip's other members about an expense you added, at most
 * once: the "pending" flag is cleared first (in a transaction), then the
 * push is sent. Needs internet; does nothing if already sent or deleted.
 */
export async function notifyNewExpense(tripId, expenseId, uid) {
  const expenseRef = doc(db, 'trips', tripId, 'expenses', expenseId);
  const expense = await runTransaction(db, async (tx) => {
    const snap = await tx.get(expenseRef);
    if (!docExists(snap)) return null;
    const data = snap.data();
    if (!data.notifyPending || data.createdByUid !== uid) return null;
    tx.update(expenseRef, { notifyPending: false });
    return data.isDeleted ? null : data;
  });
  if (!expense) return;

  const [tripSnap, peopleSnap, categoriesSnap, tokensSnap] = await Promise.all([
    getDocFromServer(doc(db, 'trips', tripId)),
    getDocsFromServer(collection(db, 'trips', tripId, 'participants')),
    getDocsFromServer(collection(db, 'trips', tripId, 'categories')),
    getDocsFromServer(collection(db, 'trips', tripId, 'pushTokens')),
  ]);
  if (!docExists(tripSnap)) return;
  const trip = tripSnap.data();

  const tokens = recipientTokens(
    tokensSnap.docs.map((d) => ({ uid: d.id, token: d.data().token })),
    trip.memberUids,
    uid,
  );
  if (tokens.length === 0) return;

  const adder = peopleSnap.docs.map((d) => d.data()).find((p) => p.claimedByUid === uid);
  const category = findCategory(
    expense.categoryId,
    categoriesSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
  );
  const content = expenseMessage({
    tripName: trip.name,
    adderName: adder?.name ?? 'Someone',
    amount: expense.amount,
    description: expense.description,
    categoryName: category.name,
  });

  for (const batch of pushBatches(tokens, content, { tripId, expenseId })) {
    await postToExpo(batch);
  }
}

/**
 * Notifies the trip's other members that it was closed, finalised,
 * reopened (SPEC §9) or deleted (SPEC §13). `event` is 'closed', 'final',
 * 'reopened' or 'deleted'; for closes, each member gets their own "You
 * owe…" summary. Tapping opens Balances (or nothing, for a deleted trip).
 * Best effort: needs internet.
 */
export async function notifyTripEvent(tripId, actorUid, event, settlements = []) {
  const [tripSnap, peopleSnap, tokensSnap] = await Promise.all([
    getDocFromServer(doc(db, 'trips', tripId)),
    getDocsFromServer(collection(db, 'trips', tripId, 'participants')),
    getDocsFromServer(collection(db, 'trips', tripId, 'pushTokens')),
  ]);
  if (!docExists(tripSnap)) return;
  const trip = tripSnap.data();
  const people = peopleSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const nameOf = (pid) => people.find((p) => p.id === pid)?.name ?? 'Someone';

  const messages = [];
  const seen = new Set();
  for (const tokenDoc of tokensSnap.docs) {
    const uid = tokenDoc.id;
    const { token } = tokenDoc.data();
    if (uid === actorUid || !trip.memberUids.includes(uid) || !token || seen.has(token)) continue;
    seen.add(token);
    const pid = people.find((p) => p.claimedByUid === uid)?.id;
    const summary =
      event === 'deleted'
        ? (people.find((p) => p.claimedByUid === actorUid)?.name ?? 'The creator')
        : settleUpSummary(pid, settlements, nameOf, formatRupees);
    messages.push({
      to: token,
      title: trip.name,
      body: tripEventBody(event, summary),
      data: event === 'deleted' ? {} : { tripId, screen: 'balances' },
      channelId: EXPENSE_CHANNEL,
      priority: 'high',
    });
  }
  for (let i = 0; i < messages.length; i += 100) {
    await postToExpo(messages.slice(i, i + 100));
  }
}

// Sends any notifications still pending for expenses you added (e.g. added
// offline, or the app closed before they synced).
export async function catchUpNotifications(uid, tripIds) {
  for (const tripId of tripIds) {
    const pending = await getDocsFromServer(
      query(
        collection(db, 'trips', tripId, 'expenses'),
        where('createdByUid', '==', uid),
        where('notifyPending', '==', true),
      ),
    );
    for (const expenseDoc of pending.docs) {
      await notifyNewExpense(tripId, expenseDoc.id, uid).catch(() => {});
    }
  }
}

// Tapping a notification: calls `onOpen(data)` for taps while running and
// for the tap that launched the app. Returns a cleanup function.
export function listenForTaps(onOpen) {
  const last = Notifications.getLastNotificationResponse();
  if (last) {
    onOpen(last.notification.request.content.data);
    Notifications.clearLastNotificationResponse();
  }
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    onOpen(response.notification.request.content.data);
    Notifications.clearLastNotificationResponse();
  });
  return () => subscription.remove();
}
