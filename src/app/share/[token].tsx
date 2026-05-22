import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { fetchSharedStatement, shareEnabled } from '../../lib/api';
import { shareStatement } from '../../pdf/generate';
import { formatCurrency, formatDate, formatNumber } from '../../lib/format';
import type { StatementData } from '../../lib/statement';
import { Button, Card, Spinner } from '../../components/ui';
import { Logo } from '../../components/Logo';

export default function ShareScreen() {
  const { token = '' } = useLocalSearchParams<{ token: string }>();
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

  if (loading) return <Spinner />;

  if (error || !data) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 p-6">
        <Logo width={150} />
        <Text className="mt-4 text-lg font-semibold text-wls-ink">Statement unavailable</Text>
        <Text className="mt-1 text-center text-sm text-slate-500">{error}</Text>
      </View>
    );
  }

  const { profile } = data;
  return (
    <ScrollView className="flex-1 bg-slate-100" contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Stack.Screen options={{ headerShown: false }} />
      <Button title="⬇ Export PDF" onPress={() => shareStatement(data)} />
      <Card className="overflow-hidden">
        <View className="border-b-4 border-wls-red p-4">
          <Logo width={150} />
          {profile.tagline ? (
            <Text className="mt-1 text-xs italic text-slate-400">{profile.tagline}</Text>
          ) : null}
          <Text className="mt-2 text-xl font-bold text-wls-ink">Expense Statement</Text>
        </View>
        <View className="p-4">
          {profile.fullName ? (
            <Text className="text-base font-bold text-wls-ink">{profile.fullName}</Text>
          ) : null}
          {profile.addressLine ? (
            <Text className="text-sm text-slate-500">{profile.addressLine}</Text>
          ) : null}
          {profile.phone ? <Text className="text-sm text-slate-500">{profile.phone}</Text> : null}
          {profile.email ? <Text className="text-sm text-slate-500">{profile.email}</Text> : null}

          <View className="mt-3 gap-1">
            <Meta label="Exp. Report No." value={String(data.reportNo)} />
            <Meta label="Date" value={formatDate(data.reportDate)} />
            <Meta label="Period" value={data.periodLabel || '—'} />
          </View>

          {data.laborDescription ? (
            <Text className="mt-3 text-sm text-slate-700">{data.laborDescription}</Text>
          ) : null}

          <View className="mt-3 overflow-hidden rounded-lg border border-slate-200">
            <View className="flex-row bg-wls-ink px-3 py-2">
              <Text className="flex-1 text-xs font-semibold uppercase text-white">Description</Text>
              <Text className="w-24 text-right text-xs font-semibold uppercase text-white">
                Total
              </Text>
            </View>
            <Row
              label={
                data.clientName
                  ? `Onsite labor — ${data.clientName} (${formatNumber(data.laborDays, 0)} d × ${formatCurrency(data.dayRate)})`
                  : 'Onsite labor'
              }
              value={formatCurrency(data.laborTotal)}
            />
            <Row label="Expenses (receipts)" value={formatCurrency(data.receiptsTotal)} />
            <Row
              label={`Mileage (${formatNumber(data.mileageMiles, 1)} mi)`}
              value={formatCurrency(data.mileageTotal)}
            />
          </View>

          <View className="mt-3 flex-row justify-end gap-4 border-t-2 border-wls-ink pt-3">
            <Text className="text-base font-bold text-wls-ink">TOTAL DUE</Text>
            <Text className="text-xl font-bold text-wls-red">{formatCurrency(data.totalDue)}</Text>
          </View>

          {data.notes ? (
            <View className="mt-3">
              <Text className="text-sm font-semibold text-wls-ink">Notes</Text>
              <Text className="text-sm text-slate-500">{data.notes}</Text>
            </View>
          ) : null}
        </View>
      </Card>
    </ScrollView>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between">
      <Text className="text-xs font-semibold uppercase text-slate-400">{label}</Text>
      <Text className="text-sm font-semibold text-wls-ink">{value}</Text>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center border-t border-slate-100 px-3 py-2">
      <Text className="flex-1 text-sm text-wls-ink">{label}</Text>
      <Text className="w-24 text-right text-sm font-medium text-wls-ink">{value}</Text>
    </View>
  );
}
