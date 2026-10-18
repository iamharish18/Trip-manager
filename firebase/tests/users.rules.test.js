// Security rules tests for users/{uid}. Run with `npm run test:rules`,
// which starts the Firestore emulator and runs these against firestore.rules.

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
  getDoc,
  serverTimestamp,
  setDoc,
  setLogLevel,
  updateDoc,
} = require('firebase/firestore');

// Denied writes are expected here; don't log each one as a warning.
setLogLevel('error');

let testEnv;

const ALICE = { uid: 'alice', email: 'alice@example.com' };
const BOB = { uid: 'bob', email: 'bob@example.com' };

function dbAs(user) {
  return testEnv.authenticatedContext(user.uid, { email: user.email }).firestore();
}

function newProfile(user, overrides = {}) {
  return { name: 'Alice', email: user.email, createdAt: serverTimestamp(), ...overrides };
}

// Writes Alice's profile directly, bypassing the rules.
async function seedAlice() {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'users', ALICE.uid), {
      name: 'Alice',
      email: ALICE.email,
      createdAt: new Date('2026-10-01'),
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

describe('creating a profile', () => {
  it('lets a user create their own profile', async () => {
    await assertSucceeds(setDoc(doc(dbAs(ALICE), 'users', ALICE.uid), newProfile(ALICE)));
  });

  it("blocks creating someone else's profile", async () => {
    await assertFails(setDoc(doc(dbAs(BOB), 'users', ALICE.uid), newProfile(ALICE)));
  });

  it('blocks logged-out users', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(setDoc(doc(db, 'users', ALICE.uid), newProfile(ALICE)));
  });

  it('requires the email to match the account', async () => {
    await assertFails(
      setDoc(
        doc(dbAs(ALICE), 'users', ALICE.uid),
        newProfile(ALICE, { email: 'someone@else.com' }),
      ),
    );
  });

  it('requires the server time for createdAt', async () => {
    await assertFails(
      setDoc(
        doc(dbAs(ALICE), 'users', ALICE.uid),
        newProfile(ALICE, { createdAt: new Date('2020-01-01') }),
      ),
    );
  });

  it.each([
    ['empty', ''],
    ['too long', 'a'.repeat(41)],
    ['padded with spaces', ' Alice '],
    ['not a string', 42],
  ])('rejects a name that is %s', async (_label, name) => {
    await assertFails(setDoc(doc(dbAs(ALICE), 'users', ALICE.uid), newProfile(ALICE, { name })));
  });

  it('rejects extra fields', async () => {
    await assertFails(
      setDoc(doc(dbAs(ALICE), 'users', ALICE.uid), newProfile(ALICE, { isAdmin: true })),
    );
  });
});

describe('reading a profile', () => {
  beforeEach(seedAlice);

  it('lets a user read their own profile', async () => {
    await assertSucceeds(getDoc(doc(dbAs(ALICE), 'users', ALICE.uid)));
  });

  it("blocks reading someone else's profile", async () => {
    await assertFails(getDoc(doc(dbAs(BOB), 'users', ALICE.uid)));
  });

  it('blocks logged-out users', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, 'users', ALICE.uid)));
  });
});

describe('updating a profile', () => {
  beforeEach(seedAlice);

  it('lets a user change their own name', async () => {
    await assertSucceeds(updateDoc(doc(dbAs(ALICE), 'users', ALICE.uid), { name: 'Alice K' }));
  });

  it('rejects an invalid name', async () => {
    await assertFails(updateDoc(doc(dbAs(ALICE), 'users', ALICE.uid), { name: '' }));
  });

  it('blocks changing the email', async () => {
    await assertFails(
      updateDoc(doc(dbAs(ALICE), 'users', ALICE.uid), { email: 'new@example.com' }),
    );
  });

  it('blocks changing createdAt', async () => {
    await assertFails(
      updateDoc(doc(dbAs(ALICE), 'users', ALICE.uid), { createdAt: new Date('2020-01-01') }),
    );
  });

  it("blocks changing someone else's name", async () => {
    await assertFails(updateDoc(doc(dbAs(BOB), 'users', ALICE.uid), { name: 'Hacked' }));
  });
});

describe('deleting a profile', () => {
  beforeEach(seedAlice);

  it('is never allowed', async () => {
    await assertFails(deleteDoc(doc(dbAs(ALICE), 'users', ALICE.uid)));
  });
});

describe('other collections', () => {
  it('are locked', async () => {
    await assertFails(getDoc(doc(dbAs(ALICE), 'health', 'ping')));
    await assertFails(setDoc(doc(dbAs(ALICE), 'anything', 'x'), { a: 1 }));
  });
});
