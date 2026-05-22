import { doc, setDoc } from 'firebase/firestore';
import { auth, db, functionsBaseUrl } from './firebase';
import { updateReport } from './db';
import type { StatementData } from './statement';

export const emailEnabled = Boolean(functionsBaseUrl);
export const shareEnabled = Boolean(functionsBaseUrl);

async function authHeader(): Promise<Record<string, string>> {
  const token = await auth.currentUser?.getIdToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1] ?? '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Generates the statement PDF and emails it via the sendReport Cloud Function.
export async function emailStatement(
  data: StatementData,
  to: string,
  message: string,
): Promise<void> {
  if (!functionsBaseUrl) throw new Error('Email is not configured.');
  const { statementBlob, statementFileName } = await import('../pdf/generate');
  const blob = await statementBlob(data);
  const pdfBase64 = await blobToBase64(blob);
  const res = await fetch(`${functionsBaseUrl}/sendReport`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
    body: JSON.stringify({
      to,
      message,
      reportNo: data.reportNo,
      fromName: data.profile.fullName,
      fileName: statementFileName(data),
      pdfBase64,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Failed to send email.');
  }
}

// Creates (or reuses) a public share link for a report.
export async function createShareLink(
  uid: string,
  reportId: string,
  existingToken: string | null,
): Promise<string> {
  const token = existingToken ?? crypto.randomUUID().replace(/-/g, '');
  await setDoc(doc(db, 'shares', token), {
    uid,
    reportId,
    createdAt: Date.now(),
  });
  if (!existingToken) {
    await updateReport(uid, reportId, { shareToken: token });
  }
  return `${window.location.origin}/share/${token}`;
}

// Fetches a shared statement (public, no auth) via the shareReport function.
export async function fetchSharedStatement(token: string): Promise<StatementData> {
  if (!functionsBaseUrl) throw new Error('Sharing is not configured.');
  const res = await fetch(`${functionsBaseUrl}/shareReport?token=${encodeURIComponent(token)}`);
  if (!res.ok) throw new Error('This shared report is unavailable.');
  return (await res.json()) as StatementData;
}
