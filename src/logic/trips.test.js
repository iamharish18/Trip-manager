import {
  formatTimeLeft,
  isSettling,
  isTripOpen,
  participantStatus,
  peopleLabel,
  reopenEndsAt,
  sortParticipants,
  sortTrips,
} from './trips';

const at = (ms) => ({ toMillis: () => ms });

describe('isTripOpen', () => {
  const HOUR = 60 * 60 * 1000;
  const reopened = (hoursAgo, now) => ({
    status: 'reopened',
    reopenedAt: { toMillis: () => now - hoursAgo * HOUR },
  });

  it('is open while active, or reopened within 24 hours', () => {
    const now = Date.now();
    expect(isTripOpen({ status: 'active' })).toBe(true);
    expect(isTripOpen(reopened(23, now), now)).toBe(true);
    expect(isTripOpen(reopened(25, now), now)).toBe(false);
    expect(isTripOpen({ status: 'closed' })).toBe(false);
    expect(isTripOpen({ status: 'final' })).toBe(false);
    expect(isTripOpen(null)).toBe(false);
  });

  it('treats a reopen not yet confirmed by the server as open', () => {
    expect(isTripOpen({ status: 'reopened', reopenedAt: null })).toBe(true);
  });

  it('settles up whenever it is not open', () => {
    const now = Date.now();
    expect(isSettling({ status: 'closed' })).toBe(true);
    expect(isSettling(reopened(25, now), now)).toBe(true);
    expect(isSettling(reopened(1, now), now)).toBe(false);
    expect(isSettling(null)).toBe(false);
  });

  it('knows when a reopen ends', () => {
    expect(reopenEndsAt({ reopenedAt: { toMillis: () => 0 } })).toBe(24 * HOUR);
    expect(reopenEndsAt({ status: 'active' })).toBeNull();
  });
});

describe('formatTimeLeft', () => {
  it('shows hours and minutes', () => {
    expect(formatTimeLeft((23 * 60 + 12) * 60000)).toBe('23 h 12 m');
    expect(formatTimeLeft(45 * 60000 + 30000)).toBe('45 m');
    expect(formatTimeLeft(30000)).toBe('less than a minute');
  });
});

describe('sortParticipants', () => {
  it('puts the creator first, then the order they were added', () => {
    const sorted = sortParticipants(
      [
        { name: 'Priya', claimedByUid: null, addedAt: at(3) },
        { name: 'Amit', claimedByUid: null, addedAt: at(2) },
        { name: 'Rahul', claimedByUid: 'creator', addedAt: at(1) },
        { name: 'Zoya', claimedByUid: null, addedAt: null },
      ],
      'creator',
    );
    expect(sorted.map((p) => p.name)).toEqual(['Rahul', 'Amit', 'Priya', 'Zoya']);
  });
});

describe('participantStatus', () => {
  it('labels the creator, joined people and placeholders', () => {
    expect(participantStatus({ claimedByUid: 'c' }, 'c')).toBe('Creator');
    expect(participantStatus({ claimedByUid: 'u2' }, 'c')).toBe('Joined');
    expect(participantStatus({ claimedByUid: null }, 'c')).toBe('Not joined yet');
    expect(participantStatus({ claimedByUid: null, leftAt: { seconds: 1 } }, 'c')).toBe(
      'Left the trip',
    );
  });
});

describe('sortTrips', () => {
  it('shows the newest start date first', () => {
    const sorted = sortTrips([
      { id: 'a', startDate: '2026-06-03' },
      { id: 'b', startDate: '2026-12-12' },
      { id: 'c', startDate: '2025-01-01' },
    ]);
    expect(sorted.map((t) => t.id)).toEqual(['b', 'a', 'c']);
  });
});

describe('peopleLabel', () => {
  it('handles one and many', () => {
    expect(peopleLabel(1)).toBe('1 person');
    expect(peopleLabel(4)).toBe('4 people');
  });
});
