import { pdf } from '@react-pdf/renderer';
import { StatementDocument } from './StatementDocument';
import type { StatementData } from '../lib/statement';

function logoSrc(): string {
  return `${window.location.origin}/wls-logo.png`;
}

export async function statementBlob(data: StatementData): Promise<Blob> {
  return pdf(<StatementDocument data={data} logoSrc={logoSrc()} />).toBlob();
}

export function statementFileName(data: StatementData): string {
  const who = data.clientName ? `-${data.clientName.replace(/[^a-z0-9]+/gi, '-')}` : '';
  return `WLS-Statement-${data.reportNo}${who}.pdf`;
}

export async function downloadStatement(data: StatementData): Promise<void> {
  const blob = await statementBlob(data);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = statementFileName(data);
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Uses the Web Share API (with file) when available, falling back to download.
export async function shareStatementFile(data: StatementData): Promise<boolean> {
  const blob = await statementBlob(data);
  const file = new File([blob], statementFileName(data), { type: 'application/pdf' });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare && nav.canShare({ files: [file] })) {
    await navigator.share({
      files: [file],
      title: `WLS Expense Statement #${data.reportNo}`,
      text: `Expense statement #${data.reportNo}`,
    });
    return true;
  }
  await downloadStatement(data);
  return false;
}
