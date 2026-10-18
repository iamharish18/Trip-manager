// Expenses tab: summary card, expenses grouped by day, and the + button.

import { useRouter } from 'expo-router';
import { SectionList, StyleSheet, View } from 'react-native';
import { ActivityIndicator, FAB, Snackbar, Text } from 'react-native-paper';

import ComingSoon from '@/components/ComingSoon';
import ExpenseRow from '@/components/ExpenseRow';
import { findCategory } from '@/logic/categories';
import { groupExpensesByDay } from '@/logic/expenseList';
import { formatRupees } from '@/logic/format';
import { computeBalances, totalSpent } from '@/logic/money';
import { describePosition, payerLabel } from '@/logic/position';
import { setExpenseDeleted } from '@/services/expenses';
import { useTrip } from '@/state/trips';
import { useAppTheme } from '@/theme';

function SummaryCard({ total, position }) {
  const theme = useAppTheme();
  const toneColor = {
    positive: theme.app.positive,
    negative: theme.app.negative,
    neutral: theme.app.muted,
  };
  return (
    <View style={[styles.summary, { backgroundColor: theme.app.primaryTint }]}>
      <Text variant="bodySmall" style={{ color: theme.app.muted }}>
        Total spent
      </Text>
      <Text variant="headlineSmall">{formatRupees(total)}</Text>
      {position ? (
        <Text variant="titleSmall" style={{ color: toneColor[position.tone] }}>
          {position.text}
        </Text>
      ) : null}
    </View>
  );
}

export default function ExpensesTab() {
  const theme = useAppTheme();
  const router = useRouter();
  const {
    tripId,
    expenses,
    expensesLoading,
    participants,
    customCategories,
    me,
    canWrite,
    deletedExpenseId,
    setDeletedExpenseId,
  } = useTrip();

  const balances = computeBalances(expenses, participants);
  const position = me && expenses.length ? describePosition(balances[me.id]?.net ?? 0) : null;
  const sections = groupExpensesByDay(expenses);

  function undoDelete() {
    setExpenseDeleted(tripId, deletedExpenseId, false).catch(() => {});
    setDeletedExpenseId(null);
  }

  let body;
  if (expensesLoading) {
    body = (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  } else if (expenses.length === 0) {
    body = (
      <ComingSoon
        icon="receipt-text-outline"
        title="No expenses yet"
        message={
          canWrite ? 'Tap + to add the first one.' : 'Expenses added to this trip appear here.'
        }
      />
    );
  } else {
    body = (
      <SectionList
        sections={sections}
        keyExtractor={(e) => e.id}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.list}
        ListHeaderComponent={<SummaryCard total={totalSpent(expenses)} position={position} />}
        renderSectionHeader={({ section }) => (
          <Text variant="labelMedium" style={[styles.day, { color: theme.app.muted }]}>
            {section.title}
          </Text>
        )}
        renderItem={({ item }) => (
          <ExpenseRow
            expense={item}
            category={findCategory(item.categoryId, customCategories)}
            payerLabel={payerLabel(item.paidByPid, participants, me?.id)}
            onPress={() => router.push(`/trips/${tripId}/expenses/${item.id}`)}
          />
        )}
      />
    );
  }

  return (
    <View style={styles.container}>
      {body}

      {canWrite ? (
        <FAB
          icon="plus"
          accessibilityLabel="Add expense"
          style={[
            styles.fab,
            { backgroundColor: theme.app.primary },
            // Stay above the Undo message while it shows.
            deletedExpenseId && styles.fabRaised,
          ]}
          color={theme.app.onPrimary}
          onPress={() => router.push(`/trips/${tripId}/expenses/new`)}
        />
      ) : null}

      <Snackbar
        visible={Boolean(deletedExpenseId)}
        onDismiss={() => setDeletedExpenseId(null)}
        duration={5000}
        action={{ label: 'Undo', onPress: undoDelete }}
      >
        Expense deleted
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 96 },
  summary: { borderRadius: 12, padding: 14, marginBottom: 8, gap: 2 },
  day: { marginTop: 8, marginBottom: 6 },
  fab: { position: 'absolute', right: 16, bottom: 16 },
  fabRaised: { bottom: 80 },
});
