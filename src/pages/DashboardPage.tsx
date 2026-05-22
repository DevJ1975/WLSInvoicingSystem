import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClients, useReports, useReportMutations } from '../hooks/data';
import { formatCurrency, formatDateRange, todayIso } from '../lib/format';
import { EmptyState, Spinner, StatusBadge } from '../components/ui';
import { Modal } from '../components/Modal';
import { Field } from '../components/ui';
import type { Client } from '../lib/types';

export function DashboardPage() {
  const navigate = useNavigate();
  const reportsQuery = useReports();
  const clientsQuery = useClients();
  const { create } = useReportMutations();
  const [open, setOpen] = useState(false);

  const reports = reportsQuery.data ?? [];
  const totalBilled = reports.reduce((s, r) => s + r.totalDue, 0);
  const drafts = reports.filter((r) => r.status === 'draft').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-wls-ink">Expense Reports</h1>
          <p className="text-sm text-slate-500">Track work, expenses, mileage, and invoices.</p>
        </div>
        <button className="btn-primary" onClick={() => setOpen(true)}>
          + New report
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Reports" value={String(reports.length)} />
        <StatCard label="Total billed" value={formatCurrency(totalBilled)} />
        <StatCard label="Drafts" value={String(drafts)} />
      </div>

      {reportsQuery.isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner className="h-7 w-7" />
        </div>
      ) : reports.length === 0 ? (
        <EmptyState
          title="No reports yet"
          description="Create your first expense report to start logging work, receipts, and mileage."
          action={
            <button className="btn-primary" onClick={() => setOpen(true)}>
              + New report
            </button>
          }
        />
      ) : (
        <div className="card divide-y divide-slate-100">
          {reports.map((r) => (
            <button
              key={r.id}
              onClick={() => navigate(`/reports/${r.id}`)}
              className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left hover:bg-slate-50"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-wls-ink">
                    Report #{r.reportNo}
                  </span>
                  <StatusBadge status={r.status} />
                </div>
                <p className="truncate text-sm text-slate-600">
                  {r.clientName || 'No client'}
                  {r.clientSite ? ` — ${r.clientSite}` : ''}
                </p>
                <p className="text-xs text-slate-400">
                  {formatDateRange(r.periodStart, r.periodEnd) || 'No period set'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-base font-bold text-wls-ink">{formatCurrency(r.totalDue)}</p>
                <p className="text-xs text-slate-400">Total due</p>
              </div>
            </button>
          ))}
        </div>
      )}

      <NewReportModal
        open={open}
        onClose={() => setOpen(false)}
        clients={clientsQuery.data ?? []}
        creating={create.isPending}
        onCreate={async (data) => {
          const id = await create.mutateAsync(data);
          setOpen(false);
          navigate(`/reports/${id}`);
        }}
      />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-bold text-wls-ink">{value}</p>
    </div>
  );
}

function NewReportModal({
  open,
  onClose,
  clients,
  creating,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  clients: Client[];
  creating: boolean;
  onCreate: (data: {
    clientId: string | null;
    clientName: string;
    clientSite: string;
    periodStart: string;
    periodEnd: string;
    reportDate: string;
    dayRate: number;
    laborDays: number;
    laborDescription: string;
  }) => void;
}) {
  const [clientId, setClientId] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientSite, setClientSite] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [reportDate, setReportDate] = useState(todayIso());
  const [dayRate, setDayRate] = useState('600');
  const [laborDays, setLaborDays] = useState('0');
  const [desc, setDesc] = useState('');

  function selectClient(id: string) {
    setClientId(id);
    const c = clients.find((x) => x.id === id);
    if (c) {
      setClientName(c.name);
      setClientSite(c.site);
      setDayRate(String(c.defaultDayRate || 0));
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    onCreate({
      clientId: clientId || null,
      clientName,
      clientSite,
      periodStart,
      periodEnd,
      reportDate,
      dayRate: Number(dayRate) || 0,
      laborDays: Number(laborDays) || 0,
      laborDescription: desc,
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New expense report"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose} type="button">
            Cancel
          </button>
          <button className="btn-primary" form="new-report-form" type="submit" disabled={creating}>
            {creating && <Spinner className="h-4 w-4 text-white" />}
            Create report
          </button>
        </>
      }
    >
      <form id="new-report-form" onSubmit={submit} className="space-y-4">
        {clients.length > 0 && (
          <Field label="Client">
            <select className="input" value={clientId} onChange={(e) => selectClient(e.target.value)}>
              <option value="">— New / one-off client —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Client name">
            <input
              className="input"
              required
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
            />
          </Field>
          <Field label="Site / location">
            <input
              className="input"
              value={clientSite}
              onChange={(e) => setClientSite(e.target.value)}
            />
          </Field>
          <Field label="Period start">
            <input
              type="date"
              className="input"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
            />
          </Field>
          <Field label="Period end">
            <input
              type="date"
              className="input"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
            />
          </Field>
          <Field label="Report date">
            <input
              type="date"
              className="input"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
            />
          </Field>
          <Field label="Day rate ($)">
            <input
              type="number"
              step="0.01"
              className="input"
              value={dayRate}
              onChange={(e) => setDayRate(e.target.value)}
            />
          </Field>
          <Field label="Days worked">
            <input
              type="number"
              step="0.5"
              className="input"
              value={laborDays}
              onChange={(e) => setLaborDays(e.target.value)}
            />
          </Field>
        </div>
        <Field label="Labor description">
          <input
            className="input"
            placeholder="Onsite labor — Snak King, City of Industry CA"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
        </Field>
      </form>
    </Modal>
  );
}
