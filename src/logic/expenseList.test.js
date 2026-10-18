import { groupExpensesByDay } from './expenseList';

const at = (ms) => ({ toMillis: () => ms });

describe('groupExpensesByDay', () => {
  it('groups by day, newest day first, newest added first within a day', () => {
    const sections = groupExpensesByDay(
      [
        { id: 'hotel', date: '2026-12-12', createdAt: at(1) },
        { id: 'cab', date: '2026-12-14', createdAt: at(5) },
        { id: 'dinner', date: '2026-12-14', createdAt: at(9) },
        { id: 'lunch', date: '2026-12-13', createdAt: at(3) },
        { id: 'pending', date: '2026-12-14', createdAt: null },
      ],
      '2026-12-14',
    );
    expect(sections.map((s) => s.title)).toEqual(['Today', 'Yesterday', '12 Dec 2026']);
    // An expense not yet confirmed by the server (no createdAt) counts as newest.
    expect(sections[0].data.map((e) => e.id)).toEqual(['pending', 'dinner', 'cab']);
  });

  it('returns no sections for no expenses', () => {
    expect(groupExpensesByDay([], '2026-12-14')).toEqual([]);
  });
});
