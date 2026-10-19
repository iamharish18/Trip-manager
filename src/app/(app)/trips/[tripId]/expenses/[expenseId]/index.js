// Expense detail: what, who paid, how it's split, and comments.

import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { IconButton, Text } from 'react-native-paper';

import Avatar from '@/components/Avatar';
import CategoryIcon from '@/components/CategoryIcon';
import CommentsSection from '@/components/CommentsSection';
import ComingSoon from '@/components/ComingSoon';
import FormScreen from '@/components/FormScreen';
import { findCategory } from '@/logic/categories';
import { formatDate } from '@/logic/dates';
import { formatRupees } from '@/logic/format';
import { splitEqually } from '@/logic/money';
import { payerLabel } from '@/logic/position';
import { expenseWhat } from '@/logic/sync';
import { setExpenseDeleted } from '@/services/expenses';
import { useTrip } from '@/state/trips';
import { useAppTheme } from '@/theme';

export default function ExpenseDetailScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const { expenseId } = useLocalSearchParams();
  const {
    tripId,
    expenses,
    participants,
    customCategories,
    me,
    canWrite,
    setDeletedExpenseId,
    track,
  } = useTrip();
  const expense = expenses.find((e) => e.id === expenseId);

  if (!expense) {
    return (
      <FormScreen title="Expense">
        <ComingSoon
          icon="receipt-text-outline"
          title="Expense not found"
          message="It may have been deleted."
        />
      </FormScreen>
    );
  }

  const category = findCategory(expense.categoryId, customCategories);
  const shares = splitEqually(expense.amount, expense.splitAmongPids, expense.paidByPid);
  const nameOf = (pid) => participants.find((p) => p.id === pid)?.name ?? 'Someone';
  const base = Math.floor(expense.amount / expense.splitAmongPids.length);
  const even = Object.values(shares).every((s) => s === base);

  function remove() {
    track(
      setExpenseDeleted(tripId, expense.id, true),
      expenseWhat(expense.description, category.name, { change: true }),
    );
    // The Expenses tab offers Undo for a few seconds.
    setDeletedExpenseId(expense.id);
    router.back();
  }

  const actions = canWrite ? (
    <View style={styles.actions}>
      <IconButton
        icon="pencil-outline"
        accessibilityLabel="Edit expense"
        onPress={() => router.push(`/trips/${tripId}/expenses/${expense.id}/edit`)}
      />
      <IconButton
        icon="delete-outline"
        iconColor={theme.app.negative}
        accessibilityLabel="Delete expense"
        onPress={remove}
      />
    </View>
  ) : null;

  return (
    <FormScreen title="Expense" right={actions}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.heading}>
          <CategoryIcon category={category} size={44} />
          <View style={styles.grow}>
            <Text variant="titleMedium">{expense.description || category.name}</Text>
            <Text variant="bodySmall" style={{ color: theme.app.muted }}>
              {category.name} · {formatDate(expense.date)} ·{' '}
              {payerLabel(expense.paidByPid, participants, me?.id)}
            </Text>
          </View>
        </View>

        <Text variant="headlineMedium" style={styles.amount}>
          {formatRupees(expense.amount)}
        </Text>

        <View
          style={[styles.card, { backgroundColor: theme.app.card, borderColor: theme.app.border }]}
        >
          <Text variant="bodySmall" style={[styles.cardTitle, { color: theme.app.muted }]}>
            Split equally among {expense.splitAmongPids.length}
            {even ? ` · ${formatRupees(base)} each` : ''}
          </Text>
          {expense.splitAmongPids.map((pid) => {
            const isPayer = pid === expense.paidByPid;
            return (
              <View key={pid} style={styles.shareRow}>
                <Avatar name={nameOf(pid)} size={28} />
                <Text style={styles.grow} numberOfLines={1}>
                  {pid === me?.id ? 'You' : nameOf(pid)}
                  {isPayer ? (
                    <Text style={{ color: theme.app.muted }}>
                      {' '}
                      · paid {formatRupees(expense.amount)}
                    </Text>
                  ) : null}
                </Text>
                <Text>{formatRupees(shares[pid])}</Text>
              </View>
            );
          })}
        </View>

        <CommentsSection expenseId={expense.id} />
      </ScrollView>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingTop: 0 },
  actions: { flexDirection: 'row', marginRight: -8 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  grow: { flex: 1, minWidth: 0 },
  amount: { marginVertical: 12 },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: 12, gap: 10 },
  cardTitle: { marginBottom: 2 },
  shareRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
