// Security rules tests for deleting a trip (SPEC §13): mark it as being
// deleted, remove its contents, then the trip and its Trip ID.
// Run with `npm run test:rules`.

const fs = require('node:fs');
const path = require('node:path');
const {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} = require('@firebase/rules-unit-testing');
const {
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
  setLogLevel,
  updateDoc,
  writeBatch,
} = require('firebase/firestore');

setLogLevel('error');

let testEnv;

const CREATOR = { uid: 'creator', email: 'creator@example.com' };
const MEMBER = { uid: 'member', email: 'member@example.com' };

const dbAs = (user) => testEnv.authenticatedContext(user.uid, { email: user.email }).firestore();
const tripRef = (db) => doc(db, 'trips', 'trip1');
const sub = (db, collection, id) => doc(db, 'trips', 'trip1', collection, id);

// Every kind of document a trip can contain, one of each.
const CONTENTS = [
  ['participants', 'p-rahul', { name: 'Rahul', claimedByUid: CREATOR.uid }],
  ['participants', 'p-priya', { name: 'Priya', claimedByUid: MEMBER.uid }],
  ['expenses', 'e1', { amount: 100, isDeleted: false, createdByUid: MEMBER.uid }],
  ['categories', 'c1', { name: 'Fuel', createdByUid: MEMBER.uid }],
  ['comments', 'm1', { text: 'Hi', authorUid: MEMBER.uid }],
  ['settlements', 's1', { amount: 100, isPaid: true, isRecordedPayment: true }],
  ['pushTokens', MEMBER.uid, { token: 'ExponentPushToken[m]' }],
];

async function seed({ deleting } = {}) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    const trip = {
      name: 'Goa trip',
      startDate: '2026-12-12',
      endDate: null,
      creatorUid: CREATOR.uid,
      memberUids: [CREATOR.uid, MEMBER.uid],
      status: 'final',
      joinCode: 'GQA7K2',
      createdAt: new Date('2026-10-01'),
    };
    if (deleting !== undefined) trip.deleting = deleting;
    await setDoc(tripRef(db), trip);
    await setDoc(doc(db, 'joinCodes', 'GQA7K2'), { tripId: 'trip1' });
    for (const [collection, id, data] of CONTENTS) {
      await setDoc(sub(db, collection, id), data);
    }
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

describe('marking a trip as being deleted', () => {
  beforeEach(() => seed());

  it('is for the creator only', async () => {
    await assertFails(updateDoc(tripRef(dbAs(MEMBER)), { deleting: true }));
    await assertSucceeds(updateDoc(tripRef(dbAs(CREATOR)), { deleting: true }));
  });

  it('cannot be combined with other changes', async () => {
    await assertFails(updateDoc(tripRef(dbAs(CREATOR)), { deleting: true, name: 'X' }));
  });
});

describe('before it is marked', () => {
  beforeEach(() => seed());

  it('nothing can be hard-deleted by the creator', async () => {
    const db = dbAs(CREATOR);
    await assertFails(deleteDoc(sub(db, 'expenses', 'e1')));
    await assertFails(deleteDoc(sub(db, 'settlements', 's1')));
    await assertFails(deleteDoc(tripRef(db)));
    await assertFails(deleteDoc(doc(db, 'joinCodes', 'GQA7K2')));
  });
});

describe('once marked', () => {
  beforeEach(() => seed({ deleting: true }));

  it('lets the creator remove everything, then the trip and its Trip ID', async () => {
    const db = dbAs(CREATOR);
    for (const [collection, id] of CONTENTS) {
      await assertSucceeds(deleteDoc(sub(db, collection, id)));
    }
    const batch = writeBatch(db);
    batch.delete(tripRef(db));
    batch.delete(doc(db, 'joinCodes', 'GQA7K2'));
    await assertSucceeds(batch.commit());
  });

  it('does not let members remove anything', async () => {
    const db = dbAs(MEMBER);
    await assertFails(deleteDoc(sub(db, 'expenses', 'e1')));
    await assertFails(deleteDoc(sub(db, 'participants', 'p-rahul')));
    await assertFails(deleteDoc(tripRef(db)));
    await assertFails(deleteDoc(doc(db, 'joinCodes', 'GQA7K2')));
  });

  it('blocks new changes to the trip', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await updateDoc(tripRef(context.firestore()), { status: 'active' });
    });
    await assertFails(
      setDoc(sub(dbAs(MEMBER), 'comments', 'm2'), {
        expenseId: 'e1',
        text: 'Late',
        authorUid: MEMBER.uid,
        authorPid: 'p-priya',
        createdAt: serverTimestamp(),
      }),
    );
  });
});
