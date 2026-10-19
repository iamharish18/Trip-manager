// Security rules tests for expenses and custom categories.
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

const expensePath = (db, id = 'e1') => doc(db, 'trips', 'trip1', 'expenses', id);

function newExpense(overrides = {}) {
  return {
    amount: 1200,
    paidByPid: 'p-rahul',
    categoryId: 'travel',
    date: '2026-12-14',
    description: 'Cab to Baga',
    splitAmongPids: ['p-rahul', 'p-amit', 'p-priya'],
    createdByUid: CREATOR.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    isDeleted: false,
    notifyPending: true,
    ...overrides,
  };
}

async function seed({ status = 'active', withExpense = false } = {}) {
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
    for (const [id, name, claimedByUid] of [
      ['p-rahul', 'Rahul', CREATOR.uid],
      ['p-amit', 'Amit', MEMBER.uid],
      ['p-priya', 'Priya', null],
    ]) {
      await setDoc(doc(db, 'trips', 'trip1', 'participants', id), {
        name,
        claimedByUid,
        addedAt: t,
      });
    }
    await setDoc(doc(db, 'trips', 'trip1', 'categories', 'c-fuel'), {
      name: 'Fuel',
      createdByUid: CREATOR.uid,
      createdAt: t,
    });
    if (withExpense) {
      await setDoc(expensePath(db), {
        ...newExpense(),
        createdAt: t,
        updatedAt: t,
      });
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

describe('adding an expense', () => {
  beforeEach(() => seed());

  it('lets the creator and joined members add expenses', async () => {
    await assertSucceeds(setDoc(expensePath(dbAs(CREATOR), 'e1'), newExpense()));
    await assertSucceeds(
      setDoc(expensePath(dbAs(MEMBER), 'e2'), newExpense({ createdByUid: MEMBER.uid })),
    );
  });

  it('accepts custom categories and an empty description', async () => {
    await assertSucceeds(
      setDoc(expensePath(dbAs(CREATOR)), newExpense({ categoryId: 'c-fuel', description: '' })),
    );
  });

  it('blocks non-members', async () => {
    await assertFails(
      setDoc(expensePath(dbAs(STRANGER)), newExpense({ createdByUid: STRANGER.uid })),
    );
  });

  it.each([
    ['zero', 0],
    ['negative', -5],
    ['with paise', 12.5],
    ['above ₹10,00,000', 1000001],
    ['a string', '1200'],
  ])('rejects an amount that is %s', async (_label, amount) => {
    await assertFails(setDoc(expensePath(dbAs(CREATOR)), newExpense({ amount })));
  });

  it('accepts exactly ₹10,00,000', async () => {
    await assertSucceeds(setDoc(expensePath(dbAs(CREATOR)), newExpense({ amount: 1000000 })));
  });

  it('requires the payer to be in the split', async () => {
    await assertFails(
      setDoc(
        expensePath(dbAs(CREATOR)),
        newExpense({ paidByPid: 'p-priya', splitAmongPids: ['p-rahul', 'p-amit'] }),
      ),
    );
  });

  it('requires the payer to be a participant', async () => {
    await assertFails(
      setDoc(
        expensePath(dbAs(CREATOR)),
        newExpense({ paidByPid: 'p-ghost', splitAmongPids: ['p-ghost', 'p-rahul'] }),
      ),
    );
  });

  it('rejects unknown categories, bad dates and long descriptions', async () => {
    const db = dbAs(CREATOR);
    await assertFails(setDoc(expensePath(db, 'a'), newExpense({ categoryId: 'nope' })));
    await assertFails(setDoc(expensePath(db, 'b'), newExpense({ date: '14/12/2026' })));
    await assertFails(setDoc(expensePath(db, 'c'), newExpense({ description: 'a'.repeat(101) })));
  });

  it('rejects someone else as creator, a deleted expense, or extra fields', async () => {
    const db = dbAs(CREATOR);
    await assertFails(setDoc(expensePath(db, 'a'), newExpense({ createdByUid: MEMBER.uid })));
    await assertFails(setDoc(expensePath(db, 'b'), newExpense({ isDeleted: true })));
    await assertFails(setDoc(expensePath(db, 'c'), newExpense({ extra: 1 })));
  });
});

describe('reading expenses', () => {
  beforeEach(() => seed({ withExpense: true }));

  it('lets members read, and hides expenses from non-members', async () => {
    await assertSucceeds(getDocs(collection(dbAs(MEMBER), 'trips', 'trip1', 'expenses')));
    await assertFails(getDocs(collection(dbAs(STRANGER), 'trips', 'trip1', 'expenses')));
  });
});

describe('editing and deleting an expense', () => {
  beforeEach(() => seed({ withExpense: true }));

  const edit = (changes) => ({ ...changes, updatedAt: serverTimestamp() });

  it('lets members change amount, payer, category, date and description', async () => {
    await assertSucceeds(
      updateDoc(
        expensePath(dbAs(MEMBER)),
        edit({
          amount: 1500,
          paidByPid: 'p-amit',
          categoryId: 'c-fuel',
          date: '2026-12-15',
          description: 'Cab and tip',
        }),
      ),
    );
  });

  it('blocks changing the payer to someone outside the split', async () => {
    await seed({ withExpense: true });
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'trips', 'trip1', 'participants', 'p-zoya'), {
        name: 'Zoya',
        claimedByUid: null,
        addedAt: new Date(),
      });
    });
    await assertFails(updateDoc(expensePath(dbAs(CREATOR)), edit({ paidByPid: 'p-zoya' })));
  });

  it('blocks changing the split, creator or creation time', async () => {
    const ref = expensePath(dbAs(CREATOR));
    await assertFails(updateDoc(ref, edit({ splitAmongPids: ['p-rahul'] })));
    await assertFails(updateDoc(ref, edit({ createdByUid: MEMBER.uid })));
    await assertFails(updateDoc(ref, edit({ createdAt: new Date() })));
  });

  it('requires updatedAt to be the server time', async () => {
    await assertFails(
      updateDoc(expensePath(dbAs(CREATOR)), { amount: 10, updatedAt: new Date('2020-01-01') }),
    );
  });

  it('soft-deletes and restores, but never hard-deletes', async () => {
    const ref = expensePath(dbAs(CREATOR));
    await assertSucceeds(updateDoc(ref, edit({ isDeleted: true })));
    await assertSucceeds(updateDoc(ref, edit({ isDeleted: false })));
    await assertFails(deleteDoc(ref));
  });

  it('blocks non-members', async () => {
    await assertFails(updateDoc(expensePath(dbAs(STRANGER)), edit({ amount: 1 })));
  });
});

