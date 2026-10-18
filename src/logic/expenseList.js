import { dayLabel, todayIso } from './dates';

// Sections for the Expenses tab: newest day first, and within a day the
// most recently added first. Returns [{ title, date, data: [expense] }].
export function groupExpensesByDay(expenses, today = todayIso()) {
  const added = (e) => e.createdAt?.toMillis?.() ?? Number.MAX_SAFE_INTEGER;
  const sorted = [...expenses].sort((a, b) => b.date.localeCompare(a.date) || added(b) - added(a));

  const sections = [];
  for (const expense of sorted) {
    const last = sections.at(-1);
    if (last && last.date === expense.date) {
      last.data.push(expense);
    } else {
      sections.push({ title: dayLabel(expense.date, today), date: expense.date, data: [expense] });
    }
  }
  return sections;
}
