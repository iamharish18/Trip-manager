import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import CategoryIcon from '@/components/CategoryIcon';
import { formatRupees } from '@/logic/format';
import { useAppTheme } from '@/theme';

// One expense in the list: icon, description (or category name), payer,
// comment count, amount.
export default function ExpenseRow({ expense, category, payerLabel, commentLabel, onPress }) {
  const theme = useAppTheme();
  const title = expense.description || category.name;
  const subtitle = commentLabel ? `${payerLabel} · ${commentLabel}` : payerLabel;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${formatRupees(expense.amount)}, ${payerLabel}`}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: theme.app.card, borderColor: theme.app.border },
        pressed && styles.pressed,
      ]}
    >
      <CategoryIcon category={category} size={34} />
      <View style={styles.text}>
        <Text numberOfLines={1}>{title}</Text>
        <Text variant="bodySmall" style={{ color: theme.app.muted }} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      <Text variant="titleSmall">{formatRupees(expense.amount)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  pressed: { opacity: 0.7 },
  text: { flex: 1, minWidth: 0 },
});
