import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { computeTotals } from './calc';
import {
  DEFAULT_MILEAGE_RATE,
  type AppSettings,
  type Client,
  type ExpenseReport,
  type MileageTrip,
  type Profile,
  type Receipt,
  type ReportStatus,
  type WorkLogEntry,
} from './types';

// ---- Path helpers -------------------------------------------------------

const userDoc = (uid: string) => doc(db, 'users', uid);
const profileRef = (uid: string) => doc(db, 'users', uid, 'meta', 'profile');
const settingsRef = (uid: string) => doc(db, 'users', uid, 'meta', 'settings');
const clientsCol = (uid: string) => collection(db, 'users', uid, 'clients');
const reportsCol = (uid: string) => collection(db, 'users', uid, 'reports');
const reportRef = (uid: string, reportId: string) => doc(db, 'users', uid, 'reports', reportId);
const workLogCol = (uid: string, reportId: string) =>
  collection(db, 'users', uid, 'reports', reportId, 'workLog');
const receiptsCol = (uid: string, reportId: string) =>
  collection(db, 'users', uid, 'reports', reportId, 'receipts');
const mileageCol = (uid: string, reportId: string) =>
  collection(db, 'users', uid, 'reports', reportId, 'mileage');

function withId<T>(snap: { id: string; data: () => unknown }): T {
  return { id: snap.id, ...(snap.data() as object) } as T;
}

// ---- Profile ------------------------------------------------------------

export const EMPTY_PROFILE: Profile = {
  fullName: '',
  addressLine: '',
  stationId: '',
  phone: '',
  email: '',
  tagline: 'Making the world a safer place',
  remitTo: '',
};

export async function getProfile(uid: string): Promise<Profile> {
  const snap = await getDoc(profileRef(uid));
  if (!snap.exists()) return EMPTY_PROFILE;
  return { ...EMPTY_PROFILE, ...(snap.data() as Profile) };
}

export async function saveProfile(uid: string, profile: Profile): Promise<void> {
  await setDoc(profileRef(uid), profile, { merge: true });
}

// ---- Settings -----------------------------------------------------------

export async function getSettings(uid: string): Promise<AppSettings> {
  const snap = await getDoc(settingsRef(uid));
  const year = String(new Date().getFullYear());
  if (!snap.exists()) {
    return { mileageRates: { [year]: DEFAULT_MILEAGE_RATE } };
  }
  const data = snap.data() as AppSettings;
  return { mileageRates: { [year]: DEFAULT_MILEAGE_RATE, ...data.mileageRates } };
}

export async function saveSettings(uid: string, settings: AppSettings): Promise<void> {
  await setDoc(settingsRef(uid), settings, { merge: true });
}

export function rateForYear(settings: AppSettings, isoDate: string | null): number {
  const year = isoDate ? isoDate.slice(0, 4) : String(new Date().getFullYear());
  return settings.mileageRates[year] ?? DEFAULT_MILEAGE_RATE;
}

// ---- Clients ------------------------------------------------------------

export async function listClients(uid: string): Promise<Client[]> {
  const snap = await getDocs(query(clientsCol(uid), orderBy('name')));
  return snap.docs.map((d) => withId<Client>(d));
}

export async function createClient(
  uid: string,
  data: Omit<Client, 'id' | 'createdAt'>,
): Promise<string> {
  const ref = await addDoc(clientsCol(uid), { ...data, createdAt: Date.now() });
  return ref.id;
}

export async function updateClient(
  uid: string,
  id: string,
  data: Partial<Client>,
): Promise<void> {
  await updateDoc(doc(clientsCol(uid), id), data);
}

export async function deleteClient(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(clientsCol(uid), id));
}

// ---- Reports ------------------------------------------------------------

export async function listReports(uid: string): Promise<ExpenseReport[]> {
  const snap = await getDocs(query(reportsCol(uid), orderBy('reportNo', 'desc')));
  return snap.docs.map((d) => withId<ExpenseReport>(d));
}

export async function getReport(uid: string, reportId: string): Promise<ExpenseReport | null> {
  const snap = await getDoc(reportRef(uid, reportId));
  return snap.exists() ? withId<ExpenseReport>(snap) : null;
}

async function nextReportNo(uid: string): Promise<number> {
  const snap = await getDocs(query(reportsCol(uid), orderBy('reportNo', 'desc'), limit(1)));
  if (snap.empty) return 1;
  const top = snap.docs[0].data() as ExpenseReport;
  return (top.reportNo || 0) + 1;
}

export async function createReport(
  uid: string,
  data: Partial<ExpenseReport>,
): Promise<string> {
  // Ensure the user root doc exists so security rules + listing behave.
  await setDoc(userDoc(uid), { updatedAt: Date.now() }, { merge: true });
  const reportNo = data.reportNo ?? (await nextReportNo(uid));
  const now = Date.now();
  const report: Omit<ExpenseReport, 'id'> = {
    reportNo,
    clientId: data.clientId ?? null,
    clientName: data.clientName ?? '',
    clientSite: data.clientSite ?? '',
    periodStart: data.periodStart ?? null,
    periodEnd: data.periodEnd ?? null,
    reportDate: data.reportDate ?? null,
    laborDays: data.laborDays ?? 0,
    dayRate: data.dayRate ?? 0,
    laborDescription: data.laborDescription ?? '',
    notes: data.notes ?? '',
    status: data.status ?? 'draft',
    shareToken: data.shareToken ?? null,
    laborTotal: 0,
    receiptsTotal: 0,
    mileageTotal: 0,
    totalDue: 0,
    createdAt: now,
    updatedAt: now,
  };
  const ref = await addDoc(reportsCol(uid), report);
  await recomputeReportTotals(uid, ref.id);
  return ref.id;
}

