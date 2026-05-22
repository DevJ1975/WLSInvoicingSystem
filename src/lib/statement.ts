import { mileageMiles } from './calc';
import { formatDateRange } from './format';
import type { ExpenseReport, MileageTrip, Profile, Receipt } from './types';

// Normalized data used by the on-screen statement, the PDF, and the share view.
export interface StatementData {
  profile: Profile;
  reportNo: number;
  reportDate: string | null;
  periodLabel: string;
  clientName: string;
  clientSite: string;
  laborDescription: string;
  laborDays: number;
  dayRate: number;
  laborTotal: number;
  receiptsTotal: number;
  mileageTotal: number;
  mileageMiles: number;
  mileageRate: number;
  totalDue: number;
  notes: string;
  receipts: ReceiptLine[];
  trips: TripLine[];
}

export interface ReceiptLine {
  date: string | null;
  vendor: string;
  category: string;
  amount: number;
  notes: string;
}

export interface TripLine {
  date: string | null;
  from: string;
  to: string;
  miles: number;
  total: number;
}

export function buildStatement(
  report: ExpenseReport,
  profile: Profile,
  receipts: Receipt[],
  trips: MileageTrip[],
): StatementData {
  const miles = mileageMiles(trips);
  const mileageRate = trips.find((t) => t.ratePerMile)?.ratePerMile ?? 0;
  return {
    profile,
    reportNo: report.reportNo,
    reportDate: report.reportDate,
    periodLabel: formatDateRange(report.periodStart, report.periodEnd),
    clientName: report.clientName,
    clientSite: report.clientSite,
    laborDescription: report.laborDescription,
    laborDays: report.laborDays,
    dayRate: report.dayRate,
    laborTotal: report.laborTotal,
    receiptsTotal: report.receiptsTotal,
    mileageTotal: report.mileageTotal,
    mileageMiles: miles,
    mileageRate,
    totalDue: report.totalDue,
    notes: report.notes,
    receipts: receipts.map((r) => ({
      date: r.date,
      vendor: r.vendor,
      category: r.category,
      amount: r.amount,
      notes: r.notes,
    })),
    trips: trips.map((t) => ({
      date: t.date,
      from: t.fromLabel,
      to: t.toLabel,
      miles: t.miles,
      total: t.total,
    })),
  };
}
