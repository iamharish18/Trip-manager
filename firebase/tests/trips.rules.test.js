// Security rules tests for trips, participants and Trip IDs.
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
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  setLogLevel,
  updateDoc,
  where,
  writeBatch,
} = require('firebase/firestore');

setLogLevel('error');

let testEnv;

const CREATOR = { uid: 'creator', email: 'creator@example.com' };
const STRANGER = { uid: 'stranger', email: 'stranger@example.com' };

function dbAs(user) {
  return testEnv.authenticatedContext(user.uid, { email: user.email }).firestore();
}

function tripData(overrides = {}) {
  return {
    name: 'Goa trip',
    startDate: '2026-12-12',
    endDate: null,
    creatorUid: CREATOR.uid,
    memberUids: [CREATOR.uid],
    status: 'active',
    joinCode: 'GQA7K2',
    createdAt: serverTimestamp(),
    ...overrides,
  };
}

// The same writes the app makes in its create-trip transaction.
function createTripBatch(db, { tripId = 'trip1', trip = {}, code, participants } = {}) {
  const data = tripData(trip);
  const joinCode = code ?? data.joinCode;
  const batch = writeBatch(db);
  batch.set(doc(db, 'trips', tripId), data);
  batch.set(doc(db, 'joinCodes', joinCode), { tripId });
  const people = participants ?? [
    { id: 'p-creator', name: 'Rahul', claimedByUid: CREATOR.uid },
    { id: 'p-amit', name: 'Amit', claimedByUid: null },
  ];
  for (const { id, ...person } of people) {
    batch.set(doc(db, 'trips', tripId, 'participants', id), {
      ...person,
      addedAt: serverTimestamp(),
    });
  }
  return batch.commit();
}

