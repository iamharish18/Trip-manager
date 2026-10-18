// Add expense. Split among everyone on the trip right now (SPEC §6).

import { useRouter } from 'expo-router';

import ExpenseForm from '@/components/ExpenseForm';
import FormScreen from '@/components/FormScreen';
import ReadOnlyNotice from '@/components/ReadOnlyNotice';
import { addExpense } from '@/services/expenses';
import { useSession } from '@/state/session';
import { useTrip } from '@/state/trips';

export default function NewExpenseScreen() {
  const router = useRouter();
  const { user } = useSession();
  const { tripId, participants, canWrite } = useTrip();

  if (!canWrite) {
    return (
      <FormScreen title="Add expense">
        <ReadOnlyNotice />
      </FormScreen>
    );
  }

  const splitPids = participants.map((p) => p.id);

  function save(values) {
    // Saved to the local cache at once (also offline); syncs later.
    const { saved } = addExpense(tripId, user.uid, { ...values, splitAmongPids: splitPids });
    saved.catch(() => {});
    router.back();
  }

  return (
    <FormScreen title="Add expense">
      <ExpenseForm splitPids={splitPids} onSave={save} saveLabel="Save expense" />
    </FormScreen>
  );
}
