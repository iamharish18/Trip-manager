// Insights tab: spending by category as a donut, plus a row per category.

import { FlatList, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import ComingSoon from '@/components/ComingSoon';
import DonutChart from '@/components/DonutChart';
import { findCategory } from '@/logic/categories';
import { formatRupees } from '@/logic/format';
import { wholePercentages } from '@/logic/insights';
import { totalSpent, totalsByCategory } from '@/logic/money';
import { useTrip } from '@/state/trips';
import { useAppTheme } from '@/theme';

export default function InsightsTab() {
  const theme = useAppTheme();
  const { expenses, customCategories } = useTrip();

  if (expenses.length === 0) {
    return (
      <ComingSoon
        icon="chart-donut"
        title="No spending yet"
        message="Once expenses are added, you’ll see spending by category here."
      />
    );
  }

  const totals = totalsByCategory(expenses);
  const percentages = wholePercentages(totals.map((t) => t.total));
  const rows = totals.map((t, i) => ({
    ...t,
    category: findCategory(t.categoryId, customCategories),
    percent: percentages[i],
  }));

  return (
    <FlatList
      data={rows}
      keyExtractor={(row) => row.categoryId}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <View style={styles.chart}>
          <DonutChart
            segments={rows.map((r) => ({
              key: r.categoryId,
              value: r.total,
              color: r.category.color,
            }))}
          >
            <Text variant="bodySmall" style={{ color: theme.app.muted }}>
              Total
            </Text>
            <Text variant="titleMedium">{formatRupees(totalSpent(expenses))}</Text>
          </DonutChart>
        </View>
      }
      renderItem={({ item }) => (
        <View
          style={[styles.row, { backgroundColor: theme.app.card, borderColor: theme.app.border }]}
          accessible
          accessibilityLabel={`${item.category.name}: ${formatRupees(item.total)}, ${item.percent}%`}
        >
          <View style={[styles.dot, { backgroundColor: item.category.color }]} />
          <Text style={styles.grow} numberOfLines={1}>
            {item.category.name}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.app.muted }}>
            {item.percent}%
          </Text>
          <Text variant="titleSmall" style={styles.amount}>
            {formatRupees(item.total)}
          </Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 16, paddingBottom: 16 },
  chart: { alignItems: 'center', marginVertical: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 48,
    marginBottom: 8,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  grow: { flex: 1, minWidth: 0 },
  amount: { minWidth: 72, textAlign: 'right' },
});
