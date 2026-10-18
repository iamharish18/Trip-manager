import { dayLabel, formatDate, formatTripDates, fromIsoDate, isIsoDate, toIsoDate } from './dates';

describe('dayLabel', () => {
  it('says Today and Yesterday, otherwise the date', () => {
    expect(dayLabel('2026-12-14', '2026-12-14')).toBe('Today');
    expect(dayLabel('2026-12-13', '2026-12-14')).toBe('Yesterday');
    expect(dayLabel('2026-12-12', '2026-12-14')).toBe('12 Dec 2026');
  });

  it('handles month and year boundaries', () => {
    expect(dayLabel('2026-12-31', '2027-01-01')).toBe('Yesterday');
    expect(dayLabel('2026-02-28', '2026-03-01')).toBe('Yesterday');
  });
});

describe('isIsoDate', () => {
  it('accepts real calendar dates', () => {
    expect(isIsoDate('2026-12-12')).toBe(true);
    expect(isIsoDate('2028-02-29')).toBe(true);
  });

  it.each(['2026-02-30', '2026-13-01', '12-12-2026', '2026-1-5', '', undefined])(
    'rejects %s',
    (value) => {
      expect(isIsoDate(value)).toBe(false);
    },
  );
});

describe('toIsoDate and fromIsoDate', () => {
  it('round-trip a local calendar date', () => {
    const date = new Date(2026, 11, 5);
    expect(toIsoDate(date)).toBe('2026-12-05');
    expect(fromIsoDate('2026-12-05').getTime()).toBe(date.getTime());
  });
});

describe('formatDate', () => {
  it('shows day, short month and year', () => {
    expect(formatDate('2026-10-17')).toBe('17 Oct 2026');
    expect(formatDate('2027-01-03')).toBe('3 Jan 2027');
  });
});

describe('formatTripDates', () => {
  it('shows "From" when there is no end date', () => {
    expect(formatTripDates('2026-12-12', null)).toBe('From 12 Dec 2026');
  });

  it('shortens ranges within a month', () => {
    expect(formatTripDates('2026-12-12', '2026-12-16')).toBe('12 – 16 Dec 2026');
  });

  it('shortens ranges within a year', () => {
    expect(formatTripDates('2026-11-28', '2026-12-03')).toBe('28 Nov – 3 Dec 2026');
  });

  it('shows both years when they differ', () => {
    expect(formatTripDates('2026-12-28', '2027-01-03')).toBe('28 Dec 2026 – 3 Jan 2027');
  });

  it('shows one date for a one-day trip', () => {
    expect(formatTripDates('2026-12-12', '2026-12-12')).toBe('12 Dec 2026');
  });
});
