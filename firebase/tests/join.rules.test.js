// Security rules tests for joining and leaving trips (SPEC §5).
// The app does these as transactions; batches make the same writes here.
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
  doc,
  getDocs,
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
const JOINER = { uid: 'joiner', email: 'joiner@example.com' };
const OTHER = { uid: 'other', email: 'other@example.com' };

const dbAs = (user) => testEnv.authenticatedContext(user.uid, { email: user.email }).firestore();
const tripRef = (db) => doc(db, 'trips', 'trip1');
const personRef = (db, pid) => doc(db, 'trips', 'trip1', 'participants', pid);

async function seed({ status = 'active', amitLeft = false } = {}) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    const t = new Date('2026-10-01');
    await setDoc(tripRef(db), {
      name: 'Goa trip',
      startDate: '2026-12-12',
      endDate: null,
      creatorUid: CREATOR.uid,
      memberUids: [CREATOR.uid, MEMBER.uid],
      status,
      joinCode: 'GQA7K2',
      createdAt: t,
    });
    await setDoc(personRef(db, 'p-rahul'), {
      name: 'Rahul',
      claimedByUid: CREATOR.uid,
      addedAt: t,
    });
    await setDoc(personRef(db, 'p-priya'), { name: 'Priya', claimedByUid: MEMBER.uid, addedAt: t });
    await setDoc(personRef(db, 'p-amit'), {
      name: 'Amit',
      claimedByUid: null,
      addedAt: t,
      ...(amitLeft ? { leftAt: t } : {}),
    });
  });
}

const members = (...users) => users.map((u) => u.uid);

// Claim an existing name and become a member, in one write.
function claim(user, pid, memberUids) {
  const db = dbAs(user);
  const batch = writeBatch(db);
  batch.update(personRef(db, pid), { claimedByUid: user.uid, leftAt: null });
  batch.update(tripRef(db), { memberUids });
  return batch.commit();
}

// Add yourself as a new person and become a member, in one write.
function joinAsNew(user, name, memberUids, claimedByUid = user.uid) {
  const db = dbAs(user);
  const batch = writeBatch(db);
  batch.set(personRef(db, `p-${user.uid}`), { name, claimedByUid, addedAt: serverTimestamp() });
  batch.update(tripRef(db), { memberUids });
  return batch.commit();
}

