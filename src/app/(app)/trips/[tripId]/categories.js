// Trip settings → Categories: defaults, plus custom ones that members can
// add and delete when unused (SPEC §7).

import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Button, Dialog, IconButton, Portal, Snackbar, Text } from 'react-native-paper';

import CategoryIcon from '@/components/CategoryIcon';
import FormField from '@/components/FormField';
import FormScreen from '@/components/FormScreen';
import { allCategories, validateCategoryName } from '@/logic/categories';
import { expenseCountForCategory } from '@/logic/money';
import { addCategory, deleteCategory } from '@/services/expenses';
import { useSession } from '@/state/session';
import { useTrip } from '@/state/trips';
import { useAppTheme } from '@/theme';

const usageLabel = (count) =>
  count === 0 ? 'Not used yet' : `Used in ${count} expense${count === 1 ? '' : 's'}`;

export default function CategoriesScreen() {
  const theme = useAppTheme();
  const { user } = useSession();
  const { tripId, expenses, customCategories, canWrite, track } = useTrip();
  const [adding, setAdding] = useState(null); // { name, error }
  const [deleting, setDeleting] = useState(null);
  const [notice, setNotice] = useState('');

  const categories = allCategories(customCategories);
  const rows = [
    { type: 'label', key: 'l-default', text: 'Default' },
    ...categories.filter((c) => !c.isCustom).map((c) => ({ type: 'category', key: c.id, c })),
    { type: 'label', key: 'l-custom', text: 'Custom' },
    ...categories.filter((c) => c.isCustom).map((c) => ({ type: 'category', key: c.id, c })),
  ];
  if (!customCategories.length) rows.push({ type: 'empty', key: 'empty' });

  function saveNew() {
    const error = validateCategoryName(adding.name, customCategories);
    if (error) {
      setAdding((a) => ({ ...a, error }));
      return;
    }
    track(
      addCategory(tripId, user.uid, adding.name).saved,
      `Your category “${adding.name.trim()}”`,
    );
    setAdding(null);
  }

  function confirmDelete() {
    track(deleteCategory(tripId, deleting.id), `Deleting “${deleting.name}”`);
    setDeleting(null);
  }

  function renderRow({ item }) {
    if (item.type === 'label') {
      return (
        <Text variant="labelMedium" style={[styles.label, { color: theme.app.muted }]}>
          {item.text}
        </Text>
      );
    }
    if (item.type === 'empty') {
      return (
        <Text variant="bodySmall" style={[styles.empty, { color: theme.app.muted }]}>
          No custom categories yet.
        </Text>
      );
    }
    const { c } = item;
    const count = expenseCountForCategory(c.id, expenses);
    return (
      <View
        style={[styles.row, { backgroundColor: theme.app.card, borderColor: theme.app.border }]}
      >
        <CategoryIcon category={c} size={32} />
        <View style={styles.grow}>
          <Text>{c.name}</Text>
          <Text variant="bodySmall" style={{ color: theme.app.muted }}>
            {usageLabel(count)}
          </Text>
        </View>
        {c.isCustom && canWrite ? (
          count > 0 ? (
            <IconButton
              icon="lock-outline"
              iconColor={theme.app.muted}
              accessibilityLabel={`${c.name} can't be deleted`}
              onPress={() =>
                setNotice(
                  `${c.name} is used by ${count} expense${count === 1 ? '' : 's'}, so it can’t be deleted.`,
                )
              }
            />
          ) : (
            <IconButton
              icon="delete-outline"
              iconColor={theme.app.negative}
              accessibilityLabel={`Delete ${c.name}`}
              onPress={() => setDeleting(c)}
            />
          )
        ) : null}
      </View>
    );
  }

  return (
    <FormScreen title="Categories">
      <FlatList
        data={rows}
        keyExtractor={(r) => r.key}
        renderItem={renderRow}
        contentContainerStyle={styles.list}
      />

      {canWrite ? (
        <View style={styles.footer}>
          <Button mode="outlined" icon="plus" onPress={() => setAdding({ name: '', error: null })}>
            Add category
          </Button>
        </View>
      ) : null}

      <Portal>
        <Dialog visible={Boolean(adding)} onDismiss={() => setAdding(null)}>
          <Dialog.Title>New category</Dialog.Title>
          <Dialog.Content>
            <FormField
              label="Name"
              value={adding?.name ?? ''}
              onChangeText={(text) => setAdding({ name: text, error: null })}
              error={adding?.error}
              autoCapitalize="words"
              autoFocus
              maxLength={30}
              onSubmitEditing={saveNew}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setAdding(null)}>Cancel</Button>
            <Button onPress={saveNew}>Add</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={Boolean(deleting)} onDismiss={() => setDeleting(null)}>
          <Dialog.Title>Delete {deleting?.name}?</Dialog.Title>
          <Dialog.Content>
            <Text>It isn’t used by any expense.</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleting(null)}>Cancel</Button>
            <Button textColor={theme.app.negative} onPress={confirmDelete}>
              Delete
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar visible={Boolean(notice)} onDismiss={() => setNotice('')} duration={3500}>
        {notice}
      </Snackbar>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 16, paddingBottom: 16 },
  label: { marginTop: 8, marginBottom: 6 },
  empty: { marginHorizontal: 4, marginBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingLeft: 12,
    minHeight: 56,
    marginBottom: 8,
  },
  grow: { flex: 1, minWidth: 0 },
  footer: { padding: 16, paddingTop: 0 },
});
