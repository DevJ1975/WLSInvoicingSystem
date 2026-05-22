import { FormEvent, useState } from 'react';
import { useMileage, useMileageMutations, useSettings } from '../../hooks/data';
import { useGeoTracker } from '../../hooks/useGeoTracker';
import { useResetForm } from '../../hooks/useResetForm';
import { rateForYear } from '../../lib/db';
import { mileageMiles, mileageTotal, round2 } from '../../lib/calc';
import { distanceBetweenAddresses, mapboxEnabled } from '../../lib/geo';
import { formatCurrency, formatDate, formatNumber, todayIso } from '../../lib/format';
import { DEFAULT_MILEAGE_RATE, type ExpenseReport, type MileageTrip } from '../../lib/types';
import { EmptyState, Field, Spinner } from '../ui';
import { Modal } from '../Modal';

export function MileageTab({ reportId, report }: { reportId: string; report: ExpenseReport }) {
  const { data, isLoading } = useMileage(reportId);
  const { data: settings } = useSettings();
  const { create, update, remove } = useMileageMutations(reportId);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MileageTrip | null>(null);

  const trips = data ?? [];
  const rate = settings
    ? rateForYear(settings, report.periodEnd ?? report.reportDate)
    : DEFAULT_MILEAGE_RATE;

  function openManual() {
    setEditing(null);
    setOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Total miles" value={formatNumber(mileageMiles(trips), 1)} />
        <Stat label="Rate" value={`$${rate}/mi`} />
        <Stat label="Reimbursement" value={formatCurrency(mileageTotal(trips))} />
      </div>

      <LiveTracker
        rate={rate}
        onSave={async (trip) => {
          await create.mutateAsync(trip);
        }}
      />

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-wls-ink">Trips</h3>
        <button className="btn-secondary" onClick={openManual}>
          + Add trip manually
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spinner className="h-6 w-6" />
        </div>
      ) : trips.length === 0 ? (
        <EmptyState
          title="No trips logged"
          description="Track a drive live with GPS, or add a trip manually."
        />
      ) : (
        <div className="space-y-2">
          {trips.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setEditing(t);
                setOpen(true);
              }}
              className="card flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:border-wls-red/40"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-wls-ink">
                  {t.fromLabel || '—'} → {t.toLabel || '—'}
                </p>
                <p className="text-xs text-slate-400">
                  {formatDate(t.date)} · {t.purpose || 'Trip'}
                  {t.source === 'live' ? ' · 📍 GPS' : ''}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-wls-ink">{formatNumber(t.miles, 1)} mi</p>
                <p className="text-xs text-slate-400">{formatCurrency(t.total)}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      <ManualTripModal
        open={open}
        onClose={() => setOpen(false)}
        initial={editing}
        rate={rate}
        saving={create.isPending || update.isPending}
        onDelete={
          editing
            ? async () => {
                await remove.mutateAsync(editing.id);
                setOpen(false);
              }
            : undefined
        }
        onSave={async (trip) => {
          if (editing) await update.mutateAsync({ id: editing.id, data: trip });
          else await create.mutateAsync(trip);
          setOpen(false);
        }}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card px-3 py-2 text-center">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 text-base font-bold text-wls-ink">{value}</p>
    </div>
  );
}

