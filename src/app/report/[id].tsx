import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useProfile, useReport } from '../../hooks/data';
import { formatCurrency, formatDateRange } from '../../lib/format';
import { Spinner, StatusBadge } from '../../components/ui';
import { StatementSection } from '../../components/report/StatementSection';
import { WorkLogSection } from '../../components/report/WorkLogSection';
import { ReceiptsSection } from '../../components/report/ReceiptsSection';
import { MileageSection } from '../../components/report/MileageSection';

type Tab = 'statement' | 'worklog' | 'receipts' | 'mileage';
const TABS: { id: Tab; label: string }[] = [
  { id: 'statement', label: 'Statement' },
  { id: 'worklog', label: 'Work Log' },
  { id: 'receipts', label: 'Receipts' },
  { id: 'mileage', label: 'Mileage' },
];

export default function ReportScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const reportQuery = useReport(id);
  const profileQuery = useProfile();
  const [tab, setTab] = useState<Tab>('statement');

  if (reportQuery.isLoading || profileQuery.isLoading) return <Spinner />;
  const report = reportQuery.data;
  if (!report) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 p-6">
        <Text className="text-wls-ink">Report not found.</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      <Stack.Screen options={{ title: `Report #${report.reportNo}` }} />

      <View className="border-b border-slate-200 bg-white px-4 pb-3 pt-2">
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-3">
            <View className="flex-row items-center gap-2">
              <Text className="text-base font-bold text-wls-ink" numberOfLines={1}>
                {report.clientName || 'No client'}
              </Text>
              <StatusBadge status={report.status} />
            </View>
            <Text className="text-xs text-slate-400">
              {formatDateRange(report.periodStart, report.periodEnd) || 'No period set'}
            </Text>
          </View>
          <View className="items-end">
            <Text className="text-xl font-bold text-wls-red">
              {formatCurrency(report.totalDue)}
            </Text>
            <Text className="text-xs text-slate-400">Total due</Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-3"
          contentContainerStyle={{ gap: 6 }}
        >
          {TABS.map((t) => (
            <Pressable
              key={t.id}
              onPress={() => setTab(t.id)}
              className={`rounded-full px-4 py-1.5 ${
                tab === t.id ? 'bg-wls-red' : 'bg-slate-100'
              }`}
            >
              <Text
                className={`text-sm font-semibold ${
                  tab === t.id ? 'text-white' : 'text-slate-600'
                }`}
              >
                {t.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {tab === 'statement' && <StatementSection report={report} profile={profileQuery.data!} />}
      {tab === 'worklog' && <WorkLogSection reportId={id} />}
      {tab === 'receipts' && <ReceiptsSection reportId={id} />}
      {tab === 'mileage' && <MileageSection reportId={id} report={report} />}
    </View>
  );
}
