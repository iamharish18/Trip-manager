// Account: your name (editable), email, and log out.

import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Dialog, IconButton, Portal, Snackbar, Text } from 'react-native-paper';

import Avatar from '@/components/Avatar';
import FormField from '@/components/FormField';
import Screen from '@/components/Screen';
import ScreenHeader from '@/components/ScreenHeader';
import { describeError } from '@/logic/errors';
import { validateName } from '@/logic/validation';
import { logOut } from '@/services/auth';
import { updateProfileName } from '@/services/users';
import { useSession } from '@/state/session';
import { useAppTheme } from '@/theme';

export default function AccountScreen() {
  const theme = useAppTheme();
  const { user, displayName } = useSession();
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [nameError, setNameError] = useState(null);
  const [notice, setNotice] = useState('');

  function startEditing() {
    setDraftName(displayName);
    setNameError(null);
    setEditing(true);
  }

  function saveName() {
    const error = validateName(draftName);
    if (error) {
      setNameError(error);
      return;
    }
    setEditing(false);
    // The screen updates right away from the local cache; this only fails
    // if the server rejects the change.
    updateProfileName(user.uid, draftName.trim()).catch((err) =>
      setNotice(describeError(err).message),
    );
  }

  const cardStyle = [
    styles.card,
    { backgroundColor: theme.app.card, borderColor: theme.app.border },
  ];

  return (
    <Screen>
      <ScreenHeader title="Account" back />

      <View style={styles.avatar}>
        <Avatar name={displayName} size={64} />
      </View>

      <View style={[cardStyle, styles.row]}>
        <View style={styles.grow}>
          <Text variant="labelMedium" style={{ color: theme.app.muted }}>
            Name
          </Text>
          <Text variant="bodyLarge">{displayName}</Text>
        </View>
        <IconButton
          icon="pencil-outline"
          iconColor={theme.app.primary}
          accessibilityLabel="Edit name"
          onPress={startEditing}
        />
      </View>

      <View style={cardStyle}>
        <Text variant="labelMedium" style={{ color: theme.app.muted }}>
          Email
        </Text>
        <Text variant="bodyLarge">{user?.email}</Text>
      </View>

      <Text variant="bodySmall" style={[styles.note, { color: theme.app.muted }]}>
        Your name on each trip is set when you join it and can differ from this.
      </Text>

      <Button
        mode="outlined"
        icon="logout"
        textColor={theme.app.negative}
        style={[styles.logout, { borderColor: theme.app.negative }]}
        onPress={() => logOut()}
      >
        Log out
      </Button>

      <Portal>
        <Dialog visible={editing} onDismiss={() => setEditing(false)}>
          <Dialog.Title>Edit name</Dialog.Title>
          <Dialog.Content>
            <FormField
              label="Your name"
              value={draftName}
              onChangeText={(text) => {
                setDraftName(text);
                setNameError(null);
              }}
              error={nameError}
              autoCapitalize="words"
              autoFocus
              maxLength={60}
              onSubmitEditing={saveName}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setEditing(false)}>Cancel</Button>
            <Button onPress={saveName}>Save</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar visible={Boolean(notice)} onDismiss={() => setNotice('')} duration={3000}>
        {notice}
      </Snackbar>
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatar: { alignItems: 'center', marginTop: 8, marginBottom: 20 },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 8,
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingRight: 4 },
  grow: { flex: 1 },
  note: { marginHorizontal: 4, marginTop: 2 },
  logout: { marginTop: 'auto' },
});
