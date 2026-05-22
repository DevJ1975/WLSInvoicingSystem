import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchSharedStatement, shareEnabled } from '../lib/api';
import { formatCurrency, formatDate, formatNumber } from '../lib/format';
import type { StatementData } from '../lib/statement';
import { Logo } from '../components/Logo';
import { FullPageSpinner } from '../components/ui';

export function SharePage() {
  const { token = '' } = useParams();
  const [data, setData] = useState<StatementData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!shareEnabled) {
      setError('Sharing is not configured for this deployment.');
      setLoading(false);
      return;
    }
    fetchSharedStatement(token)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Unavailable.'))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <FullPageSpinner />;

  if (error || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
        <Logo className="h-10" />
        <p className="text-lg font-semibold text-wls-ink">Statement unavailable</p>
        <p className="max-w-md text-sm text-slate-500">{error}</p>
      </div>
    );
  }

  const { profile } = data;
  return (
    <div className="min-h-screen bg-slate-100 py-8">
      <div className="mx-auto max-w-3xl px-4">
        <div className="mb-4 flex justify-end">
          <button
            className="btn-primary"
            onClick={async () => {
              const { downloadStatement } = await import('../pdf/generate');
              await downloadStatement(data);
            }}
          >
            ⬇ Download PDF
          </button>
        </div>
        <div className="overflow-hidden rounded-xl bg-white shadow">
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
            <div className="flex flex-wrap justify-between gap-6 text-sm">
              <div>
                {profile.fullName && <p className="text-base font-bold text-wls-ink">{profile.fullName}</p>}
                {profile.addressLine && <p className="text-slate-500">{profile.addressLine}</p>}
                {profile.phone && <p className="text-slate-500">{profile.phone}</p>}
                {profile.email && <p className="text-slate-500">{profile.email}</p>}
              </div>
              <div>
                <Meta label="EXP. REPORT NO." value={String(data.reportNo)} />
                <Meta label="DATE" value={formatDate(data.reportDate)} />
                <Meta label="PERIOD" value={data.periodLabel} />
              </div>
            </div>

            {data.laborDescription && <p className="mt-5 text-sm text-slate-700">{data.laborDescription}</p>}

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
                    {data.clientName
                      ? `Onsite labor — ${data.clientName}${data.clientSite ? `, ${data.clientSite}` : ''}`
                      : 'Onsite labor'}
                  </td>
                  <td className="px-3 py-2 text-right">{formatNumber(data.laborDays, 0)}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(data.dayRate)}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(data.laborTotal)}</td>
                </tr>
                <tr>
                  <td className="px-3 py-2">Expenses (receipts)</td>
                  <td />
                  <td />
                  <td className="px-3 py-2 text-right">{formatCurrency(data.receiptsTotal)}</td>
                </tr>
                <tr>
                  <td className="px-3 py-2">
                    Mileage ({formatNumber(data.mileageMiles, 1)} mi
                    {data.mileageRate ? ` × $${data.mileageRate}/mi` : ''})
                  </td>
                  <td />
                  <td />
                  <td className="px-3 py-2 text-right">{formatCurrency(data.mileageTotal)}</td>
                </tr>
              </tbody>
            </table>

            <div className="mt-4 flex justify-end border-t-2 border-wls-ink pt-3">
              <span className="mr-6 text-lg font-bold text-wls-ink">TOTAL DUE</span>
              <span className="text-xl font-bold text-wls-red">{formatCurrency(data.totalDue)}</span>
            </div>

            {data.notes && (
              <div className="mt-5 text-sm">
                <p className="font-semibold text-wls-ink">Notes</p>
                <p className="text-slate-500">{data.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-8">
      <span className="text-xs font-semibold uppercase text-slate-400">{label}</span>
      <span className="font-semibold text-wls-ink">{value}</span>
    </div>
  );
}
