// Add expense. Split among everyone on the trip right now (SPEC §6).

import { useRouter } from 'expo-router';

import ExpenseForm from '@/components/ExpenseForm';
import FormScreen from '@/components/FormScreen';
import ReadOnlyNotice from '@/components/ReadOnlyNotice';
import { findCategory } from '@/logic/categories';
import { expenseWhat } from '@/logic/sync';
import { addExpense } from '@/services/expenses';
import { notifyNewExpense } from '@/services/notifications';
import { useSession } from '@/state/session';
import { useTrip } from '@/state/trips';

export default function NewExpenseScreen() {
  const router = useRouter();
  const { user } = useSession();
  const { tripId, participants, customCategories, canWrite, track } = useTrip();

  if (!canWrite) {
    return (
      <FormScreen title="Add expense">
        <ReadOnlyNotice />
      </FormScreen>
    );
  }

  const splitPids = participants.map((p) => p.id);

  function save(values) {
    // Saved to the local cache at once (also offline); syncs later. Once the
    // server has it, notify the others (if offline, the app catches up later).
    const { id, saved } = addExpense(tripId, user.uid, { ...values, splitAmongPids: splitPids });
    const what = expenseWhat(
      values.description,
      findCategory(values.categoryId, customCategories).name,
    );
    track(saved, what);
    saved.then(() => notifyNewExpense(tripId, id, user.uid)).catch(() => {});
    router.back();
  }

  return (
    <FormScreen title="Add expense">
      <ExpenseForm splitPids={splitPids} onSave={save} saveLabel="Save expense" />
    </FormScreen>
  );
}