// Seeds a trip directly, bypassing the rules.
async function seedTrip({ status = 'active' } = {}) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'trips', 'trip1'), {
      ...tripData({ status }),
      createdAt: new Date('2026-10-01'),
    });
    await setDoc(doc(db, 'joinCodes', 'GQA7K2'), { tripId: 'trip1' });
    await setDoc(doc(db, 'trips', 'trip1', 'participants', 'p-creator'), {
      name: 'Rahul',
      claimedByUid: CREATOR.uid,
      addedAt: new Date('2026-10-01'),
    });
    await setDoc(doc(db, 'trips', 'trip1', 'participants', 'p-amit'), {
      name: 'Amit',
      claimedByUid: null,
      addedAt: new Date('2026-10-01'),
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

describe('creating a trip', () => {
  it('works with the trip, its Trip ID and participants together', async () => {
    await assertSucceeds(createTripBatch(dbAs(CREATOR)));
  });

  it('accepts an end date on or after the start', async () => {
    await assertSucceeds(createTripBatch(dbAs(CREATOR), { trip: { endDate: '2026-12-16' } }));
  });

  it('rejects an end date before the start', async () => {
    await assertFails(createTripBatch(dbAs(CREATOR), { trip: { endDate: '2026-12-01' } }));
  });

  it('rejects a missing or badly formatted start date', async () => {
    await assertFails(createTripBatch(dbAs(CREATOR), { trip: { startDate: '12/12/2026' } }));
  });

  it('rejects a trip without its Trip ID reservation', async () => {
    const db = dbAs(CREATOR);
    const batch = writeBatch(db);
    batch.set(doc(db, 'trips', 'trip1'), tripData());
    await assertFails(batch.commit());
  });

  it('rejects a Trip ID already taken by another trip', async () => {
    await seedTrip();
    await assertFails(createTripBatch(dbAs(CREATOR), { tripId: 'trip2' }));
  });

  it('rejects creating a trip for someone else', async () => {
    await assertFails(
      createTripBatch(dbAs(STRANGER), {
        participants: [{ id: 'p1', name: 'Rahul', claimedByUid: STRANGER.uid }],
      }),
    );
  });

  it('rejects other members or a non-active status', async () => {
    await assertFails(
      createTripBatch(dbAs(CREATOR), { trip: { memberUids: [CREATOR.uid, STRANGER.uid] } }),
    );
    await assertFails(createTripBatch(dbAs(CREATOR), { trip: { status: 'closed' } }));
  });

  it('rejects claiming a participant for someone else', async () => {
    await assertFails(
      createTripBatch(dbAs(CREATOR), {
        participants: [{ id: 'p1', name: 'Priya', claimedByUid: STRANGER.uid }],
      }),
    );
  });

  it('rejects a Trip ID that points at a different trip', async () => {
    const db = dbAs(CREATOR);
    const batch = writeBatch(db);
    batch.set(doc(db, 'trips', 'trip1'), tripData());
    batch.set(doc(db, 'joinCodes', 'GQA7K2'), { tripId: 'other' });
    await assertFails(batch.commit());
  });
});

describe('reading trips', () => {
  beforeEach(() => seedTrip());

  it('lets members read the trip and its participants', async () => {
    const db = dbAs(CREATOR);
    await assertSucceeds(getDoc(doc(db, 'trips', 'trip1')));
    await assertSucceeds(getDocs(collection(db, 'trips', 'trip1', 'participants')));
  });

  it('lets members list their trips', async () => {
    const db = dbAs(CREATOR);
    await assertSucceeds(
      getDocs(query(collection(db, 'trips'), where('memberUids', 'array-contains', CREATOR.uid))),
    );
  });

  it('hides trips from non-members', async () => {
    const db = dbAs(STRANGER);
    await assertFails(getDoc(doc(db, 'trips', 'trip1')));
    await assertFails(getDocs(collection(db, 'trips', 'trip1', 'participants')));
    await assertFails(getDocs(collection(db, 'trips')));
  });

  it('lets signed-in users look up a Trip ID, but not list them', async () => {
    const db = dbAs(STRANGER);
    await assertSucceeds(getDoc(doc(db, 'joinCodes', 'GQA7K2')));
    await assertFails(getDocs(collection(db, 'joinCodes')));
  });
});

describe('editing a trip', () => {
  it('lets the creator change the name and dates', async () => {
    await seedTrip();
    await assertSucceeds(
      updateDoc(doc(dbAs(CREATOR), 'trips', 'trip1'), {
        name: 'Goa 2026',
        startDate: '2026-12-13',
        endDate: '2026-12-17',
      }),
    );
  });

  it('rejects invalid dates', async () => {
    await seedTrip();
    await assertFails(updateDoc(doc(dbAs(CREATOR), 'trips', 'trip1'), { endDate: '2026-12-01' }));
  });

  it('blocks changing anything else', async () => {
    await seedTrip();
    const ref = doc(dbAs(CREATOR), 'trips', 'trip1');
    await assertFails(updateDoc(ref, { status: 'closed' }));
    await assertFails(updateDoc(ref, { memberUids: [CREATOR.uid, STRANGER.uid] }));
    await assertFails(updateDoc(ref, { joinCode: 'ABCDEF' }));
  });

  it('blocks non-creators', async () => {
    await seedTrip();
    await assertFails(updateDoc(doc(dbAs(STRANGER), 'trips', 'trip1'), { name: 'Mine now' }));
  });

  it('blocks edits once the trip is closed', async () => {
    await seedTrip({ status: 'closed' });
    await assertFails(updateDoc(doc(dbAs(CREATOR), 'trips', 'trip1'), { name: 'Late edit' }));
  });

  it('never allows deleting a trip or changing a Trip ID', async () => {
    await seedTrip();
    const db = dbAs(CREATOR);
    await assertFails(deleteDoc(doc(db, 'trips', 'trip1')));
    await assertFails(setDoc(doc(db, 'joinCodes', 'GQA7K2'), { tripId: 'trip2' }));
    await assertFails(deleteDoc(doc(db, 'joinCodes', 'GQA7K2')));
  });
});

describe('managing participants', () => {
  const newPerson = (overrides = {}) => ({
    name: 'Priya',
    claimedByUid: null,
    addedAt: serverTimestamp(),
    ...overrides,
  });

  it('lets the creator add, rename and remove people', async () => {
    await seedTrip();
    const db = dbAs(CREATOR);
    await assertSucceeds(setDoc(doc(db, 'trips', 'trip1', 'participants', 'p-priya'), newPerson()));
    await assertSucceeds(
      updateDoc(doc(db, 'trips', 'trip1', 'participants', 'p-amit'), { name: 'Amit K' }),
    );
    await assertSucceeds(deleteDoc(doc(db, 'trips', 'trip1', 'participants', 'p-amit')));
  });

  it('lets the creator rename themself', async () => {
    await seedTrip();
    await assertSucceeds(
      updateDoc(doc(dbAs(CREATOR), 'trips', 'trip1', 'participants', 'p-creator'), {
        name: 'Rahul S',
      }),
    );
  });

  it("blocks removing the creator's own spot", async () => {
    await seedTrip();
    await assertFails(deleteDoc(doc(dbAs(CREATOR), 'trips', 'trip1', 'participants', 'p-creator')));
  });

  it('blocks adding an already-claimed person after creation', async () => {
    await seedTrip();
    await assertFails(
      setDoc(
        doc(dbAs(CREATOR), 'trips', 'trip1', 'participants', 'p-me-again'),
        newPerson({ claimedByUid: CREATOR.uid }),
      ),
    );
  });

  it('rejects invalid names and extra fields', async () => {
    await seedTrip();
    const db = dbAs(CREATOR);
    await assertFails(
      setDoc(doc(db, 'trips', 'trip1', 'participants', 'p1'), newPerson({ name: '' })),
    );
    await assertFails(
      setDoc(doc(db, 'trips', 'trip1', 'participants', 'p2'), newPerson({ name: 'a'.repeat(41) })),
    );
    await assertFails(
      setDoc(doc(db, 'trips', 'trip1', 'participants', 'p3'), newPerson({ isAdmin: true })),
    );
    await assertFails(
      updateDoc(doc(db, 'trips', 'trip1', 'participants', 'p-amit'), { claimedByUid: 'x' }),
    );
  });

  it('blocks non-creators', async () => {
    await seedTrip();
    const db = dbAs(STRANGER);
    await assertFails(setDoc(doc(db, 'trips', 'trip1', 'participants', 'p-x'), newPerson()));
    await assertFails(
      updateDoc(doc(db, 'trips', 'trip1', 'participants', 'p-amit'), { name: 'Hacked' }),
    );
    await assertFails(deleteDoc(doc(db, 'trips', 'trip1', 'participants', 'p-amit')));
  });

  it('blocks changes once the trip is closed', async () => {
    await seedTrip({ status: 'closed' });
    const db = dbAs(CREATOR);
    await assertFails(setDoc(doc(db, 'trips', 'trip1', 'participants', 'p-x'), newPerson()));
    await assertFails(
      updateDoc(doc(db, 'trips', 'trip1', 'participants', 'p-amit'), { name: 'Late' }),
    );
    await assertFails(deleteDoc(doc(db, 'trips', 'trip1', 'participants', 'p-amit')));
  });
});