export async function updateReport(
  uid: string,
  reportId: string,
  data: Partial<ExpenseReport>,
): Promise<void> {
  await updateDoc(reportRef(uid, reportId), { ...data, updatedAt: Date.now() });
}

export async function setReportStatus(
  uid: string,
  reportId: string,
  status: ReportStatus,
): Promise<void> {
  await updateReport(uid, reportId, { status });
}

export async function deleteReport(uid: string, reportId: string): Promise<void> {
  // Delete known subcollection docs first, then the report.
  for (const col of [workLogCol(uid, reportId), receiptsCol(uid, reportId), mileageCol(uid, reportId)]) {
    const snap = await getDocs(col);
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
  }
  await deleteDoc(reportRef(uid, reportId));
}

// Recompute denormalized totals on the report doc from its subcollections.
export async function recomputeReportTotals(uid: string, reportId: string): Promise<void> {
  const report = await getReport(uid, reportId);
  if (!report) return;
  const [receipts, trips] = await Promise.all([
    listReceipts(uid, reportId),
    listMileage(uid, reportId),
  ]);
  const totals = computeTotals(report.laborDays, report.dayRate, receipts, trips);
  await updateDoc(reportRef(uid, reportId), { ...totals, updatedAt: Date.now() });
}

// ---- Work Log -----------------------------------------------------------

export async function listWorkLog(uid: string, reportId: string): Promise<WorkLogEntry[]> {
  const snap = await getDocs(query(workLogCol(uid, reportId), orderBy('createdAt')));
  return snap.docs.map((d) => withId<WorkLogEntry>(d));
}

export async function createWorkLog(
  uid: string,
  reportId: string,
  data: Omit<WorkLogEntry, 'id' | 'createdAt'>,
): Promise<string> {
  const ref = await addDoc(workLogCol(uid, reportId), { ...data, createdAt: Date.now() });
  return ref.id;
}

export async function updateWorkLog(
  uid: string,
  reportId: string,
  id: string,
  data: Partial<WorkLogEntry>,
): Promise<void> {
  await updateDoc(doc(workLogCol(uid, reportId), id), data);
}

export async function deleteWorkLog(uid: string, reportId: string, id: string): Promise<void> {
  await deleteDoc(doc(workLogCol(uid, reportId), id));
}

// ---- Receipts -----------------------------------------------------------

export async function listReceipts(uid: string, reportId: string): Promise<Receipt[]> {
  const snap = await getDocs(query(receiptsCol(uid, reportId), orderBy('createdAt')));
  return snap.docs.map((d) => withId<Receipt>(d));
}

export async function createReceipt(
  uid: string,
  reportId: string,
  data: Omit<Receipt, 'id' | 'createdAt'>,
): Promise<string> {
  const ref = await addDoc(receiptsCol(uid, reportId), { ...data, createdAt: Date.now() });
  await recomputeReportTotals(uid, reportId);
  return ref.id;
}

export async function updateReceipt(
  uid: string,
  reportId: string,
  id: string,
  data: Partial<Receipt>,
): Promise<void> {
  await updateDoc(doc(receiptsCol(uid, reportId), id), data);
  await recomputeReportTotals(uid, reportId);
}

export async function deleteReceipt(uid: string, reportId: string, id: string): Promise<void> {
  await deleteDoc(doc(receiptsCol(uid, reportId), id));
  await recomputeReportTotals(uid, reportId);
}

// ---- Mileage ------------------------------------------------------------

export async function listMileage(uid: string, reportId: string): Promise<MileageTrip[]> {
  const snap = await getDocs(query(mileageCol(uid, reportId), orderBy('createdAt')));
  return snap.docs.map((d) => withId<MileageTrip>(d));
}

export async function createMileage(
  uid: string,
  reportId: string,
  data: Omit<MileageTrip, 'id' | 'createdAt'>,
): Promise<string> {
  const ref = await addDoc(mileageCol(uid, reportId), { ...data, createdAt: Date.now() });
  await recomputeReportTotals(uid, reportId);
  return ref.id;
}

export async function updateMileage(
  uid: string,
  reportId: string,
  id: string,
  data: Partial<MileageTrip>,
): Promise<void> {
  await updateDoc(doc(mileageCol(uid, reportId), id), data);
  await recomputeReportTotals(uid, reportId);
}

export async function deleteMileage(uid: string, reportId: string, id: string): Promise<void> {
  await deleteDoc(doc(mileageCol(uid, reportId), id));
  await recomputeReportTotals(uid, reportId);
}
