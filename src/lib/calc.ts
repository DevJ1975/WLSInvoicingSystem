import type {
  CategoryBreakdown,
  ExpenseCategory,
  GpsPoint,
  MileageTrip,
  Receipt,
  ReportTotals,
  WorkLogEntry,
} from './types';
import { EXPENSE_CATEGORIES } from './types';

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function laborTotal(days: number, rate: number): number {
  return round2((Number(days) || 0) * (Number(rate) || 0));
}

export function receiptsTotal(receipts: Receipt[]): number {
  return round2(receipts.reduce((sum, r) => sum + (Number(r.amount) || 0), 0));
}

export function mileageTotal(trips: MileageTrip[]): number {
  return round2(trips.reduce((sum, t) => sum + (Number(t.total) || 0), 0));
}

export function mileageMiles(trips: MileageTrip[]): number {
  return round2(trips.reduce((sum, t) => sum + (Number(t.miles) || 0), 0));
}

export function computeTotals(
  days: number,
  rate: number,
  receipts: Receipt[],
  trips: MileageTrip[],
): ReportTotals {
  const labor = laborTotal(days, rate);
  const rcpt = receiptsTotal(receipts);
  const mile = mileageTotal(trips);
  return {
    laborTotal: labor,
    receiptsTotal: rcpt,
    mileageTotal: mile,
    totalDue: round2(labor + rcpt + mile),
  };
}

export function receiptsByCategory(receipts: Receipt[]): CategoryBreakdown[] {
  const map = new Map<ExpenseCategory, number>();
  for (const cat of EXPENSE_CATEGORIES) map.set(cat, 0);
  for (const r of receipts) {
    map.set(r.category, round2((map.get(r.category) || 0) + (Number(r.amount) || 0)));
  }
  return EXPENSE_CATEGORIES.map((category) => ({ category, amount: map.get(category) || 0 }));
}

export function totalHours(entries: WorkLogEntry[]): number {
  return round2(entries.reduce((sum, e) => sum + (Number(e.hours) || 0), 0));
}

// Haversine great-circle distance between two coordinates, in miles.
export function haversineMiles(a: GpsPoint, b: GpsPoint): number {
  const R = 3958.7613; // Earth radius in miles
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Sum of haversine segments along a recorded GPS path.
export function pathMiles(path: GpsPoint[]): number {
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    total += haversineMiles(path[i - 1], path[i]);
  }
  return round2(total);
}

export { round2 };
