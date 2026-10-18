// Security rules tests for comments (SPEC §10). Run with `npm run test:rules`.

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
const commentRef = (db, id = 'c1') => doc(db, 'trips', 'trip1', 'comments', id);

const newComment = (user, pid, overrides = {}) => ({
  expenseId: 'e1',
  text: 'Was this including tip?',
  authorUid: user.uid,
  authorPid: pid,
  createdAt: serverTimestamp(),
  ...overrides,
});

async function seed({ status = 'active', withComment = false } = {}) {
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
    const people = [
      ['p-rahul', 'Rahul', CREATOR.uid],
      ['p-priya', 'Priya', MEMBER.uid],
      ['p-amit', 'Amit', null],
    ];
    for (const [id, name, claimedByUid] of people) {
      await setDoc(doc(db, 'trips', 'trip1', 'participants', id), {
        name,
        claimedByUid,
        addedAt: t,
      });
    }
    await setDoc(doc(db, 'trips', 'trip1', 'expenses', 'e1'), {
      amount: 2400,
      paidByPid: 'p-priya',
      categoryId: 'food',
      date: '2026-12-14',
      description: 'Dinner',
      splitAmongPids: ['p-rahul', 'p-priya', 'p-amit'],
      createdByUid: MEMBER.uid,
      createdAt: t,
      updatedAt: t,
      isDeleted: false,
    });
    if (withComment) {
      await setDoc(commentRef(db), {
        ...newComment(MEMBER, 'p-priya'),
        createdAt: t,
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

describe('posting a comment', () => {
  beforeEach(() => seed());

  it('lets members comment as themselves', async () => {
    await assertSucceeds(setDoc(commentRef(dbAs(CREATOR), 'a'), newComment(CREATOR, 'p-rahul')));
    await assertSucceeds(setDoc(commentRef(dbAs(MEMBER), 'b'), newComment(MEMBER, 'p-priya')));
  });

  it('blocks posting as someone else', async () => {
    const db = dbAs(MEMBER);
    await assertFails(setDoc(commentRef(db, 'a'), newComment(MEMBER, 'p-rahul')));
    await assertFails(setDoc(commentRef(db, 'b'), newComment(MEMBER, 'p-amit')));
    await assertFails(
      setDoc(commentRef(db, 'c'), newComment(MEMBER, 'p-priya', { authorUid: CREATOR.uid })),
    );
  });

  it('blocks non-members', async () => {
    await assertFails(setDoc(commentRef(dbAs(STRANGER)), newComment(STRANGER, 'p-amit')));
  });

  it('requires an existing expense, valid text and the server time', async () => {
    const db = dbAs(MEMBER);
    await assertFails(
      setDoc(commentRef(db, 'a'), newComment(MEMBER, 'p-priya', { expenseId: 'missing' })),
    );
    await assertFails(setDoc(commentRef(db, 'b'), newComment(MEMBER, 'p-priya', { text: '' })));
    await assertFails(
      setDoc(commentRef(db, 'c'), newComment(MEMBER, 'p-priya', { text: 'a'.repeat(301) })),
    );
    await assertFails(
      setDoc(commentRef(db, 'd'), newComment(MEMBER, 'p-priya', { createdAt: new Date() })),
    );
    await assertFails(setDoc(commentRef(db, 'e'), newComment(MEMBER, 'p-priya', { extra: 1 })));
  });

  it('accepts exactly 300 characters', async () => {
    await assertSucceeds(
      setDoc(commentRef(dbAs(MEMBER)), newComment(MEMBER, 'p-priya', { text: 'a'.repeat(300) })),
    );
  });
});

describe('reading comments', () => {
  beforeEach(() => seed({ withComment: true }));

  it('is for members only', async () => {
    await assertSucceeds(getDocs(collection(dbAs(CREATOR), 'trips', 'trip1', 'comments')));
    await assertFails(getDocs(collection(dbAs(STRANGER), 'trips', 'trip1', 'comments')));
  });
});

describe('editing and deleting comments', () => {
  beforeEach(() => seed({ withComment: true }));

  it('never allows editing, even by the author', async () => {
    await assertFails(updateDoc(commentRef(dbAs(MEMBER)), { text: 'Changed' }));
  });

  it('lets only the author delete', async () => {
    await assertFails(deleteDoc(commentRef(dbAs(CREATOR))));
    await assertSucceeds(deleteDoc(commentRef(dbAs(MEMBER))));
  });
});

describe('comments on a closed trip', () => {
  beforeEach(() => seed({ status: 'closed', withComment: true }));

  it('can be read but not added or deleted', async () => {
    await assertSucceeds(getDocs(collection(dbAs(MEMBER), 'trips', 'trip1', 'comments')));
    await assertFails(setDoc(commentRef(dbAs(MEMBER), 'new'), newComment(MEMBER, 'p-priya')));
    await assertFails(deleteDoc(commentRef(dbAs(MEMBER))));
  });
});
