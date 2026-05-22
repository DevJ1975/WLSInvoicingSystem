import { formatCurrency, formatDate, formatNumber } from '../lib/format';
import type { StatementData } from '../lib/statement';
import { WLS_LOGO_DATA_URI } from './logo';

function esc(s: string | null | undefined): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Builds a print-ready HTML document for the branded Expense Statement,
// matching the source spreadsheet layout. Fed to expo-print.
export function buildStatementHtml(data: StatementData): string {
  const { profile } = data;
  const laborDesc = data.clientName
    ? `Onsite labor — ${esc(data.clientName)}${data.clientSite ? `, ${esc(data.clientSite)}` : ''}`
    : 'Onsite labor';

  const receiptsRows = data.receipts
    .map(
      (r) => `<tr>
        <td>${formatDate(r.date)} ${esc(r.vendor)}</td>
        <td>${esc(r.category)}</td>
        <td class="num">${formatCurrency(r.amount)}</td>
      </tr>`,
    )
    .join('');

  const tripRows = data.trips
    .map(
      (t) => `<tr>
        <td>${formatDate(t.date)}</td>
        <td>${esc(t.from)} → ${esc(t.to)}</td>
        <td class="num">${formatNumber(t.miles, 1)}</td>
        <td class="num">${formatCurrency(t.total)}</td>
      </tr>`,
    )
    .join('');

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #2E2224; margin: 0; padding: 32px; font-size: 13px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 4px solid #E2231A; padding-bottom: 16px; }
  .logo { width: 200px; }
  .tagline { color: #6B7280; font-style: italic; font-size: 11px; margin-top: 4px; }
  .title { font-size: 28px; font-weight: 800; }
  .meta { display: flex; justify-content: space-between; gap: 24px; margin-top: 20px; }
  .name { font-size: 16px; font-weight: 700; }
  .muted { color: #6B7280; }
  .metarow { display: flex; justify-content: space-between; gap: 32px; }
  .metalabel { color: #6B7280; font-weight: 700; font-size: 11px; text-transform: uppercase; }
  .job { margin-top: 20px; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  th { background: #2E2224; color: #fff; text-align: left; font-size: 11px; text-transform: uppercase; padding: 8px; }
  td { padding: 8px; border-top: 1px solid #eee; }
  .num { text-align: right; }
  .total { display: flex; justify-content: flex-end; align-items: baseline; gap: 24px; margin-top: 14px; padding-top: 10px; border-top: 2px solid #2E2224; }
  .total .label { font-size: 16px; font-weight: 700; }
  .total .value { font-size: 22px; font-weight: 800; color: #E2231A; }
  h3 { margin-top: 28px; font-size: 14px; }
  .notes { color: #6B7280; margin-top: 6px; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <img class="logo" src="${WLS_LOGO_DATA_URI}" />
      ${profile.tagline ? `<div class="tagline">${esc(profile.tagline)}</div>` : ''}
    </div>
    <div class="title">Expense Statement</div>
  </div>

  <div class="meta">
    <div>
      ${profile.fullName ? `<div class="name">${esc(profile.fullName)}</div>` : ''}
      ${profile.addressLine ? `<div class="muted">${esc(profile.addressLine)}</div>` : ''}
      ${profile.stationId ? `<div class="muted">${esc(profile.stationId)}</div>` : ''}
      ${profile.phone ? `<div class="muted">${esc(profile.phone)}</div>` : ''}
      ${profile.email ? `<div class="muted">${esc(profile.email)}</div>` : ''}
    </div>
    <div>
      <div class="metarow"><span class="metalabel">Exp. Report No.</span><span><b>${data.reportNo}</b></span></div>
      <div class="metarow"><span class="metalabel">Date</span><span><b>${formatDate(data.reportDate)}</b></span></div>
      <div class="metarow"><span class="metalabel">Period</span><span><b>${esc(data.periodLabel)}</b></span></div>
    </div>
  </div>

  ${data.laborDescription ? `<div class="job">${esc(data.laborDescription)}</div>` : ''}

  <table>
    <thead>
      <tr><th>Description</th><th class="num"># Days</th><th class="num">Rate</th><th class="num">Total</th></tr>
    </thead>
    <tbody>
      <tr>
        <td>${laborDesc}</td>
        <td class="num">${formatNumber(data.laborDays, 0)}</td>
        <td class="num">${formatCurrency(data.dayRate)}</td>
        <td class="num">${formatCurrency(data.laborTotal)}</td>
      </tr>
      <tr><td>Expenses (receipts)</td><td></td><td></td><td class="num">${formatCurrency(data.receiptsTotal)}</td></tr>
      <tr>
        <td>Mileage (${formatNumber(data.mileageMiles, 1)} mi${data.mileageRate ? ` × $${data.mileageRate}/mi` : ''})</td>
        <td></td><td></td><td class="num">${formatCurrency(data.mileageTotal)}</td>
      </tr>
    </tbody>
  </table>

  <div class="total"><span class="label">TOTAL DUE</span><span class="value">${formatCurrency(data.totalDue)}</span></div>

  ${data.receipts.length ? `<h3>Itemized Expenses</h3>
  <table><thead><tr><th>Date / Vendor</th><th>Category</th><th class="num">Amount</th></tr></thead>
  <tbody>${receiptsRows}</tbody></table>` : ''}

  ${data.trips.length ? `<h3>Mileage Detail</h3>
  <table><thead><tr><th>Date</th><th>Route</th><th class="num">Miles</th><th class="num">Total</th></tr></thead>
  <tbody>${tripRows}</tbody></table>` : ''}

  ${data.notes ? `<h3>Notes</h3><div class="notes">${esc(data.notes)}</div>` : ''}
  ${profile.remitTo ? `<div class="notes" style="margin-top:24px">${esc(profile.remitTo)}</div>` : ''}
</body>
</html>`;
}
