// Export the trip as a PDF (SPEC §13): any member, any time, offline too.

import { useState } from 'react';
import { ActivityIndicator, IconButton } from 'react-native-paper';

import { describeError } from '@/logic/errors';
import { exportTripPdf } from '@/services/report';
import { useSync } from '@/state/sync';
import { useTrip } from '@/state/trips';

const MESSAGES = { 'pdf/no-sharing': 'Sharing isn’t available on this phone.' };

export function useExportPdf() {
  const { trip, participants, allExpenses, customCategories, settlements } = useTrip();
  const { showMessage } = useSync();
  const [busy, setBusy] = useState(false);

  async function exportPdf() {
    if (busy) return;
    setBusy(true);
    try {
      await exportTripPdf({
        trip,
        participants,
        expenses: allExpenses,
        customCategories,
        settlements,
      });
    } catch (error) {
      showMessage(
        MESSAGES[error?.code] ?? `Couldn’t make the PDF. ${describeError(error).message}`,
      );
    } finally {
      setBusy(false);
    }
  }

  return { exportPdf, busy };
}

// The PDF icon in the trip header.
export default function ExportPdfButton() {
  const { exportPdf, busy } = useExportPdf();
  if (busy) return <ActivityIndicator size={18} style={{ marginHorizontal: 14 }} />;
  return (
    <IconButton icon="file-pdf-box" size={22} accessibilityLabel="Export PDF" onPress={exportPdf} />
  );
}