describe('expenses on a closed trip', () => {
  beforeEach(() => seed({ status: 'closed', withExpense: true }));

  it('are locked', async () => {
    const db = dbAs(CREATOR);
    await assertFails(setDoc(expensePath(db, 'e2'), newExpense()));
    await assertFails(updateDoc(expensePath(db), { amount: 1, updatedAt: serverTimestamp() }));
    await assertFails(
      updateDoc(expensePath(db), { isDeleted: true, updatedAt: serverTimestamp() }),
    );
  });

  it('can still be read', async () => {
    await assertSucceeds(getDocs(collection(dbAs(MEMBER), 'trips', 'trip1', 'expenses')));
  });
});

describe('custom categories', () => {
  const categoryPath = (db, id) => doc(db, 'trips', 'trip1', 'categories', id);
  const newCategory = (user, overrides = {}) => ({
    name: 'Tips',
    createdByUid: user.uid,
    createdAt: serverTimestamp(),
    ...overrides,
  });

  it('lets members add and delete them while the trip is open', async () => {
    await seed();
    const db = dbAs(MEMBER);
    await assertSucceeds(setDoc(categoryPath(db, 'c-tips'), newCategory(MEMBER)));
    await assertSucceeds(deleteDoc(categoryPath(db, 'c-tips')));
  });

  it('rejects default IDs, bad names and renaming', async () => {
    await seed();
    const db = dbAs(CREATOR);
    await assertFails(setDoc(categoryPath(db, 'food'), newCategory(CREATOR)));
    await assertFails(setDoc(categoryPath(db, 'c1'), newCategory(CREATOR, { name: '' })));
    await assertFails(
      setDoc(categoryPath(db, 'c2'), newCategory(CREATOR, { name: 'a'.repeat(21) })),
    );
    await assertFails(updateDoc(categoryPath(db, 'c-fuel'), { name: 'Petrol' }));
  });

  it('blocks non-members and closed trips', async () => {
    await seed({ status: 'closed' });
    await assertFails(setDoc(categoryPath(dbAs(STRANGER), 'c-x'), newCategory(STRANGER)));
    await assertFails(setDoc(categoryPath(dbAs(CREATOR), 'c-x'), newCategory(CREATOR)));
    await assertFails(deleteDoc(categoryPath(dbAs(CREATOR), 'c-fuel')));
  });
});
