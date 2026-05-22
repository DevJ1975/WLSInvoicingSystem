import { FormEvent, useEffect, useState } from 'react';
import {
  useClientMutations,
  useClients,
  useProfile,
  useSaveProfile,
  useSaveSettings,
  useSettings,
} from '../hooks/data';
import { EMPTY_PROFILE } from '../lib/db';
import { Field, Spinner } from '../components/ui';
import { DEFAULT_MILEAGE_RATE, type Client, type Profile } from '../lib/types';

export function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-wls-ink">Settings</h1>
      <ProfileSection />
      <MileageRateSection />
      <ClientsSection />
    </div>
  );
}

function ProfileSection() {
  const { data, isLoading } = useProfile();
  const save = useSaveProfile();
  const [form, setForm] = useState<Profile>(EMPTY_PROFILE);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  function update<K extends keyof Profile>(key: K, value: Profile[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    await save.mutateAsync(form);
    setSaved(true);
  }

  if (isLoading) return <SectionSpinner />;

  return (
    <form onSubmit={submit} className="card p-5">
      <h2 className="mb-1 text-lg font-semibold text-wls-ink">Your details</h2>
      <p className="mb-4 text-sm text-slate-500">
        Shown at the top of every expense statement and invoice.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Full name">
          <input className="input" value={form.fullName} onChange={(e) => update('fullName', e.target.value)} />
        </Field>
        <Field label="Station / Employee ID">
          <input className="input" value={form.stationId} onChange={(e) => update('stationId', e.target.value)} />
        </Field>
        <Field label="Address">
          <input className="input" value={form.addressLine} onChange={(e) => update('addressLine', e.target.value)} />
        </Field>
        <Field label="Phone">
          <input className="input" value={form.phone} onChange={(e) => update('phone', e.target.value)} />
        </Field>
        <Field label="Email">
          <input className="input" type="email" value={form.email} onChange={(e) => update('email', e.target.value)} />
        </Field>
        <Field label="Tagline">
          <input className="input" value={form.tagline} onChange={(e) => update('tagline', e.target.value)} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Remit-to / payment instructions" hint="Optional — appears in the statement footer.">
            <input className="input" value={form.remitTo ?? ''} onChange={(e) => update('remitTo', e.target.value)} />
          </Field>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button className="btn-primary" disabled={save.isPending}>
          {save.isPending && <Spinner className="h-4 w-4 text-white" />}
          Save details
        </button>
        {saved && <span className="text-sm text-green-600">Saved</span>}
      </div>
    </form>
  );
}

function MileageRateSection() {
  const { data, isLoading } = useSettings();
  const save = useSaveSettings();
  const year = String(new Date().getFullYear());
  const [rate, setRate] = useState(String(DEFAULT_MILEAGE_RATE));
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data) setRate(String(data.mileageRates[year] ?? DEFAULT_MILEAGE_RATE));
  }, [data, year]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    await save.mutateAsync({ mileageRates: { ...(data?.mileageRates ?? {}), [year]: Number(rate) || 0 } });
    setSaved(true);
  }

  if (isLoading) return <SectionSpinner />;

  return (
    <form onSubmit={submit} className="card p-5">
      <h2 className="mb-1 text-lg font-semibold text-wls-ink">Mileage rate</h2>
      <p className="mb-4 text-sm text-slate-500">IRS standard rate applied to new mileage entries.</p>
      <div className="flex items-end gap-3">
        <Field label={`Rate for ${year} ($/mi)`}>
          <input
            type="number"
            step="0.001"
            className="input w-40"
            value={rate}
            onChange={(e) => {
              setRate(e.target.value);
              setSaved(false);
            }}
          />
        </Field>
        <button className="btn-primary" disabled={save.isPending}>
          {save.isPending && <Spinner className="h-4 w-4 text-white" />}
          Save rate
        </button>
        {saved && <span className="mb-2 text-sm text-green-600">Saved</span>}
      </div>
    </form>
  );
}

function ClientsSection() {
  const { data, isLoading } = useClients();
  const { create, update, remove } = useClientMutations();
  const [name, setName] = useState('');
  const [site, setSite] = useState('');
  const [rate, setRate] = useState('600');

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await create.mutateAsync({ name: name.trim(), site: site.trim(), defaultDayRate: Number(rate) || 0 });
    setName('');
    setSite('');
    setRate('600');
  }

  if (isLoading) return <SectionSpinner />;
  const clients = data ?? [];

  return (
    <div className="card p-5">
      <h2 className="mb-1 text-lg font-semibold text-wls-ink">Clients</h2>
      <p className="mb-4 text-sm text-slate-500">Saved clients pre-fill new reports.</p>

      {clients.length > 0 && (
        <div className="mb-4 divide-y divide-slate-100 rounded-lg border border-slate-200">
          {clients.map((c: Client) => (
            <div key={c.id} className="flex items-center justify-between gap-3 px-3 py-2">
              <div>
                <p className="text-sm font-medium text-wls-ink">{c.name}</p>
                <p className="text-xs text-slate-500">
                  {c.site || 'No site'} · ${c.defaultDayRate}/day
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  className="input w-24 py-1"
                  defaultValue={c.defaultDayRate}
                  onBlur={(e) =>
                    update.mutate({ id: c.id, data: { defaultDayRate: Number(e.target.value) || 0 } })
                  }
                />
                <button className="btn-ghost text-wls-red" onClick={() => remove.mutate(c.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={add} className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <input className="input sm:col-span-1" placeholder="Client name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="input sm:col-span-1" placeholder="Site / location" value={site} onChange={(e) => setSite(e.target.value)} />
        <input className="input sm:col-span-1" type="number" placeholder="Day rate" value={rate} onChange={(e) => setRate(e.target.value)} />
        <button className="btn-secondary sm:col-span-1" disabled={create.isPending}>
          Add client
        </button>
      </form>
    </div>
  );
}

function SectionSpinner() {
  return (
    <div className="card flex justify-center p-8">
      <Spinner className="h-6 w-6" />
    </div>
  );
}
