import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { buildStatementHtml } from './html';
import type { StatementData } from '../lib/statement';

export function statementFileName(data: StatementData): string {
  const who = data.clientName ? `-${data.clientName.replace(/[^a-z0-9]+/gi, '-')}` : '';
  return `WLS-Statement-${data.reportNo}${who}.pdf`;
}

// Renders the statement to a PDF file and returns its local URI.
export async function statementPdfUri(data: StatementData): Promise<string> {
  const { uri } = await Print.printToFileAsync({ html: buildStatementHtml(data) });
  return uri;
}

// Returns the statement PDF as base64 (for emailing via the Cloud Function).
export async function statementPdfBase64(data: StatementData): Promise<string> {
  const { base64 } = await Print.printToFileAsync({
    html: buildStatementHtml(data),
    base64: true,
  });
  return base64 ?? '';
}

// Opens the platform share sheet (native) or a print/save dialog (web).
export async function shareStatement(data: StatementData): Promise<void> {
  if (Platform.OS === 'web') {
    await Print.printAsync({ html: buildStatementHtml(data) });
    return;
  }
  const uri = await statementPdfUri(data);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `WLS Expense Statement #${data.reportNo}`,
      UTI: 'com.adobe.pdf',
    });
  }
}
