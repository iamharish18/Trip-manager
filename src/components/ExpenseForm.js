// The Add / Edit expense form (SPEC §6, §15.5 screen 6).
// `splitPids` are the people the expense is split among; "Paid by" offers
// only them. `onSave` receives { amount, paidByPid, categoryId, date, description }.

import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Chip, Dialog, Portal, Text, TextInput } from 'react-native-paper';

import DateField from '@/components/DateField';
import FormField from '@/components/FormField';
import { allCategories, validateCategoryName } from '@/logic/categories';
import { todayIso } from '@/logic/dates';
import { formatRupees, groupIndian } from '@/logic/format';
import { parseAmount, splitEqually } from '@/logic/money';
import {
  collectErrors,
  validateAmount,
  validateDescription,
  validateExpenseDate,
} from '@/logic/validation';
import { addCategory } from '@/services/expenses';
import { useSession } from '@/state/session';
import { useTrip } from '@/state/trips';
import { useAppTheme } from '@/theme';

function splitPreview(amountText, splitPids, payerPid, participants) {
  const amount = parseAmount(amountText);
  const n = splitPids.length;
  if (!amount || amount < 1) return `Split equally among ${n}`;
  const shares = splitEqually(amount, splitPids, payerPid);
  const base = Math.floor(amount / n);
  const payerShare = shares[payerPid] ?? base;
  if (payerShare === base) return `Split equally among ${n} · ${formatRupees(base)} each`;
  const payer = participants.find((p) => p.id === payerPid)?.name ?? 'payer';
  return `Split equally among ${n} · ${formatRupees(base)} each (${payer} ${formatRupees(payerShare)})`;
}

export default function ExpenseForm({ initial, splitPids, onSave, saveLabel }) {
  const theme = useAppTheme();
  const { user } = useSession();
  const { tripId, participants, customCategories, me } = useTrip();

  const [amountText, setAmountText] = useState(
    initial?.amount ? groupIndian(String(initial.amount)) : '',
  );
  const [paidByPid, setPaidByPid] = useState(
    initial?.paidByPid ?? (me && splitPids.includes(me.id) ? me.id : splitPids[0]),
  );
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? 'food');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [date, setDate] = useState(initial?.date ?? todayIso());
  const [errors, setErrors] = useState({});
  const [newCategory, setNewCategory] = useState(null); // { name, error }

  const payers = participants.filter((p) => splitPids.includes(p.id));
  const categories = allCategories(customCategories);

  function onAmountChange(text) {
    // Keep digits only and show them with Indian grouping as you type.
    const digits = text.replace(/\D/g, '').replace(/^0+/, '').slice(0, 9);
    setAmountText(digits ? groupIndian(digits) : '');
    setErrors((e) => ({ ...e, amount: undefined }));
  }

  function saveCategory() {
    const error = validateCategoryName(newCategory.name, customCategories);
    if (error) {
      setNewCategory((c) => ({ ...c, error }));
      return;
    }
    const { id, saved } = addCategory(tripId, user.uid, newCategory.name);
    saved.catch(() => {});
    setCategoryId(id);
    setNewCategory(null);
  }

  function save() {
    const found = collectErrors({
      amount: validateAmount(amountText),
      description: validateDescription(description),
      date: validateExpenseDate(date),
    });
    setErrors(found);
    if (Object.keys(found).length) return;
    onSave({
      amount: parseAmount(amountText),
      paidByPid,
      categoryId,
      date,
      description: description.trim(),
    });
  }

  return (
    <View style={styles.fill}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.amountBox}>
          <Text variant="bodySmall" style={{ color: theme.app.muted }}>
            Amount
          </Text>
          <TextInput
            mode="flat"
            value={amountText}
            onChangeText={onAmountChange}
            keyboardType="number-pad"
            placeholder="0"
            left={<TextInput.Affix text="₹" textStyle={styles.amountText} />}
            style={[styles.amountInput, { backgroundColor: 'transparent' }]}
            contentStyle={styles.amountText}
            underlineColor="transparent"
            error={Boolean(errors.amount)}
            accessibilityLabel="Amount in rupees"
            autoFocus={!initial}
          />
          {errors.amount ? (
            <Text variant="bodySmall" style={{ color: theme.app.negative }}>
              {errors.amount}
            </Text>
          ) : null}
        </View>

        <Text variant="labelMedium" style={[styles.label, { color: theme.app.muted }]}>
          Paid by
        </Text>
        <View style={styles.chips}>
          {payers.map((p) => (
            <Chip
              key={p.id}
              selected={paidByPid === p.id}
              showSelectedOverlay
              onPress={() => setPaidByPid(p.id)}
              style={styles.chip}
            >
              {p.id === me?.id ? 'You' : p.name}
            </Chip>
          ))}
        </View>

        <Text variant="labelMedium" style={[styles.label, { color: theme.app.muted }]}>
          Category
        </Text>
        <View style={styles.chips}>
          {categories.map((c) => (
            <Chip
              key={c.id}
              icon={c.icon}
              selected={categoryId === c.id}
              showSelectedOverlay
              onPress={() => setCategoryId(c.id)}
              style={styles.chip}
            >
              {c.name}
            </Chip>
          ))}
          <Chip
            icon="plus"
            mode="outlined"
            onPress={() => setNewCategory({ name: '', error: null })}
            style={styles.chip}
          >
            New
          </Chip>
        </View>

        <View style={styles.gap} />
        <FormField
          label="Description (optional)"
          value={description}
          onChangeText={(text) => {
            setDescription(text);
            setErrors((e) => ({ ...e, description: undefined }));
          }}
          error={errors.description}
          maxLength={120}
          autoCapitalize="sentences"
        />
        <DateField
          label="Date"
          value={date}
          onChange={(value) => {
            setDate(value);
            setErrors((e) => ({ ...e, date: undefined }));
          }}
          error={errors.date}
        />
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: theme.app.border }]}>
        <Text variant="bodySmall" style={[styles.preview, { color: theme.app.muted }]}>
          {splitPreview(amountText, splitPids, paidByPid, participants)}
        </Text>
        <Button mode="contained" onPress={save}>
          {saveLabel}
        </Button>
      </View>

      <Portal>
        <Dialog visible={Boolean(newCategory)} onDismiss={() => setNewCategory(null)}>
          <Dialog.Title>New category</Dialog.Title>
          <Dialog.Content>
            <FormField
              label="Name"
              value={newCategory?.name ?? ''}
              onChangeText={(text) => setNewCategory({ name: text, error: null })}
              error={newCategory?.error}
              autoCapitalize="words"
              autoFocus
              maxLength={30}
              onSubmitEditing={saveCategory}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setNewCategory(null)}>Cancel</Button>
            <Button onPress={saveCategory}>Add</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: 16, paddingTop: 0 },
  amountBox: { alignItems: 'center', marginBottom: 12 },
  amountInput: { alignSelf: 'stretch' },
  amountText: { fontSize: 34, textAlign: 'center' },
  label: { marginTop: 8, marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: { marginRight: 6, marginBottom: 6 },
  gap: { height: 8 },
  footer: { padding: 16, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth },
  preview: { textAlign: 'center', marginBottom: 8 },
});
