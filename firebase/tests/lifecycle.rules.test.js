// Security rules tests for closing, reopening, the 24-hour window and
// settlements (SPEC §4, §9). Run with `npm run test:rules`.

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

const CREATOR = { uid: 'creator', email: 'creator@example.com' }; // Rahul
const MEMBER = { uid: 'member', email: 'member@example.com' }; // Priya
const STRANGER = { uid: 'stranger', email: 'stranger@example.com' };

const HOUR = 60 * 60 * 1000;
const dbAs = (user) => testEnv.authenticatedContext(user.uid, { email: user.email }).firestore();
const tripRef = (db) => doc(db, 'trips', 'trip1');
const settlementRef = (db, id) => doc(db, 'trips', 'trip1', 'settlements', id);
const expenseRef = (db, id) => doc(db, 'trips', 'trip1', 'expenses', id);

function newSettlement(round, overrides = {}) {
  return {
    fromPid: 'p-amit',
    toPid: 'p-rahul',
    amount: 900,
    round,
    isPaid: false,
    isRecordedPayment: false,
    markedByUid: null,
    markedAt: null,
    createdAt: serverTimestamp(),
    ...overrides,
  };
}

function newExpense() {
  return {
    amount: 300,
    paidByPid: 'p-rahul',
    categoryId: 'food',
    date: '2026-12-15',
    description: '',
    splitAmongPids: ['p-rahul', 'p-priya', 'p-amit'],
    createdByUid: CREATOR.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    isDeleted: false,
    notifyPending: true,
  };
}

/**
 * Seeds a trip. `reopenedHoursAgo` sets reopenedAt for a Reopened trip;
 * `settlements` are { id: { ...overrides } } written as-is.
 */
async function seed({
  status = 'active',
  reopenUsed,
  reopenedHoursAgo,
  closedMinutesAgo,
  settlements = {},
} = {}) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    const t = new Date('2026-10-01');
    const trip = {
      name: 'Goa trip',
      startDate: '2026-12-12',
      endDate: null,
      creatorUid: CREATOR.uid,
      memberUids: [CREATOR.uid, MEMBER.uid],
      status,
      joinCode: 'GQA7K2',
      createdAt: t,
    };
    if (reopenUsed !== undefined) trip.reopenUsed = reopenUsed;
    if (reopenedHoursAgo !== undefined)
      trip.reopenedAt = new Date(Date.now() - reopenedHoursAgo * HOUR);
    if (closedMinutesAgo !== undefined)
      trip.closedAt = new Date(Date.now() - closedMinutesAgo * 60000);
    await setDoc(tripRef(db), trip);
    for (const [id, name, claimedByUid] of [
      ['p-rahul', 'Rahul', CREATOR.uid],
      ['p-priya', 'Priya', MEMBER.uid],
      ['p-amit', 'Amit', null],
    ]) {
      await setDoc(doc(db, 'trips', 'trip1', 'participants', id), {
        name,
        claimedByUid,
        addedAt: t,
      });
    }
    await setDoc(expenseRef(db, 'e1'), {
      ...newExpense(),
      createdAt: t,
      updatedAt: t,
      notifyPending: false,
    });
    for (const [id, data] of Object.entries(settlements)) {
      await setDoc(settlementRef(db, id), { ...newSettlement(1), createdAt: t, ...data });
    }
  });
}

