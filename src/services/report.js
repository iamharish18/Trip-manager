// Makes the trip's PDF summary on the phone and opens the share sheet
// (SPEC §13). Works offline: it uses the data already on the phone.

import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { buildTripReportHtml, reportFileName } from '@/logic/report';

// A4 at 72 points per inch (the print module's default is US Letter).
const A4 = { width: 595, height: 842 };

export async function exportTripPdf(data) {
  const html = buildTripReportHtml(data);
  const { uri } = await Print.printToFileAsync({ html, ...A4 });

  // Give the file a readable name, e.g. "Goa trip – summary.pdf".
  const printed = new File(uri);
  const named = new File(Paths.cache, reportFileName(data.trip.name));
  if (named.exists) named.delete();
  await printed.move(named);

  if (!(await Sharing.isAvailableAsync())) {
    throw Object.assign(new Error('Sharing unavailable'), { code: 'pdf/no-sharing' });
  }
  await Sharing.shareAsync(named.uri, {
    mimeType: 'application/pdf',
    dialogTitle: `Share ${data.trip.name}`,
    UTI: 'com.adobe.pdf',
  });
}
