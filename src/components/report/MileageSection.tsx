import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useMileage, useMileageMutations, useSettings } from '../../hooks/data';
import { useGeoTracker } from '../../hooks/useGeoTracker';
import { useResetForm } from '../../hooks/useResetForm';
import { rateForYear } from '../../lib/db';
import { mileageMiles, mileageTotal, round2 } from '../../lib/calc';
import { distanceBetweenAddresses, mapboxEnabled } from '../../lib/geo';
import { formatCurrency, formatNumber, formatDate, todayIso } from '../../lib/format';
import { DEFAULT_MILEAGE_RATE, type ExpenseReport, type MileageTrip } from '../../lib/types';
import { Button, Card, EmptyState, Field, Input, Spinner } from '../ui';
import { Sheet } from '../Sheet';

export function MileageSection({
  reportId,
  report,
}: {
  reportId: string;
  report: ExpenseReport;
}) {
  const { data, isLoading } = useMileage(reportId);
  const { data: settings } = useSettings();
  const { create, update, remove } = useMileageMutations(reportId);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MileageTrip | null>(null);

  const trips = data ?? [];
  const rate = settings
    ? rateForYear(settings, report.periodEnd ?? report.reportDate)
    : DEFAULT_MILEAGE_RATE;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <View className="flex-row gap-3">
        <Stat label="Miles" value={formatNumber(mileageMiles(trips), 1)} />
        <Stat label="Rate" value={`$${rate}`} />
        <Stat label="Total" value={formatCurrency(mileageTotal(trips))} />
      </View>

      <LiveTracker rate={rate} onSave={(t) => create.mutateAsync(t)} />

      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-semibold text-wls-ink">Trips</Text>
        <Button
          title="+ Add trip"
          variant="secondary"
          onPress={() => {
            setEditing(null);
            setOpen(true);
          }}
        />
      </View>

      {isLoading ? (
        <Spinner />
      ) : trips.length === 0 ? (
        <EmptyState title="No trips logged" description="Track a drive live, or add one manually." />
      ) : (
        trips.map((t) => (
          <Pressable
            key={t.id}
            onPress={() => {
              setEditing(t);
              setOpen(true);
            }}
          >
            <Card className="flex-row items-center justify-between p-4">
              <View className="flex-1 pr-3">
                <Text className="text-sm font-medium text-wls-ink" numberOfLines={1}>
                  {t.fromLabel || '—'} → {t.toLabel || '—'}
                </Text>
                <Text className="text-xs text-slate-400">
                  {formatDate(t.date)} · {t.purpose || 'Trip'}
                  {t.source === 'live' ? ' · 📍 GPS' : ''}
                </Text>
              </View>
              <View className="items-end">
                <Text className="text-sm font-semibold text-wls-ink">
                  {formatNumber(t.miles, 1)} mi
                </Text>
                <Text className="text-xs text-slate-400">{formatCurrency(t.total)}</Text>
              </View>
            </Card>
          </Pressable>
        ))
      )}

      <TripSheet
        visible={open}
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
        onSave={async (t) => {
          if (editing) await update.mutateAsync({ id: editing.id, data: t });
          else await create.mutateAsync(t);
          setOpen(false);
        }}
      />
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="flex-1 px-3 py-2">
      <Text className="text-xs uppercase text-slate-400">{label}</Text>
      <Text className="mt-0.5 text-base font-bold text-wls-ink">{value}</Text>
    </Card>
  );
}