// The creator's close: status change + settlements in one write.
function close(user, nextStatus, round) {
  const db = dbAs(user);
  const batch = writeBatch(db);
  batch.update(tripRef(db), { status: nextStatus, closedAt: serverTimestamp() });
  batch.set(settlementRef(db, `s-${round}`), newSettlement(round));
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

describe('closing', () => {
  it('lets the creator close an Active trip with its settlements', async () => {
    await seed();
    await assertSucceeds(close(CREATOR, 'closed', 1));
  });

  it('does not let members or strangers close', async () => {
    await seed();
    await assertFails(close(MEMBER, 'closed', 1));
    await assertFails(close(STRANGER, 'closed', 1));
  });

  it('rejects settlements that are already paid, invalid, or the wrong round', async () => {
    await seed();
    const db = dbAs(CREATOR);
    const bad = async (overrides) => {
      const batch = writeBatch(db);
      batch.update(tripRef(db), { status: 'closed', closedAt: serverTimestamp() });
      batch.set(settlementRef(db, 'x'), newSettlement(1, overrides));
      await assertFails(batch.commit());
    };
    await bad({ isPaid: true });
    await bad({ round: 2 });
    await bad({ amount: 0 });
    await bad({ toPid: 'p-amit' });
    await bad({ isRecordedPayment: true });
  });

  it('rejects settlements on an Active trip that is not closing', async () => {
    await seed();
    await assertFails(setDoc(settlementRef(dbAs(CREATOR), 'x'), newSettlement(1)));
  });

  it('locks expenses once closed', async () => {
    await seed({ status: 'closed', closedMinutesAgo: 60 });
    await assertFails(setDoc(expenseRef(dbAs(CREATOR), 'e2'), newExpense()));
  });
});

describe('the double-check right after closing', () => {
  it('may replace unpaid settlements within a few minutes', async () => {
    await seed({ status: 'closed', closedMinutesAgo: 1, settlements: { s1: {} } });
    const db = dbAs(CREATOR);
    await assertSucceeds(deleteDoc(settlementRef(db, 's1')));
    await assertSucceeds(setDoc(settlementRef(db, 's2'), newSettlement(1)));
  });

  it('may not touch them later, or once paid', async () => {
    await seed({ status: 'closed', closedMinutesAgo: 30, settlements: { s1: {} } });
    const db = dbAs(CREATOR);
    await assertFails(deleteDoc(settlementRef(db, 's1')));
    await assertFails(setDoc(settlementRef(db, 's2'), newSettlement(1)));
    await testEnv.clearFirestore();
    await seed({ status: 'closed', closedMinutesAgo: 1, settlements: { s1: { isPaid: true } } });
    await assertFails(deleteDoc(settlementRef(db, 's1')));
  });
});

describe('marking paid', () => {
  beforeEach(() =>
    seed({
      status: 'closed',
      closedMinutesAgo: 60,
      settlements: {
        // Amit (unclaimed) pays Rahul (creator); Priya pays Rahul.
        amit: { fromPid: 'p-amit', toPid: 'p-rahul' },
        priya: { fromPid: 'p-priya', toPid: 'p-rahul' },
      },
    }),
  );

  const mark = (user, id, isPaid = true) =>
    updateDoc(settlementRef(dbAs(user), id), {
      isPaid,
      markedByUid: user.uid,
      markedAt: serverTimestamp(),
    });

  it('lets the payer, the receiver and the creator mark and un-mark', async () => {
    await assertSucceeds(mark(MEMBER, 'priya')); // payer
    await assertSucceeds(mark(MEMBER, 'priya', false)); // undo
    await assertSucceeds(mark(CREATOR, 'priya')); // receiver (and creator)
    await assertSucceeds(mark(CREATOR, 'amit')); // creator, for an unclaimed name
  });

  it('blocks people who are neither payer, receiver nor creator', async () => {
    await assertFails(mark(MEMBER, 'amit'));
    await assertFails(mark(STRANGER, 'priya'));
  });

  it('blocks changing anything else', async () => {
    await assertFails(
      updateDoc(settlementRef(dbAs(CREATOR), 'priya'), {
        isPaid: true,
        amount: 1,
        markedByUid: CREATOR.uid,
        markedAt: serverTimestamp(),
      }),
    );
  });
});

describe('reopening', () => {
  function reopen(user, { deleteIds = [], recordIds = [] } = {}) {
    const db = dbAs(user);
    const batch = writeBatch(db);
    batch.update(tripRef(db), {
      status: 'reopened',
      reopenUsed: true,
      reopenedAt: serverTimestamp(),
    });
    for (const id of deleteIds) batch.delete(settlementRef(db, id));
    for (const id of recordIds) batch.update(settlementRef(db, id), { isRecordedPayment: true });
    return batch.commit();
  }

  it('lets the creator reopen once: paid kept as recorded, unpaid discarded', async () => {
    await seed({
      status: 'closed',
      closedMinutesAgo: 60,
      settlements: { paid: { isPaid: true }, unpaid: {} },
    });
    await assertSucceeds(reopen(CREATOR, { deleteIds: ['unpaid'], recordIds: ['paid'] }));
  });

  it('does not let members reopen', async () => {
    await seed({ status: 'closed', closedMinutesAgo: 60 });
    await assertFails(reopen(MEMBER));
  });

  it('allows only one reopen', async () => {
    await seed({ status: 'closed', closedMinutesAgo: 60, reopenUsed: true });
    await assertFails(reopen(CREATOR));
  });

  it('does not let a reopen discard paid settlements', async () => {
    await seed({ status: 'closed', closedMinutesAgo: 60, settlements: { paid: { isPaid: true } } });
    await assertFails(reopen(CREATOR, { deleteIds: ['paid'] }));
  });

  it('opens expenses again within 24 hours, and locks them after', async () => {
    await seed({ status: 'reopened', reopenUsed: true, reopenedHoursAgo: 23 });
    await assertSucceeds(
      setDoc(expenseRef(dbAs(MEMBER), 'e2'), {
        ...newExpense(),
        createdByUid: MEMBER.uid,
      }),
    );
    await testEnv.clearFirestore();
    await seed({ status: 'reopened', reopenUsed: true, reopenedHoursAgo: 25 });
    await assertFails(
      setDoc(expenseRef(dbAs(MEMBER), 'e2'), {
        ...newExpense(),
        createdByUid: MEMBER.uid,
      }),
    );
  });

  it('keeps recorded payments from being marked again', async () => {
    await seed({
      status: 'final',
      reopenUsed: true,
      reopenedHoursAgo: 30,
      closedMinutesAgo: 60,
      settlements: { old: { isPaid: true, isRecordedPayment: true } },
    });
    await assertFails(
      updateDoc(settlementRef(dbAs(CREATOR), 'old'), {
        isPaid: false,
        markedByUid: CREATOR.uid,
        markedAt: serverTimestamp(),
      }),
    );
  });
});

describe('final close', () => {
  it('lets the creator close a reopened trip as final, with round-2 settlements', async () => {
    await seed({ status: 'reopened', reopenUsed: true, reopenedHoursAgo: 2 });
    await assertSucceeds(close(CREATOR, 'final', 2));
  });

  it('does not let a member finalise while the window is open', async () => {
    await seed({ status: 'reopened', reopenUsed: true, reopenedHoursAgo: 2 });
    await assertFails(close(MEMBER, 'final', 2));
  });

  it('lets any member finalise once the 24 hours have passed', async () => {
    await seed({ status: 'reopened', reopenUsed: true, reopenedHoursAgo: 25 });
    await assertSucceeds(close(MEMBER, 'final', 2));
  });

  it('never goes back from final', async () => {
    await seed({ status: 'final', reopenUsed: true, reopenedHoursAgo: 30, closedMinutesAgo: 60 });
    const db = dbAs(CREATOR);
    await assertFails(
      updateDoc(tripRef(db), {
        status: 'reopened',
        reopenUsed: true,
        reopenedAt: serverTimestamp(),
      }),
    );
    await assertFails(updateDoc(tripRef(db), { status: 'active' }));
  });
});
