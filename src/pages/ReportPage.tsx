import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useProfile, useReport } from '../hooks/data';
import { formatCurrency, formatDateRange } from '../lib/format';
import { FullPageSpinner, StatusBadge } from '../components/ui';
import { StatementTab } from '../components/report/StatementTab';
import { WorkLogTab } from '../components/report/WorkLogTab';
import { ReceiptsTab } from '../components/report/ReceiptsTab';
import { MileageTab } from '../components/report/MileageTab';

type Tab = 'statement' | 'worklog' | 'receipts' | 'mileage';

const tabs: { id: Tab; label: string }[] = [
  { id: 'statement', label: 'Statement' },
  { id: 'worklog', label: 'Work Log' },
  { id: 'receipts', label: 'Receipts' },
  { id: 'mileage', label: 'Mileage' },
];

export function ReportPage() {
  const { reportId = '' } = useParams();
  const reportQuery = useReport(reportId);
  const profileQuery = useProfile();
  const [tab, setTab] = useState<Tab>('statement');

  if (reportQuery.isLoading || profileQuery.isLoading) return <FullPageSpinner />;
  const report = reportQuery.data;
  if (!report) {
    return (
      <div className="card p-8 text-center">
        <p className="text-wls-ink">Report not found.</p>
        <Link to="/" className="btn-primary mt-4">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Link to="/" className="text-sm text-slate-500 hover:text-wls-red">
        ← All reports
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-wls-ink">Report #{report.reportNo}</h1>
            <StatusBadge status={report.status} />
          </div>
          <p className="text-sm text-slate-600">
            {report.clientName || 'No client'}
            {report.clientSite ? ` — ${report.clientSite}` : ''}
          </p>
          <p className="text-xs text-slate-400">
            {formatDateRange(report.periodStart, report.periodEnd) || 'No period set'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-wls-red">{formatCurrency(report.totalDue)}</p>
          <p className="text-xs text-slate-400">Total due</p>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-slate-200">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium ${
              tab === t.id
                ? 'border-wls-red text-wls-red'
                : 'border-transparent text-slate-500 hover:text-wls-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'statement' && <StatementTab report={report} profile={profileQuery.data!} />}
      {tab === 'worklog' && <WorkLogTab reportId={reportId} />}
      {tab === 'receipts' && <ReceiptsTab reportId={reportId} />}
      {tab === 'mileage' && <MileageTab reportId={reportId} report={report} />}
    </div>
  );
}
