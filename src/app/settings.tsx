import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import {
  useClientMutations,
  useClients,
  useProfile,
  useSaveProfile,
  useSaveSettings,
  useSettings,
} from '../hooks/data';
import { EMPTY_PROFILE } from '../lib/db';
import { Button, Card, Field, Input, Spinner } from '../components/ui';
import { PinSetupSheet, type PinFlow } from '../components/PinSetupSheet';
import { usePinLock } from '../context/PinLockContext';
import { useUid } from '../hooks/useUid';
import { DEFAULT_MILEAGE_RATE, type Profile } from '../lib/types';

export default function SettingsScreen() {
  return (
    <ScrollView className="flex-1 bg-slate-50" contentContainerStyle={{ padding: 16, gap: 16 }}>
      <ProfileCard />
      <SecurityCard />
      <MileageCard />
      <ClientsCard />
    </ScrollView>
  );
}

function SecurityCard() {
  const uid = useUid();
  const { hasPin, refresh } = usePinLock();
  const [flow, setFlow] = useState<PinFlow | null>(null);
  const [msg, setMsg] = useState('');

  function open(next: PinFlow) {
    setMsg('');
    setFlow(next);
  }

  return (
    <Card className="p-4">
      <Text className="text-lg font-semibold text-wls-ink">App PIN</Text>
      <Text className="mb-3 text-sm text-slate-500">
        Require a 4-digit PIN each time the app opens. You still sign in with your email and
        password; the PIN is a quick lock on top.
      </Text>

      {hasPin ? (
        <View className="flex-row gap-3">
          <Button title="Change PIN" variant="secondary" onPress={() => open('change')} />
          <Button title="Turn off PIN" variant="secondary" onPress={() => open('off')} />
        </View>
      ) : (
        <Button title="Turn on PIN" onPress={() => open('set')} />
      )}

      {msg ? <Text className="mt-3 text-sm text-green-600">{msg}</Text> : null}

      <PinSetupSheet
        visible={flow !== null}
        flow={flow ?? 'set'}
        uid={uid}
        onClose={() => setFlow(null)}
        onDone={async (m) => {
          await refresh();
          setFlow(null);
          setMsg(m);
        }}
      />
    </Card>
  );
}

function ProfileCard() {
  const { data, isLoading } = useProfile();
  const save = useSaveProfile();
  const [form, setForm] = useState<Profile>(EMPTY_PROFILE);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  function set<K extends keyof Profile>(k: K, v: Profile[K]) {
    setForm((f) => ({ ...f, [k]: v }));
    setSaved(false);
  }

  if (isLoading) return <CardSpinner />;

  return (
    <Card className="p-4">
      <Text className="text-lg font-semibold text-wls-ink">Your details</Text>
      <Text className="mb-3 text-sm text-slate-500">Shown at the top of every statement.</Text>
      <Field label="Full name">
        <Input value={form.fullName} onChangeText={(v) => set('fullName', v)} />
      </Field>
      <Field label="Station / Employee ID">
        <Input value={form.stationId} onChangeText={(v) => set('stationId', v)} />
      </Field>
      <Field label="Address">
        <Input value={form.addressLine} onChangeText={(v) => set('addressLine', v)} />
      </Field>
      <Field label="Phone">
        <Input value={form.phone} onChangeText={(v) => set('phone', v)} keyboardType="phone-pad" />
      </Field>
      <Field label="Email">
        <Input value={form.email} onChangeText={(v) => set('email', v)} autoCapitalize="none" keyboardType="email-address" />
      </Field>
      <Field label="Tagline">
        <Input value={form.tagline} onChangeText={(v) => set('tagline', v)} />
      </Field>
      <Field label="Remit-to / payment instructions">
        <Input value={form.remitTo ?? ''} onChangeText={(v) => set('remitTo', v)} />
      </Field>
      <View className="mt-3 flex-row items-center gap-3">
        <Button
          title="Save details"
          loading={save.isPending}
          onPress={async () => {
            await save.mutateAsync(form);
            setSaved(true);
          }}
        />
        {saved ? <Text className="text-sm text-green-600">Saved</Text> : null}
      </View>
    </Card>
  );
}

function MileageCard() {
  const { data, isLoading } = useSettings();
  const save = useSaveSettings();
  const year = String(new Date().getFullYear());
  const [rate, setRate] = useState(String(DEFAULT_MILEAGE_RATE));
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data) setRate(String(data.mileageRates[year] ?? DEFAULT_MILEAGE_RATE));
  }, [data, year]);

  if (isLoading) return <CardSpinner />;

  return (
    <Card className="p-4">
      <Text className="text-lg font-semibold text-wls-ink">Mileage rate</Text>
      <Text className="mb-3 text-sm text-slate-500">IRS rate applied to new mileage entries.</Text>
      <Field label={`Rate for ${year} ($/mi)`}>
        <Input
          keyboardType="numeric"
          value={rate}
          onChangeText={(v) => {
            setRate(v);
            setSaved(false);
          }}
        />
      </Field>
      <View className="mt-2 flex-row items-center gap-3">
        <Button
          title="Save rate"
          loading={save.isPending}
          onPress={async () => {
            await save.mutateAsync({
              mileageRates: { ...(data?.mileageRates ?? {}), [year]: Number(rate) || 0 },
            });
            setSaved(true);
          }}
        />
        {saved ? <Text className="text-sm text-green-600">Saved</Text> : null}
      </View>
    </Card>
  );
}

function ClientsCard() {
  const { data, isLoading } = useClients();
  const { create, remove } = useClientMutations();
  const [name, setName] = useState('');
  const [site, setSite] = useState('');
  const [rate, setRate] = useState('600');

  if (isLoading) return <CardSpinner />;
  const clients = data ?? [];

  return (
    <Card className="p-4">
      <Text className="text-lg font-semibold text-wls-ink">Clients</Text>
      <Text className="mb-3 text-sm text-slate-500">Saved clients pre-fill new reports.</Text>

      {clients.map((c) => (
        <View
          key={c.id}
          className="mb-2 flex-row items-center justify-between rounded-lg border border-slate-200 px-3 py-2"
        >
          <View>
            <Text className="text-sm font-medium text-wls-ink">{c.name}</Text>
            <Text className="text-xs text-slate-500">
              {c.site || 'No site'} · ${c.defaultDayRate}/day
            </Text>
          </View>
          <Pressable onPress={() => remove.mutate(c.id)}>
            <Text className="text-sm font-semibold text-wls-red">Delete</Text>
          </Pressable>
        </View>
      ))}

      <View className="mt-2 gap-2">
        <Input placeholder="Client name" value={name} onChangeText={setName} />
        <View className="flex-row gap-2">
          <View className="flex-1">
            <Input placeholder="Site / location" value={site} onChangeText={setSite} />
          </View>
          <View className="w-28">
            <Input placeholder="Rate" keyboardType="numeric" value={rate} onChangeText={setRate} />
          </View>
        </View>
        <Button
          title="Add client"
          variant="secondary"
          loading={create.isPending}
          onPress={async () => {
            if (!name.trim()) return;
            await create.mutateAsync({
              name: name.trim(),
              site: site.trim(),
              defaultDayRate: Number(rate) || 0,
            });
            setName('');
            setSite('');
            setRate('600');
          }}
        />
      </View>
    </Card>
  );
}

function CardSpinner() {
  return (
    <Card className="p-4">
      <Spinner size="small" />
    </Card>
  );
}
