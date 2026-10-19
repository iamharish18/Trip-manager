import { useState } from 'react';
import { Button, Dialog, IconButton, Portal, Text } from 'react-native-paper';

import { describeSync } from '@/logic/sync';
import { useSync } from '@/state/sync';
import { useTrip } from '@/state/trips';
import { useAppTheme } from '@/theme';

// The trip header's cloud icon: Synced / Saving… / Offline (SPEC §12).
// Tapping it explains what's going on.
export default function SyncIcon() {
  const theme = useAppTheme();
  const { offline } = useSync();
  const { pendingCount } = useTrip();
  const [open, setOpen] = useState(false);

  const status = describeSync({ offline, pendingCount });
  const color = {
    synced: theme.app.positive,
    saving: theme.app.primary,
    offline: theme.app.muted,
  }[status.state];

  return (
    <>
      <IconButton
        icon={status.icon}
        iconColor={color}
        size={20}
        accessibilityLabel={`Sync status: ${status.label}`}
        onPress={() => setOpen(true)}
      />
      <Portal>
        <Dialog visible={open} onDismiss={() => setOpen(false)}>
          <Dialog.Title>{status.label}</Dialog.Title>
          <Dialog.Content>
            <Text>{status.explanation}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setOpen(false)}>OK</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
}
