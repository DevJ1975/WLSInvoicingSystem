// Domain model for the WLS Invoicing System.
// Mirrors the source spreadsheet tabs: Expense Statement, Expense Report,
// Mileage, Work Log, Receipts, and the Reset/Dashboard.

export type ReportStatus = 'draft' | 'sent' | 'paid';

export const EXPENSE_CATEGORIES = [
  'Hotel',
  'Transport',
  'Fuel',
  'Meals',
  'Phone',
  'Entertain.',
  'Misc.',
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const TASK_CATEGORIES = [
  'Safety Walk / Hazard Hunt',
  'Training / Coaching',
  'Meeting / Review',
  'Audit / Inspection',
  'Documentation / Reporting',
  'Research & Development',
  'Onsite Support',
  'Travel',
] as const;
export type TaskCategory = (typeof TASK_CATEGORIES)[number];

export interface Profile {
  fullName: string;
  addressLine: string;
  stationId: string;
  phone: string;
  email: string;
  tagline: string;
  // remitTo: free-form text shown on the statement (who/where to send payment)
  remitTo?: string;
}

export interface Client {
  id: string;
  name: string;
  site: string;
  defaultDayRate: number;
  createdAt: number;
}

export interface ExpenseReport {
  id: string;
  reportNo: number;
  clientId: string | null;
  clientName: string;
  clientSite: string;
  periodStart: string | null; // ISO date (yyyy-mm-dd)
  periodEnd: string | null;
  reportDate: string | null;
  laborDays: number;
  dayRate: number;
  laborDescription: string;
  notes: string;
  status: ReportStatus;
  shareToken: string | null;
  // Denormalized totals, recomputed on every edit (Firestore has no SQL views).
  laborTotal: number;
  receiptsTotal: number;
  mileageTotal: number;
  totalDue: number;
  createdAt: number;
  updatedAt: number;
}

export interface WorkLogEntry {
  id: string;
  date: string | null;
  clientSite: string;
  location: string;
  taskCategory: TaskCategory | '';
  hours: number;
  workSummary: string;
  keyFindings: string;
  status: string;
  createdAt: number;
}

export interface Receipt {
  id: string;
  date: string | null;
  vendor: string;
  category: ExpenseCategory;
  amount: number;
  paymentMethod: string;
  notes: string;
  imagePath: string | null; // Cloud Storage path
  imageUrl?: string | null; // resolved download URL (client-side only)
  createdAt: number;
}

export type MileageSource = 'manual' | 'live';

export interface GpsPoint {
  lat: number;
  lng: number;
  t: number; // epoch ms
}

export interface MileageTrip {
  id: string;
  date: string | null;
  fromLabel: string;
  toLabel: string;
  purpose: string;
  miles: number;
  ratePerMile: number;
  total: number;
  source: MileageSource;
  fromLat?: number | null;
  fromLng?: number | null;
  toLat?: number | null;
  toLng?: number | null;
  path?: GpsPoint[] | null; // recorded GPS path for live trips
  mapImagePath?: string | null;
  createdAt: number;
}

export interface AppSettings {
  // IRS standard mileage rate keyed by year, e.g. { "2026": 0.725 }
  mileageRates: Record<string, number>;
}

export const DEFAULT_MILEAGE_RATE = 0.725; // 2026 IRS rate

export interface ReportTotals {
  laborTotal: number;
  receiptsTotal: number;
  mileageTotal: number;
  totalDue: number;
}

export interface CategoryBreakdown {
  category: ExpenseCategory;
  amount: number;
}
