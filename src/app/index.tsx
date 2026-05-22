import { useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useClients, useReports, useReportMutations } from '../hooks/data';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDateRange, todayIso } from '../lib/format';
import { Button, Card, EmptyState, Field, Input, Spinner, StatusBadge } from '../components/ui';
import { Sheet } from '../components/Sheet';
import type { Client } from '../lib/types';

export default function DashboardScreen() {
  const router = useRouter();
  const { logout } = useAuth();
  const reportsQuery = useReports();
  const clientsQuery = useClients();
  const { create } = useReportMutations();
  const [open, setOpen] = useState(false);

  const reports = reportsQuery.data ?? [];
  const totalBilled = reports.reduce((s, r) => s + r.totalDue, 0);
  const drafts = reports.filter((r) => r.status === 'draft').length;

  return (
    <View className="flex-1 bg-slate-50">
      <Stack.Screen
        options={{
          headerRight: () => (
            <View className="flex-row gap-4">
              <Pressable onPress={() => router.push('/settings')}>
                <Text className="text-sm font-semibold text-wls-red">Settings</Text>
              </Pressable>
              <Pressable onPress={() => logout()}>
                <Text className="text-sm font-semibold text-slate-500">Sign out</Text>
              </Pressable>
            </View>
          ),
        }}
      />

      <FlatList
        contentContainerStyle={{ padding: 16, gap: 12 }}
        data={reports}
        keyExtractor={(r) => r.id}
        ListHeaderComponent={
          <View className="gap-3 pb-1">
            <View className="flex-row gap-3">
              <Stat label="Reports" value={String(reports.length)} />
              <Stat label="Billed" value={formatCurrency(totalBilled)} />
              <Stat label="Drafts" value={String(drafts)} />
            </View>
            <Button title="+ New report" onPress={() => setOpen(true)} />
          </View>
        }
        ListEmptyComponent={
          reportsQuery.isLoading ? (
            <Spinner />
          ) : (
            <EmptyState
              title="No reports yet"
              description="Create your first expense report to log work, receipts, and mileage."
            />
          )
        }
        renderItem={({ item: r }) => (
          <Pressable onPress={() => router.push(`/report/${r.id}`)}>
            <Card className="flex-row items-center justify-between p-4">
              <View className="flex-1 pr-3">
                <View className="flex-row items-center gap-2">
                  <Text className="text-sm font-bold text-wls-ink">Report #{r.reportNo}</Text>
                  <StatusBadge status={r.status} />
                </View>
                <Text className="text-sm text-slate-600" numberOfLines={1}>
                  {r.clientName || 'No client'}
                  {r.clientSite ? ` — ${r.clientSite}` : ''}
                </Text>
                <Text className="text-xs text-slate-400">
                  {formatDateRange(r.periodStart, r.periodEnd) || 'No period set'}
                </Text>
              </View>
              <View className="items-end">
                <Text className="text-base font-bold text-wls-ink">
                  {formatCurrency(r.totalDue)}
                </Text>
                <Text className="text-xs text-slate-400">Total due</Text>
              </View>
            </Card>
          </Pressable>
        )}
      />

      <NewReportSheet
        visible={open}
        onClose={() => setOpen(false)}
        clients={clientsQuery.data ?? []}
        creating={create.isPending}
        onCreate={async (data) => {
          const id = await create.mutateAsync(data);
          setOpen(false);
          router.push(`/report/${id}`);
        }}
      />
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="flex-1 px-3 py-3">
      <Text className="text-xs font-semibold uppercase text-slate-400">{label}</Text>
      <Text className="mt-1 text-lg font-bold text-wls-ink">{value}</Text>
    </Card>
  );
}

function NewReportSheet({
  visible,
  onClose,
  clients,
  creating,
  onCreate,
}: {
  visible: boolean;
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

  function pick(c: Client) {
    setClientId(c.id);
    setClientName(c.name);
    setClientSite(c.site);
    setDayRate(String(c.defaultDayRate || 0));
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="New expense report"
      footer={
        <>
          <Button title="Cancel" variant="secondary" onPress={onClose} />
          <Button
            title="Create"
            loading={creating}
            onPress={() =>
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
              })
            }
          />
        </>
      }
    >
      {clients.length > 0 && (
        <Field label="Use a saved client">
          <View className="flex-row flex-wrap gap-2">
            {clients.map((c) => (
              <Pressable
                key={c.id}
                onPress={() => pick(c)}
                className={`rounded-full border px-3 py-1.5 ${
                  clientId === c.id ? 'border-wls-red bg-wls-red/10' : 'border-slate-300'
                }`}
              >
                <Text className="text-sm text-wls-ink">{c.name}</Text>
              </Pressable>
            ))}
          </View>
        </Field>
      )}
      <Field label="Client name">
        <Input value={clientName} onChangeText={setClientName} />
      </Field>
      <Field label="Site / location">
        <Input value={clientSite} onChangeText={setClientSite} />
      </Field>
      <Field label="Period start" hint="Format: YYYY-MM-DD">
        <Input placeholder="2026-04-14" value={periodStart} onChangeText={setPeriodStart} />
      </Field>
      <Field label="Period end" hint="Format: YYYY-MM-DD">
        <Input placeholder="2026-04-30" value={periodEnd} onChangeText={setPeriodEnd} />
      </Field>
      <Field label="Report date" hint="Format: YYYY-MM-DD">
        <Input value={reportDate} onChangeText={setReportDate} />
      </Field>
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Field label="Day rate ($)">
            <Input keyboardType="numeric" value={dayRate} onChangeText={setDayRate} />
          </Field>
        </View>
        <View className="flex-1">
          <Field label="Days worked">
            <Input keyboardType="numeric" value={laborDays} onChangeText={setLaborDays} />
          </Field>
        </View>
      </View>
      <Field label="Labor description">
        <Input
          placeholder="Onsite labor — Snak King, City of Industry CA"
          value={desc}
          onChangeText={setDesc}
        />
      </Field>
    </Sheet>
  );
}
