import { isTripOpen, participantStatus, peopleLabel, sortParticipants, sortTrips } from './trips';

const at = (ms) => ({ toMillis: () => ms });

describe('isTripOpen', () => {
  it('is open while active or reopened', () => {
    expect(isTripOpen({ status: 'active' })).toBe(true);
    expect(isTripOpen({ status: 'reopened' })).toBe(true);
    expect(isTripOpen({ status: 'closed' })).toBe(false);
    expect(isTripOpen(null)).toBe(false);
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
