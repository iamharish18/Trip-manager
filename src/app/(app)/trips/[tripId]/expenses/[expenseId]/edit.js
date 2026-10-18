// Edit expense. The split list stays as it was when the expense was added.

import { useLocalSearchParams, useRouter } from 'expo-router';

import ComingSoon from '@/components/ComingSoon';
import ExpenseForm from '@/components/ExpenseForm';
import FormScreen from '@/components/FormScreen';
import ReadOnlyNotice from '@/components/ReadOnlyNotice';
import { updateExpense } from '@/services/expenses';
import { useTrip } from '@/state/trips';

export default function EditExpenseScreen() {
  const router = useRouter();
  const { expenseId } = useLocalSearchParams();
  const { tripId, expenses, canWrite } = useTrip();
  const expense = expenses.find((e) => e.id === expenseId);

  if (!expense) {
    return (
      <FormScreen title="Edit expense">
        <ComingSoon
          icon="receipt-text-outline"
          title="Expense not found"
          message="It may have been deleted."
        />
      </FormScreen>
    );
  }

  if (!canWrite) {
    return (
      <FormScreen title="Edit expense">
        <ReadOnlyNotice />
      </FormScreen>
    );
  }

  function save(values) {
    updateExpense(tripId, expense.id, values).catch(() => {});
    router.back();
  }

  return (
    <FormScreen title="Edit expense">
      <ExpenseForm
        initial={expense}
        splitPids={expense.splitAmongPids}
        onSave={save}
        saveLabel="Save changes"
      />
    </FormScreen>
  );
}
