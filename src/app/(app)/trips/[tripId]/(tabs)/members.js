// Members: the Trip ID to share, and the people on the trip.
// The creator can add, rename and remove people (SPEC §5).

import { useState } from 'react';
import { FlatList, Share, StyleSheet, View } from 'react-native';
import { Button, Dialog, IconButton, Menu, Portal, Snackbar, Text } from 'react-native-paper';

import Avatar from '@/components/Avatar';
import FormField from '@/components/FormField';
import { joinShareMessage } from '@/logic/joinCode';
import { expenseCountFor } from '@/logic/money';
import { participantStatus, sortParticipants } from '@/logic/trips';
import { MAX_PARTICIPANTS, validateParticipantName } from '@/logic/validation';
import { addParticipant, removeParticipant, renameParticipant } from '@/services/trips';
import { useSession } from '@/state/session';
import { useTrip } from '@/state/trips';
import { useAppTheme } from '@/theme';

function TripIdCard({ trip }) {
  const theme = useAppTheme();

  function share() {
    Share.share({ message: joinShareMessage(trip) });
  }

  return (
    <View style={[styles.idCard, { backgroundColor: theme.app.primaryTint }]}>
      <Text variant="bodySmall" style={{ color: theme.app.muted }}>
        Trip ID · share it so friends can join
      </Text>
      <View style={styles.idRow}>
        <Text variant="headlineSmall" selectable style={styles.code}>
          {trip.joinCode}
        </Text>
        <IconButton
          icon="share-variant-outline"
          iconColor={theme.app.primary}
          accessibilityLabel="Share join link"
          onPress={share}
        />
      </View>
      <Text variant="bodySmall" style={{ color: theme.app.muted }}>
        Expires when the trip is closed. Long-press the code to copy it.
      </Text>
    </View>
  );
}

export default function MembersTab() {
  const theme = useAppTheme();
  const { user } = useSession();
  const { trip, tripId, participants, expenses, isCreator, isOpen, track } = useTrip();

  const [menuFor, setMenuFor] = useState(null);
  // { mode: 'add' | 'rename', participant?, name, error }
  const [editor, setEditor] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [notice, setNotice] = useState('');

  const canManage = isCreator && isOpen;
  const sorted = sortParticipants(participants, trip.creatorUid);
  const full = participants.length >= MAX_PARTICIPANTS;

  // Writes apply to the local cache at once (also offline); a failure is
  // reported if the server later rejects it.
  function saveEditor() {
    const others = participants.filter((p) => p.id !== editor.participant?.id).map((p) => p.name);
    const error = validateParticipantName(editor.name, others);
    if (error) {
      setEditor((e) => ({ ...e, error }));
      return;
    }
    const name = editor.name.trim();
    if (editor.mode === 'add') {
      track(addParticipant(tripId, name), `Adding ${name}`);
    } else {
      track(renameParticipant(tripId, editor.participant.id, name), `Renaming to ${name}`);
    }
    setEditor(null);
  }

  function confirmRemove() {
    // Re-check: an expense may have been added since the menu opened.
    if (expenseCountFor(removing.id, expenses) === 0) {
      track(removeParticipant(tripId, removing.id), `Removing ${removing.name}`);
    } else {
      setNotice(`${removing.name} is in an expense now, so they can’t be removed.`);
    }
    setRemoving(null);
  }

  function renderPerson({ item: person }) {
    const isMe = person.claimedByUid === user.uid;
    const isTripCreator = person.claimedByUid === trip.creatorUid;
    // People in expenses can't be removed (SPEC §5).
    const inExpenses = expenseCountFor(person.id, expenses);
    return (
      <View
        style={[styles.person, { backgroundColor: theme.app.card, borderColor: theme.app.border }]}
      >
        <Avatar name={person.name} />
        <View style={styles.grow}>
          <Text numberOfLines={1}>
            {person.name}
            {isMe ? <Text style={{ color: theme.app.muted }}> · You</Text> : null}
          </Text>
          <Text
            variant="bodySmall"
            style={{ color: person.claimedByUid ? theme.app.positive : theme.app.muted }}
          >
            {participantStatus(person, trip.creatorUid)}
          </Text>
        </View>
        {canManage ? (
          <Menu
            visible={menuFor === person.id}
            onDismiss={() => setMenuFor(null)}
            anchor={
              <IconButton
                icon="dots-vertical"
                accessibilityLabel={`Options for ${person.name}`}
                onPress={() => setMenuFor(person.id)}
              />
            }
          >
            <Menu.Item
              leadingIcon="pencil-outline"
              title="Rename"
              onPress={() => {
                setMenuFor(null);
                setEditor({ mode: 'rename', participant: person, name: person.name, error: null });
              }}
            />
            {!isTripCreator && !person.claimedByUid && inExpenses > 0 ? (
              <Menu.Item
                leadingIcon="lock-outline"
                title={`Can’t remove: in ${inExpenses} expense${inExpenses === 1 ? '' : 's'}`}
                disabled
              />
            ) : null}
            {!isTripCreator && !person.claimedByUid && inExpenses === 0 ? (
              <Menu.Item
                leadingIcon="delete-outline"
                title="Remove"
                titleStyle={{ color: theme.app.negative }}
                onPress={() => {
                  setMenuFor(null);
                  setRemoving(person);
                }}
              />
            ) : null}
          </Menu>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={sorted}
        keyExtractor={(p) => p.id}
        renderItem={renderPerson}
        ListHeaderComponent={trip.status === 'active' ? <TripIdCard trip={trip} /> : null}
        contentContainerStyle={styles.list}
      />

      {canManage ? (
        full ? (
          <Text variant="bodySmall" style={[styles.full, { color: theme.app.muted }]}>
            A trip can have up to {MAX_PARTICIPANTS} people.
          </Text>
        ) : (
          <Button
            mode="outlined"
            icon="account-plus-outline"
            style={styles.add}
            onPress={() => setEditor({ mode: 'add', name: '', error: null })}
          >
            Add person
          </Button>
        )
      ) : null}

      <Portal>
        <Dialog visible={Boolean(editor)} onDismiss={() => setEditor(null)}>
          <Dialog.Title>{editor?.mode === 'add' ? 'Add person' : 'Rename'}</Dialog.Title>
          <Dialog.Content>
            <FormField
              label="Name"
              value={editor?.name ?? ''}
              onChangeText={(text) => setEditor((e) => ({ ...e, name: text, error: null }))}
              error={editor?.error}
              autoCapitalize="words"
              autoFocus
              maxLength={60}
              onSubmitEditing={saveEditor}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setEditor(null)}>Cancel</Button>
            <Button onPress={saveEditor}>{editor?.mode === 'add' ? 'Add' : 'Save'}</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={Boolean(removing)} onDismiss={() => setRemoving(null)}>
          <Dialog.Title>Remove {removing?.name}?</Dialog.Title>
          <Dialog.Content>
            <Text>They’ll no longer be part of this trip.</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setRemoving(null)}>Cancel</Button>
            <Button textColor={theme.app.negative} onPress={confirmRemove}>
              Remove
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar visible={Boolean(notice)} onDismiss={() => setNotice('')} duration={3000}>
        {notice}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  list: { paddingTop: 8, paddingBottom: 8 },
  idCard: { borderRadius: 12, padding: 12, marginBottom: 12 },
  idRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  code: { letterSpacing: 4 },
  person: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingLeft: 12,
    minHeight: 56,
    marginBottom: 8,
  },
  grow: { flex: 1, minWidth: 0 },
  add: { marginBottom: 12 },
  full: { textAlign: 'center', marginBottom: 12 },
});
