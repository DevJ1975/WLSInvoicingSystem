// Formatting helpers implemented without Intl so they behave identically on
// web and on the Hermes engine (where Intl support can vary).

function groupThousands(intPart: string): string {
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function formatNumber(value: number | null | undefined, digits = 1): string {
  const n = Number(value ?? 0);
  const neg = n < 0;
  const fixed = Math.abs(n).toFixed(digits);
  const [intPart, decPart] = fixed.split('.');
  const grouped = groupThousands(intPart);
  const out = decPart ? `${grouped}.${decPart}` : grouped;
  return neg ? `-${out}` : out;
}

export function formatCurrency(value: number | null | undefined): string {
  const n = Number(value ?? 0);
  const neg = n < 0;
  return `${neg ? '-' : ''}$${formatNumber(Math.abs(n), 2)}`;
}

// Display an ISO date (yyyy-mm-dd) as M/D/YYYY without timezone drift.
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return `${m}/${d}/${y}`;
}

export function formatDateRange(start: string | null, end: string | null): string {
  if (start && end) return `${formatDate(start)} – ${formatDate(end)}`;
  return formatDate(start || end);
}

export function todayIso(): string {
  const now = new Date();
  const tzOffset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - tzOffset).toISOString().slice(0, 10);
}
