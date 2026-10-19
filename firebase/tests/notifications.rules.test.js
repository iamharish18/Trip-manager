// Security rules tests for notifications (SPEC §11): push addresses, the
// "notification sent" flag on expenses, and the notifications switch.
// Run with `npm run test:rules`.

const fs = require('node:fs');
const path = require('node:path');
const {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} = require('@firebase/rules-unit-testing');
const {
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  setLogLevel,
  updateDoc,
} = require('firebase/firestore');

setLogLevel('error');

let testEnv;

const CREATOR = { uid: 'creator', email: 'creator@example.com' };
const MEMBER = { uid: 'member', email: 'member@example.com' };
const STRANGER = { uid: 'stranger', email: 'stranger@example.com' };

const dbAs = (user) => testEnv.authenticatedContext(user.uid, { email: user.email }).firestore();
const tokenRef = (db, uid) => doc(db, 'trips', 'trip1', 'pushTokens', uid);
const expenseRef = (db) => doc(db, 'trips', 'trip1', 'expenses', 'e1');

const newToken = (token = 'ExponentPushToken[abc]') => ({ token, updatedAt: serverTimestamp() });

async function seed({ status = 'active', notifyPending = true } = {}) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    const t = new Date('2026-10-01');
    await setDoc(doc(db, 'trips', 'trip1'), {
      name: 'Goa trip',
      startDate: '2026-12-12',
      endDate: null,
      creatorUid: CREATOR.uid,
      memberUids: [CREATOR.uid, MEMBER.uid],
      status,
      joinCode: 'GQA7K2',
      createdAt: t,
    });
    await setDoc(expenseRef(db), {
      amount: 1200,
      paidByPid: 'p-priya',
      categoryId: 'travel',
      date: '2026-12-14',
      description: 'Cab',
      splitAmongPids: ['p-rahul', 'p-priya'],
      createdByUid: MEMBER.uid,
      createdAt: t,
      updatedAt: t,
      isDeleted: false,
      notifyPending,
    });
    await setDoc(tokenRef(db, CREATOR.uid), { token: 'ExponentPushToken[creator]', updatedAt: t });
    await setDoc(doc(db, 'users', MEMBER.uid), {
      name: 'Priya',
      email: MEMBER.email,
      createdAt: t,
    });
  });
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-trip-manager',
    firestore: {
      rules: fs.readFileSync(path.join(__dirname, '..', 'firestore.rules'), 'utf8'),
    },
  });
});

afterEach(() => testEnv.clearFirestore());

afterAll(() => testEnv.cleanup());

describe('push addresses', () => {
  beforeEach(() => seed());

  it('lets members save and replace their own', async () => {
    const db = dbAs(MEMBER);
    await assertSucceeds(setDoc(tokenRef(db, MEMBER.uid), newToken()));
    await assertSucceeds(setDoc(tokenRef(db, MEMBER.uid), newToken('ExponentPushToken[new]')));
  });

  it("blocks saving someone else's, or as a non-member", async () => {
    await assertFails(setDoc(tokenRef(dbAs(MEMBER), CREATOR.uid), newToken()));
    await assertFails(setDoc(tokenRef(dbAs(STRANGER), STRANGER.uid), newToken()));
  });

  it('rejects bad values and extra fields', async () => {
    const db = dbAs(MEMBER);
    await assertFails(setDoc(tokenRef(db, MEMBER.uid), newToken('')));
    await assertFails(setDoc(tokenRef(db, MEMBER.uid), newToken('x'.repeat(201))));
    await assertFails(setDoc(tokenRef(db, MEMBER.uid), { ...newToken(), extra: 1 }));
    await assertFails(
      setDoc(tokenRef(db, MEMBER.uid), { token: 'ExponentPushToken[a]', updatedAt: new Date() }),
    );
  });

  it('lets members read everyone’s (to notify them), but not non-members', async () => {
    await assertSucceeds(getDocs(collection(dbAs(MEMBER), 'trips', 'trip1', 'pushTokens')));
    await assertFails(getDocs(collection(dbAs(STRANGER), 'trips', 'trip1', 'pushTokens')));
  });

  it('lets you remove only your own', async () => {
    await assertFails(deleteDoc(tokenRef(dbAs(MEMBER), CREATOR.uid)));
    await assertSucceeds(deleteDoc(tokenRef(dbAs(CREATOR), CREATOR.uid)));
  });
});

describe('the notification-sent flag', () => {
  it('can be cleared once, by the person who added the expense', async () => {
    await seed();
    await assertFails(updateDoc(expenseRef(dbAs(CREATOR)), { notifyPending: false }));
    await assertSucceeds(updateDoc(expenseRef(dbAs(MEMBER)), { notifyPending: false }));
  });

  it('cannot be set back, or changed with other fields', async () => {
    await seed({ notifyPending: false });
    const db = dbAs(MEMBER);
    await assertFails(updateDoc(expenseRef(db), { notifyPending: true }));
    await testEnv.clearFirestore();
    await seed();
    await assertFails(updateDoc(expenseRef(db), { notifyPending: false, amount: 1 }));
  });

  it('can be cleared even after the trip is closed', async () => {
    await seed({ status: 'closed' });
    await assertSucceeds(updateDoc(expenseRef(dbAs(MEMBER)), { notifyPending: false }));
  });
});

describe('the notifications switch', () => {
  beforeEach(() => seed());

  it('lets you turn notifications off and on for yourself', async () => {
    const ref = doc(dbAs(MEMBER), 'users', MEMBER.uid);
    await assertSucceeds(updateDoc(ref, { notificationsOff: true }));
    await assertSucceeds(updateDoc(ref, { notificationsOff: false }));
    await assertFails(updateDoc(ref, { notificationsOff: 'yes' }));
  });

  it("blocks changing someone else's", async () => {
    await assertFails(
      updateDoc(doc(dbAs(CREATOR), 'users', MEMBER.uid), { notificationsOff: true }),
    );
  });
});