// Release your name and leave, in one write.
function leave(user, pid, memberUids) {
  const db = dbAs(user);
  const batch = writeBatch(db);
  batch.update(personRef(db, pid), { claimedByUid: null, leftAt: serverTimestamp() });
  batch.update(tripRef(db), { memberUids });
  return batch.commit();
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

describe('claiming a name', () => {
  beforeEach(() => seed());

  it('works for an unclaimed name on an Active trip', async () => {
    await assertSucceeds(claim(JOINER, 'p-amit', members(CREATOR, MEMBER, JOINER)));
  });

  it('then lets the new member read expenses', async () => {
    await claim(JOINER, 'p-amit', members(CREATOR, MEMBER, JOINER));
    await assertSucceeds(getDocs(collection(dbAs(JOINER), 'trips', 'trip1', 'expenses')));
  });

  it('lets only one of two people claim the same name', async () => {
    await assertSucceeds(claim(JOINER, 'p-amit', members(CREATOR, MEMBER, JOINER)));
    await assertFails(claim(OTHER, 'p-amit', members(CREATOR, MEMBER, JOINER, OTHER)));
  });

  it('rejects a name someone already claimed', async () => {
    await assertFails(claim(JOINER, 'p-priya', members(CREATOR, MEMBER, JOINER)));
  });

  it('rejects claiming without also joining', async () => {
    const db = dbAs(JOINER);
    await assertFails(updateDoc(personRef(db, 'p-amit'), { claimedByUid: JOINER.uid }));
  });

  it('rejects claiming a name for someone else', async () => {
    const db = dbAs(JOINER);
    const batch = writeBatch(db);
    batch.update(personRef(db, 'p-amit'), { claimedByUid: OTHER.uid, leftAt: null });
    batch.update(tripRef(db), { memberUids: members(CREATOR, MEMBER, JOINER) });
    await assertFails(batch.commit());
  });

  it('rejects adding anyone else as a member', async () => {
    await assertFails(claim(JOINER, 'p-amit', members(CREATOR, MEMBER, JOINER, OTHER)));
    await assertFails(claim(JOINER, 'p-amit', members(MEMBER, JOINER)));
  });

  it('rejects a second claim by an existing member', async () => {
    await assertFails(claim(MEMBER, 'p-amit', members(CREATOR, MEMBER, MEMBER)));
  });

  it('rejects changing the name while claiming', async () => {
    const db = dbAs(JOINER);
    const batch = writeBatch(db);
    batch.update(personRef(db, 'p-amit'), { claimedByUid: JOINER.uid, name: 'Hacker' });
    batch.update(tripRef(db), { memberUids: members(CREATOR, MEMBER, JOINER) });
    await assertFails(batch.commit());
  });
});

describe('claiming on a closed trip', () => {
  it('is not allowed (the Trip ID has expired)', async () => {
    await seed({ status: 'closed' });
    await assertFails(claim(JOINER, 'p-amit', members(CREATOR, MEMBER, JOINER)));
  });
});

describe('adding yourself when your name is not on the list', () => {
  beforeEach(() => seed());

  it('works on an Active trip', async () => {
    await assertSucceeds(joinAsNew(JOINER, 'Zoya', members(CREATOR, MEMBER, JOINER)));
  });

  it('must be claimed by you, with a valid name', async () => {
    await assertFails(joinAsNew(JOINER, 'Zoya', members(CREATOR, MEMBER, JOINER), null));
    await assertFails(joinAsNew(JOINER, 'Zoya', members(CREATOR, MEMBER, JOINER), OTHER.uid));
    await assertFails(joinAsNew(JOINER, '', members(CREATOR, MEMBER, JOINER)));
  });

  it('is not allowed for existing members or on closed trips', async () => {
    await assertFails(joinAsNew(MEMBER, 'Priya 2', members(CREATOR, MEMBER, MEMBER)));
    await testEnv.clearFirestore();
    await seed({ status: 'closed' });
    await assertFails(joinAsNew(JOINER, 'Zoya', members(CREATOR, MEMBER, JOINER)));
  });
});

describe('joining without a name', () => {
  beforeEach(() => seed());

  it('rejects adding people other than yourself through the members list', async () => {
    const db = dbAs(JOINER);
    await assertFails(updateDoc(tripRef(db), { memberUids: members(CREATOR, MEMBER, OTHER) }));
    await assertFails(updateDoc(tripRef(db), { memberUids: members(CREATOR) }));
  });
});

describe('leaving', () => {
  beforeEach(() => seed());

  it('lets a member leave: name released, membership removed', async () => {
    await assertSucceeds(leave(MEMBER, 'p-priya', members(CREATOR)));
    await assertFails(getDocs(collection(dbAs(MEMBER), 'trips', 'trip1', 'expenses')));
  });

  it('then lets the name be claimed again', async () => {
    await leave(MEMBER, 'p-priya', members(CREATOR));
    await assertSucceeds(claim(MEMBER, 'p-priya', members(CREATOR, MEMBER)));
  });

  it('does not let the creator leave', async () => {
    await assertFails(leave(CREATOR, 'p-rahul', members(MEMBER)));
  });

  it("does not let you release someone else's name or remove someone else", async () => {
    await assertFails(leave(MEMBER, 'p-rahul', members(CREATOR)));
    const db = dbAs(MEMBER);
    await assertFails(updateDoc(tripRef(db), { memberUids: members(MEMBER) }));
  });

  it('requires leaving the members list in the same write', async () => {
    const db = dbAs(MEMBER);
    await assertFails(
      updateDoc(personRef(db, 'p-priya'), { claimedByUid: null, leftAt: serverTimestamp() }),
    );
  });

  it('is not allowed once the trip is closed', async () => {
    await testEnv.clearFirestore();
    await seed({ status: 'closed' });
    await assertFails(leave(MEMBER, 'p-priya', members(CREATOR)));
  });
});

describe('a name whose owner left', () => {
  it('can be claimed by someone new', async () => {
    await seed({ amitLeft: true });
    await assertSucceeds(claim(JOINER, 'p-amit', members(CREATOR, MEMBER, JOINER)));
  });
});
