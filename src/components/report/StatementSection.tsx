import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useUid } from '../../hooks/useUid';
import { useMileage, useReceipts, useReportMutations } from '../../hooks/data';
import { buildStatement } from '../../lib/statement';
import {
  createShareLink,
  emailEnabled,
  emailStatement,
  shareEnabled,
} from '../../lib/api';
import { shareStatement } from '../../pdf/generate';
import { formatCurrency, formatDate, formatNumber, todayIso } from '../../lib/format';
import {
  type ExpenseReport,
  type Profile,
  type ReportStatus,
} from '../../lib/types';
import { Button, Card, Field, Input, Spinner } from '../ui';
import { Sheet } from '../Sheet';
import { Logo } from '../Logo';

const STATUSES: ReportStatus[] = ['draft', 'sent', 'paid'];

export function StatementSection({
  report,
  profile,
}: {
  report: ExpenseReport;
  profile: Profile;
}) {
  const uid = useUid();
  const receiptsQuery = useReceipts(report.id);
  const mileageQuery = useMileage(report.id);
  const { update } = useReportMutations();
  const [editOpen, setEditOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [busy, setBusy] = useState('');

  const data = buildStatement(report, profile, receiptsQuery.data ?? [], mileageQuery.data ?? []);

  async function doShare() {
    setBusy('share');
    try {
      await shareStatement(data);
    } finally {
      setBusy('');
    }
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      {!profile.fullName && (
        <Card className="border-amber-200 bg-amber-50 p-3">
          <Text className="text-sm text-amber-800">
            Add your name and contact details in Settings so they appear on the statement.
          </Text>
        </Card>
      )}

      <View className="flex-row flex-wrap gap-2">
        <Button title="⬇ Export PDF" loading={busy === 'share'} onPress={doShare} />
        {emailEnabled && (
          <Button title="✉ Email" variant="secondary" onPress={() => setEmailOpen(true)} />
        )}
        {shareEnabled && (
          <Button title="🔗 Link" variant="secondary" onPress={() => setShareOpen(true)} />
        )}
        <Button title="✎ Edit" variant="secondary" onPress={() => setEditOpen(true)} />
      </View>

      <View className="flex-row gap-2">
        {STATUSES.map((s) => (
          <Pressable
            key={s}
            onPress={() => update.mutate({ id: report.id, data: { status: s } })}
            className={`rounded-full border px-3 py-1.5 ${
              report.status === s ? 'border-wls-red bg-wls-red/10' : 'border-slate-300'
            }`}
          >
            <Text className="text-xs font-semibold capitalize text-wls-ink">{s}</Text>
          </Pressable>
        ))}
      </View>

      <StatementPreview report={report} profile={profile} />

      <EditSheet
        visible={editOpen}
        onClose={() => setEditOpen(false)}
        report={report}
        saving={update.isPending}
        onSave={async (patch) => {
          await update.mutateAsync({ id: report.id, data: patch });
          setEditOpen(false);
        }}
      />

      <EmailSheet
        visible={emailOpen}
        onClose={() => setEmailOpen(false)}
        reportNo={report.reportNo}
        onSend={async (to, message) => {
          await emailStatement(data, to, message);
          await update.mutateAsync({ id: report.id, data: { status: 'sent' } });
          setEmailOpen(false);
        }}
      />

      <ShareSheet
        visible={shareOpen}
        onClose={() => setShareOpen(false)}
        getLink={() => createShareLink(uid, report.id, report.shareToken)}
      />
    </ScrollView>
  );
}

function StatementPreview({ report, profile }: { report: ExpenseReport; profile: Profile }) {
  return (
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
          <Meta label="Exp. Report No." value={String(report.reportNo)} />
          <Meta label="Date" value={formatDate(report.reportDate)} />
          <Meta
            label="Period"
            value={
              report.periodStart && report.periodEnd
                ? `${formatDate(report.periodStart)} – ${formatDate(report.periodEnd)}`
                : '—'
            }
          />
        </View>

        {report.laborDescription ? (
          <Text className="mt-3 text-sm text-slate-700">{report.laborDescription}</Text>
        ) : null}

        <View className="mt-3 overflow-hidden rounded-lg border border-slate-200">
          <View className="flex-row bg-wls-ink px-3 py-2">
            <Text className="flex-1 text-xs font-semibold uppercase text-white">Description</Text>
            <Text className="w-20 text-right text-xs font-semibold uppercase text-white">
              Total
            </Text>
          </View>
          <Row
            label={
              report.clientName
                ? `Onsite labor — ${report.clientName} (${formatNumber(report.laborDays, 0)} d × ${formatCurrency(report.dayRate)})`
                : 'Onsite labor'
            }
            value={formatCurrency(report.laborTotal)}
          />
          <Row label="Expenses (receipts)" value={formatCurrency(report.receiptsTotal)} />
          <Row label="Mileage reimbursement" value={formatCurrency(report.mileageTotal)} />
        </View>

        <View className="mt-3 flex-row justify-end gap-4 border-t-2 border-wls-ink pt-3">
          <Text className="text-base font-bold text-wls-ink">TOTAL DUE</Text>
          <Text className="text-xl font-bold text-wls-red">{formatCurrency(report.totalDue)}</Text>
        </View>

        {report.notes ? (
          <View className="mt-3">
            <Text className="text-sm font-semibold text-wls-ink">Notes</Text>
            <Text className="text-sm text-slate-500">{report.notes}</Text>
          </View>
        ) : null}
      </View>
    </Card>
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

function EditSheet({
  visible,
  onClose,
  report,
  saving,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  report: ExpenseReport;
  saving: boolean;
  onSave: (patch: Partial<ExpenseReport>) => void;
}) {
  const [form, setForm] = useState({
    clientName: report.clientName,
    clientSite: report.clientSite,
    periodStart: report.periodStart ?? '',
    periodEnd: report.periodEnd ?? '',
    reportDate: report.reportDate ?? todayIso(),
    laborDays: String(report.laborDays),
    dayRate: String(report.dayRate),
    laborDescription: report.laborDescription,
    notes: report.notes,
  });

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Edit statement details"
      footer={
        <>
          <Button title="Cancel" variant="secondary" onPress={onClose} />
          <Button
            title="Save"
            loading={saving}
            onPress={() =>
              onSave({
                clientName: form.clientName,
                clientSite: form.clientSite,
                periodStart: form.periodStart || null,
                periodEnd: form.periodEnd || null,
                reportDate: form.reportDate || null,
                laborDays: Number(form.laborDays) || 0,
                dayRate: Number(form.dayRate) || 0,
                laborDescription: form.laborDescription,
                notes: form.notes,
              })
            }
          />
        </>
      }
    >
      <Field label="Client name">
        <Input value={form.clientName} onChangeText={(v) => set('clientName', v)} />
      </Field>
      <Field label="Site / location">
        <Input value={form.clientSite} onChangeText={(v) => set('clientSite', v)} />
      </Field>
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Field label="Period start" hint="YYYY-MM-DD">
            <Input value={form.periodStart} onChangeText={(v) => set('periodStart', v)} />
          </Field>
        </View>
        <View className="flex-1">
          <Field label="Period end" hint="YYYY-MM-DD">
            <Input value={form.periodEnd} onChangeText={(v) => set('periodEnd', v)} />
          </Field>
        </View>
      </View>
      <Field label="Report date" hint="YYYY-MM-DD">
        <Input value={form.reportDate} onChangeText={(v) => set('reportDate', v)} />
      </Field>
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Field label="Days worked">
            <Input keyboardType="numeric" value={form.laborDays} onChangeText={(v) => set('laborDays', v)} />
          </Field>
        </View>
        <View className="flex-1">
          <Field label="Day rate ($)">
            <Input keyboardType="numeric" value={form.dayRate} onChangeText={(v) => set('dayRate', v)} />
          </Field>
        </View>
      </View>
      <Field label="Labor description">
        <Input value={form.laborDescription} onChangeText={(v) => set('laborDescription', v)} />
      </Field>
      <Field label="Notes">
        <Input
          multiline
          value={form.notes}
          onChangeText={(v) => set('notes', v)}
          style={{ minHeight: 60, textAlignVertical: 'top' }}
        />
      </Field>
    </Sheet>
  );
}

function EmailSheet({
  visible,
  onClose,
  reportNo,
  onSend,
}: {
  visible: boolean;
  onClose: () => void;
  reportNo: number;
  onSend: (to: string, message: string) => Promise<void>;
}) {
  const [to, setTo] = useState('');
  const [message, setMessage] = useState(`Please find attached expense statement #${reportNo}.`);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  async function send() {
    setError('');
    setSending(true);
    try {
      await onSend(to.trim(), message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send.');
    } finally {
      setSending(false);
    }
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Email statement"
      footer={
        <>
          <Button title="Cancel" variant="secondary" onPress={onClose} />
          <Button title="Send" loading={sending} disabled={!to} onPress={send} />
        </>
      }
    >
      <Field label="Recipient email">
        <Input
          autoCapitalize="none"
          keyboardType="email-address"
          value={to}
          onChangeText={setTo}
        />
      </Field>
      <Field label="Message">
        <Input
          multiline
          value={message}
          onChangeText={setMessage}
          style={{ minHeight: 100, textAlignVertical: 'top' }}
        />
      </Field>
      <Text className="text-xs text-slate-400">The branded PDF is attached automatically.</Text>
      {error ? <Text className="mt-1 text-sm text-wls-red">{error}</Text> : null}
    </Sheet>
  );
}

function ShareSheet({
  visible,
  onClose,
  getLink,
}: {
  visible: boolean;
  onClose: () => void;
  getLink: () => Promise<string>;
}) {
  const [link, setLink] = useState('');
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    try {
      setLink(await getLink());
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet visible={visible} onClose={onClose} title="Shareable link">
      <Text className="text-sm text-slate-600">
        Anyone with this link can view a read-only copy of the statement — no sign-in required.
      </Text>
      {link ? (
        <View className="mt-3">
          <Input value={link} editable={false} selectTextOnFocus multiline />
        </View>
      ) : (
        <View className="mt-3">
          {loading ? <Spinner size="small" /> : <Button title="Generate link" onPress={generate} />}
        </View>
      )}
    </Sheet>
  );
}