function LiveTracker({
  rate,
  onSave,
}: {
  rate: number;
  onSave: (trip: Omit<MileageTrip, 'id' | 'createdAt'>) => Promise<void>;
}) {
  const tracker = useGeoTracker();
  const [saving, setSaving] = useState(false);

  async function finishAndSave() {
    const path = tracker.stop();
    setSaving(true);
    try {
      const miles = round2(tracker.miles);
      await onSave({
        date: todayIso(),
        fromLabel: 'GPS start',
        toLabel: 'GPS end',
        purpose: 'Tracked drive',
        miles,
        ratePerMile: rate,
        total: round2(miles * rate),
        source: 'live',
        path,
        fromLat: path[0]?.lat ?? null,
        fromLng: path[0]?.lng ?? null,
        toLat: path[path.length - 1]?.lat ?? null,
        toLng: path[path.length - 1]?.lng ?? null,
      });
      tracker.reset();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card border-wls-red/30 bg-wls-red/5 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-wls-ink">📍 Live GPS trip</p>
          {tracker.state === 'tracking' ? (
            <p className="text-2xl font-bold text-wls-red">
              {formatNumber(tracker.miles, 2)} mi
              <span className="ml-2 text-xs font-normal text-slate-500">{tracker.points} points</span>
            </p>
          ) : (
            <p className="text-xs text-slate-500">
              Keep the app open and your screen on while driving.
            </p>
          )}
          {tracker.error && <p className="text-xs text-wls-red">{tracker.error}</p>}
        </div>
        {tracker.state === 'tracking' ? (
          <button className="btn-primary" onClick={finishAndSave} disabled={saving}>
            {saving && <Spinner className="h-4 w-4 text-white" />}
            Stop &amp; save
          </button>
        ) : (
          <button className="btn-primary" onClick={tracker.start}>
            Start tracking
          </button>
        )}
      </div>
    </div>
  );
}

const blankTrip = (rate: number): Omit<MileageTrip, 'id' | 'createdAt'> => ({
  date: todayIso(),
  fromLabel: '',
  toLabel: '',
  purpose: '',
  miles: 0,
  ratePerMile: rate,
  total: 0,
  source: 'manual',
});

function ManualTripModal({
  open,
  onClose,
  initial,
  rate,
  saving,
  onSave,
  onDelete,
}: {
  open: boolean;
  onClose: () => void;
  initial: MileageTrip | null;
  rate: number;
  saving: boolean;
  onSave: (trip: Omit<MileageTrip, 'id' | 'createdAt'>) => void;
  onDelete?: () => void;
}) {
  const [form, setForm] = useState(blankTrip(rate));
  const [calculating, setCalculating] = useState(false);
  const [calcError, setCalcError] = useState('');
  useResetForm(initial?.id ?? 'new', open, () => {
    setForm(initial ? stripMeta(initial) : blankTrip(rate));
    setCalcError('');
  });

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => {
      const next = { ...f, [k]: v };
      if (k === 'miles' || k === 'ratePerMile') {
        next.total = round2((Number(next.miles) || 0) * (Number(next.ratePerMile) || 0));
      }
      return next;
    });
  }

  async function autoDistance() {
    setCalcError('');
    setCalculating(true);
    try {
      const result = await distanceBetweenAddresses(form.fromLabel, form.toLabel);
      if (!result) {
        setCalcError('Could not calculate distance for those addresses.');
        return;
      }
      setForm((f) => ({
        ...f,
        miles: result.miles,
        total: round2(result.miles * (Number(f.ratePerMile) || 0)),
        fromLat: result.from.lat,
        fromLng: result.from.lng,
        toLat: result.to.lat,
        toLng: result.to.lng,
      }));
    } finally {
      setCalculating(false);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    onSave({
      ...form,
      miles: Number(form.miles) || 0,
      ratePerMile: Number(form.ratePerMile) || 0,
      total: round2((Number(form.miles) || 0) * (Number(form.ratePerMile) || 0)),
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? 'Edit trip' : 'Add trip'}
      footer={
        <>
          {onDelete && (
            <button className="btn-ghost mr-auto text-wls-red" type="button" onClick={onDelete}>
              Delete
            </button>
          )}
          <button className="btn-secondary" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" form="trip-form" disabled={saving}>
            {saving && <Spinner className="h-4 w-4 text-white" />}
            Save
          </button>
        </>
      }
    >
      <form id="trip-form" onSubmit={submit} className="space-y-4">
        <Field label="Date">
          <input type="date" className="input" value={form.date ?? ''} onChange={(e) => set('date', e.target.value)} />
        </Field>
        <Field label="From">
          <input className="input" placeholder="Home address" value={form.fromLabel} onChange={(e) => set('fromLabel', e.target.value)} />
        </Field>
        <Field label="To">
          <input className="input" placeholder="Job site" value={form.toLabel} onChange={(e) => set('toLabel', e.target.value)} />
        </Field>
        {mapboxEnabled && (
          <div>
            <button type="button" className="btn-secondary" onClick={autoDistance} disabled={calculating}>
              {calculating && <Spinner className="h-4 w-4" />}
              Calculate driving distance
            </button>
            {calcError && <p className="mt-1 text-xs text-wls-red">{calcError}</p>}
          </div>
        )}
        <Field label="Purpose">
          <input className="input" placeholder="Travel to job site" value={form.purpose} onChange={(e) => set('purpose', e.target.value)} />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Miles">
            <input type="number" step="0.1" className="input" value={form.miles} onChange={(e) => set('miles', Number(e.target.value))} />
          </Field>
          <Field label="$/mile">
            <input type="number" step="0.001" className="input" value={form.ratePerMile} onChange={(e) => set('ratePerMile', Number(e.target.value))} />
          </Field>
          <Field label="Total">
            <input className="input bg-slate-50" readOnly value={formatCurrency(form.total)} />
          </Field>
        </div>
      </form>
    </Modal>
  );
}

function stripMeta(t: MileageTrip): Omit<MileageTrip, 'id' | 'createdAt'> {
  const { id: _id, createdAt: _c, ...rest } = t;
  return rest;
}