function LiveTracker({
  rate,
  onSave,
}: {
  rate: number;
  onSave: (trip: Omit<MileageTrip, 'id' | 'createdAt'>) => Promise<unknown>;
}) {
  const tracker = useGeoTracker();
  const [saving, setSaving] = useState(false);

  async function finish() {
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

  const tracking = tracker.state === 'tracking';
  return (
    <Card className="border-wls-red/30 bg-wls-red/5 p-4">
      <Text className="text-sm font-semibold text-wls-ink">📍 Live GPS trip</Text>
      {tracking ? (
        <Text className="text-2xl font-bold text-wls-red">
          {formatNumber(tracker.miles, 2)} mi{' '}
          <Text className="text-xs font-normal text-slate-500">{tracker.points} pts</Text>
        </Text>
      ) : (
        <Text className="text-xs text-slate-500">
          Keep the app open and your screen on while driving.
        </Text>
      )}
      {tracker.error ? <Text className="text-xs text-wls-red">{tracker.error}</Text> : null}
      <View className="mt-2">
        {tracking ? (
          <Button title="Stop & save" loading={saving} onPress={finish} />
        ) : (
          <Button
            title={tracker.state === 'requesting' ? 'Starting…' : 'Start tracking'}
            onPress={() => tracker.start()}
          />
        )}
      </View>
    </Card>
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

function TripSheet({
  visible,
  onClose,
  initial,
  rate,
  saving,
  onSave,
  onDelete,
}: {
  visible: boolean;
  onClose: () => void;
  initial: MileageTrip | null;
  rate: number;
  saving: boolean;
  onSave: (trip: Omit<MileageTrip, 'id' | 'createdAt'>) => void;
  onDelete?: () => void;
}) {
  const [form, setForm] = useState(blankTrip(rate));
  const [calc, setCalc] = useState(false);
  const [calcError, setCalcError] = useState('');
  useResetForm(initial?.id ?? 'new', visible, () => {
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

  async function auto() {
    setCalcError('');
    setCalc(true);
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
      setCalc(false);
    }
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={initial ? 'Edit trip' : 'Add trip'}
      footer={
        <>
          {onDelete && <Button title="Delete" variant="ghost" onPress={onDelete} />}
          <Button title="Cancel" variant="secondary" onPress={onClose} />
          <Button
            title="Save"
            loading={saving}
            onPress={() =>
              onSave({
                ...form,
                miles: Number(form.miles) || 0,
                ratePerMile: Number(form.ratePerMile) || 0,
                total: round2((Number(form.miles) || 0) * (Number(form.ratePerMile) || 0)),
              })
            }
          />
        </>
      }
    >
      <Field label="Date" hint="YYYY-MM-DD">
        <Input value={form.date ?? ''} onChangeText={(v) => set('date', v)} />
      </Field>
      <Field label="From">
        <Input placeholder="Home address" value={form.fromLabel} onChangeText={(v) => set('fromLabel', v)} />
      </Field>
      <Field label="To">
        <Input placeholder="Job site" value={form.toLabel} onChangeText={(v) => set('toLabel', v)} />
      </Field>
      {mapboxEnabled && (
        <View className="mb-1">
          <Button title="Calculate driving distance" variant="secondary" loading={calc} onPress={auto} />
          {calcError ? <Text className="mt-1 text-xs text-wls-red">{calcError}</Text> : null}
        </View>
      )}
      <Field label="Purpose">
        <Input placeholder="Travel to job site" value={form.purpose} onChangeText={(v) => set('purpose', v)} />
      </Field>
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Field label="Miles">
            <Input
              keyboardType="numeric"
              value={String(form.miles)}
              onChangeText={(v) => set('miles', Number(v) || 0)}
            />
          </Field>
        </View>
        <View className="flex-1">
          <Field label="$/mile">
            <Input
              keyboardType="numeric"
              value={String(form.ratePerMile)}
              onChangeText={(v) => set('ratePerMile', Number(v) || 0)}
            />
          </Field>
        </View>
      </View>
      <Field label="Total">
        <Text className="text-lg font-bold text-wls-ink">{formatCurrency(form.total)}</Text>
      </Field>
    </Sheet>
  );
}

function stripMeta(t: MileageTrip): Omit<MileageTrip, 'id' | 'createdAt'> {
  const { id: _id, createdAt: _c, ...rest } = t;
  return rest;
}
