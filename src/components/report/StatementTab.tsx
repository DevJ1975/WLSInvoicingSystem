import { FormEvent, useState } from 'react';
import { useUid } from '../../hooks/useUid';
import { useMileage, useReceipts, useReportMutations } from '../../hooks/data';
import { buildStatement } from '../../lib/statement';
import {
  createShareLink,
  emailEnabled,
  emailStatement,
  shareEnabled,
} from '../../lib/api';
import { formatCurrency, formatDate, formatNumber, todayIso } from '../../lib/format';
import type { ExpenseReport, Profile, ReportStatus } from '../../lib/types';
import { Field, Spinner } from '../ui';
import { Modal } from '../Modal';
import { Logo } from '../Logo';

export function StatementTab({ report, profile }: { report: ExpenseReport; profile: Profile }) {
  const uid = useUid();
  const receiptsQuery = useReceipts(report.id);
  const mileageQuery = useMileage(report.id);
  const { update } = useReportMutations();

  const [editing, setEditing] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [busy, setBusy] = useState<string>('');

  const data = buildStatement(
    report,
    profile,
    receiptsQuery.data ?? [],
    mileageQuery.data ?? [],
  );

  async function handleDownload() {
    setBusy('pdf');
    try {
      const { downloadStatement } = await import('../../pdf/generate');
      await downloadStatement(data);
    } finally {
      setBusy('');
    }
  }

  async function handleShareFile() {
    setBusy('sharefile');
    try {
      const { shareStatementFile } = await import('../../pdf/generate');
      await shareStatementFile(data);
    } finally {
      setBusy('');
    }
  }

  const profileIncomplete = !profile.fullName;

  return (
    <div className="space-y-4">
      {profileIncomplete && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Add your name and contact details in{' '}
          <a href="/settings" className="font-semibold underline">
            Settings
          </a>{' '}
          so they appear on the statement.
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button className="btn-primary" onClick={handleDownload} disabled={busy === 'pdf'}>
          {busy === 'pdf' ? <Spinner className="h-4 w-4 text-white" /> : '⬇'} Download PDF
        </button>
        <button className="btn-secondary" onClick={handleShareFile} disabled={busy === 'sharefile'}>
          {busy === 'sharefile' ? <Spinner className="h-4 w-4" /> : '📤'} Share PDF
        </button>
        {emailEnabled && (
          <button className="btn-secondary" onClick={() => setEmailOpen(true)}>
            ✉ Email
          </button>
        )}
        {shareEnabled && (
          <button className="btn-secondary" onClick={() => setShareOpen(true)}>
            🔗 Share link
          </button>
        )}
        <button className="btn-secondary" onClick={() => setEditing(true)}>
          ✎ Edit details
        </button>
        <select
          className="input ml-auto w-auto"
          value={report.status}
          onChange={(e) => update.mutate({ id: report.id, data: { status: e.target.value as ReportStatus } })}
        >
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="paid">Paid</option>
        </select>
      </div>

      <StatementPreview report={report} profile={profile} />

      <EditDetailsModal
        open={editing}
        onClose={() => setEditing(false)}
        report={report}
        saving={update.isPending}
        onSave={async (patch) => {
          await update.mutateAsync({ id: report.id, data: patch });
          setEditing(false);
        }}
      />

      <EmailModal
        open={emailOpen}
        onClose={() => setEmailOpen(false)}
        defaultTo=""
        reportNo={report.reportNo}
        onSend={async (to, message) => {
          await emailStatement(data, to, message);
          await update.mutateAsync({ id: report.id, data: { status: 'sent' } });
          setEmailOpen(false);
        }}
      />

      <ShareLinkModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        getLink={() => createShareLink(uid, report.id, report.shareToken)}
      />
    </div>
  );
}

function StatementPreview({ report, profile }: { report: ExpenseReport; profile: Profile }) {
  return (
    <div className="card overflow-hidden p-0">
      <div className="border-b-4 border-wls-red p-6">
        <div className="flex items-start justify-between">
          <div>
            <Logo className="h-10" />
            {profile.tagline && <p className="mt-1 text-xs italic text-slate-400">{profile.tagline}</p>}
          </div>
          <h2 className="text-2xl font-bold text-wls-ink">Expense Statement</h2>
        </div>
      </div>
      <div className="p-6">
        <div className="flex flex-wrap justify-between gap-6">
          <div className="text-sm">
            {profile.fullName && <p className="text-base font-bold text-wls-ink">{profile.fullName}</p>}
            {profile.addressLine && <p className="text-slate-500">{profile.addressLine}</p>}
            {profile.stationId && <p className="text-slate-500">{profile.stationId}</p>}
            {profile.phone && <p className="text-slate-500">{profile.phone}</p>}
            {profile.email && <p className="text-slate-500">{profile.email}</p>}
          </div>
          <div className="text-sm">
            <MetaRow label="EXP. REPORT NO." value={String(report.reportNo)} />
            <MetaRow label="DATE" value={formatDate(report.reportDate)} />
            <MetaRow
              label="PERIOD"
              value={
                report.periodStart && report.periodEnd
                  ? `${formatDate(report.periodStart)} – ${formatDate(report.periodEnd)}`
                  : ''
              }
            />
          </div>
        </div>

        {report.laborDescription && (
          <p className="mt-5 text-sm text-slate-700">{report.laborDescription}</p>
        )}

        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="bg-wls-ink text-left text-xs uppercase text-white">
              <th className="px-3 py-2">Description</th>
              <th className="px-3 py-2 text-right"># Days</th>
              <th className="px-3 py-2 text-right">Rate</th>
              <th className="px-3 py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            <tr>
              <td className="px-3 py-2">
                {report.clientName
                  ? `Onsite labor — ${report.clientName}${report.clientSite ? `, ${report.clientSite}` : ''}`
                  : 'Onsite labor'}
              </td>
              <td className="px-3 py-2 text-right">{formatNumber(report.laborDays, 0)}</td>
              <td className="px-3 py-2 text-right">{formatCurrency(report.dayRate)}</td>
              <td className="px-3 py-2 text-right">{formatCurrency(report.laborTotal)}</td>
            </tr>
            <tr>
              <td className="px-3 py-2">Expenses (receipts)</td>
              <td />
              <td />
              <td className="px-3 py-2 text-right">{formatCurrency(report.receiptsTotal)}</td>
            </tr>
            <tr>
              <td className="px-3 py-2">Mileage reimbursement</td>
              <td />
              <td />
              <td className="px-3 py-2 text-right">{formatCurrency(report.mileageTotal)}</td>
            </tr>
          </tbody>
        </table>

        <div className="mt-4 flex justify-end border-t-2 border-wls-ink pt-3">
          <span className="mr-6 text-lg font-bold text-wls-ink">TOTAL DUE</span>
          <span className="text-xl font-bold text-wls-red">{formatCurrency(report.totalDue)}</span>
        </div>

        {report.notes && (
          <div className="mt-5 text-sm">
            <p className="font-semibold text-wls-ink">Notes</p>
            <p className="text-slate-500">{report.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-8">
      <span className="text-xs font-semibold uppercase text-slate-400">{label}</span>
      <span className="font-semibold text-wls-ink">{value}</span>
    </div>
  );
}

function EditDetailsModal({
  open,
  onClose,
  report,
  saving,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  report: ExpenseReport;
  saving: boolean;
  onSave: (patch: Partial<ExpenseReport>) => void;
}) {
  const [form, setForm] = useState({
    clientName: report.clientName,
    clientSite: report.clientSite,
    periodStart: report.periodStart ?? '',
    periodEnd: report.periodEnd ?? '',
    reportDate: report.reportDate ?? todayIso(),
    laborDays: String(report.laborDays),
    dayRate: String(report.dayRate),
    laborDescription: report.laborDescription,
    notes: report.notes,
  });

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    onSave({
      clientName: form.clientName,
      clientSite: form.clientSite,
      periodStart: form.periodStart || null,
      periodEnd: form.periodEnd || null,
      reportDate: form.reportDate || null,
      laborDays: Number(form.laborDays) || 0,
      dayRate: Number(form.dayRate) || 0,
      laborDescription: form.laborDescription,
      notes: form.notes,
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title="Edit statement details"
      footer={
        <>
          <button className="btn-secondary" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" form="details-form" disabled={saving}>
            {saving && <Spinner className="h-4 w-4 text-white" />}
            Save
          </button>
        </>
      }
    >
      <form id="details-form" onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Client name">
            <input className="input" value={form.clientName} onChange={(e) => set('clientName', e.target.value)} />
          </Field>
          <Field label="Site / location">
            <input className="input" value={form.clientSite} onChange={(e) => set('clientSite', e.target.value)} />
          </Field>
          <Field label="Period start">
            <input type="date" className="input" value={form.periodStart} onChange={(e) => set('periodStart', e.target.value)} />
          </Field>
          <Field label="Period end">
            <input type="date" className="input" value={form.periodEnd} onChange={(e) => set('periodEnd', e.target.value)} />
          </Field>
          <Field label="Report date">
            <input type="date" className="input" value={form.reportDate} onChange={(e) => set('reportDate', e.target.value)} />
          </Field>
          <Field label="Days worked">
            <input type="number" step="0.5" className="input" value={form.laborDays} onChange={(e) => set('laborDays', e.target.value)} />
          </Field>
          <Field label="Day rate ($)">
            <input type="number" step="0.01" className="input" value={form.dayRate} onChange={(e) => set('dayRate', e.target.value)} />
          </Field>
        </div>
        <Field label="Labor description">
          <input className="input" value={form.laborDescription} onChange={(e) => set('laborDescription', e.target.value)} />
        </Field>
        <Field label="Notes">
          <textarea className="input min-h-[60px]" value={form.notes} onChange={(e) => set('notes', e.target.value)} />
        </Field>
      </form>
    </Modal>
  );
}

function EmailModal({
  open,
  onClose,
  defaultTo,
  reportNo,
  onSend,
}: {
  open: boolean;
  onClose: () => void;
  defaultTo: string;
  reportNo: number;
  onSend: (to: string, message: string) => Promise<void>;
}) {
  const [to, setTo] = useState(defaultTo);
  const [message, setMessage] = useState(
    `Please find attached expense statement #${reportNo}.`,
  );
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSending(true);
    try {
      await onSend(to, message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send.');
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Email statement"
      footer={
        <>
          <button className="btn-secondary" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" form="email-form" disabled={sending || !to}>
            {sending && <Spinner className="h-4 w-4 text-white" />}
            Send
          </button>
        </>
      }
    >
      <form id="email-form" onSubmit={submit} className="space-y-4">
        <Field label="Recipient email">
          <input type="email" required className="input" value={to} onChange={(e) => setTo(e.target.value)} />
        </Field>
        <Field label="Message">
          <textarea className="input min-h-[100px]" value={message} onChange={(e) => setMessage(e.target.value)} />
        </Field>
        <p className="text-xs text-slate-400">The branded PDF statement is attached automatically.</p>
        {error && <p className="text-sm text-wls-red">{error}</p>}
      </form>
    </Modal>
  );
}

function ShareLinkModal({
  open,
  onClose,
  getLink,
}: {
  open: boolean;
  onClose: () => void;
  getLink: () => Promise<string>;
}) {
  const [link, setLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function generate() {
    setLoading(true);
    try {
      setLink(await getLink());
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Modal open={open} onClose={onClose} title="Shareable link">
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          Anyone with this link can view a read-only copy of the statement — no sign-in required.
        </p>
        {link ? (
          <div className="flex gap-2">
            <input readOnly className="input" value={link} onFocus={(e) => e.target.select()} />
            <button className="btn-primary whitespace-nowrap" onClick={copy}>
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        ) : (
          <button className="btn-primary" onClick={generate} disabled={loading}>
            {loading && <Spinner className="h-4 w-4 text-white" />}
            Generate link
          </button>
        )}
      </div>
    </Modal>
  );
}
