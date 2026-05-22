import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useWorkLog, useWorkLogMutations } from '../../hooks/data';
import { useResetForm } from '../../hooks/useResetForm';
import { totalHours } from '../../lib/calc';
import { formatDate, formatNumber, todayIso } from '../../lib/format';
import { TASK_CATEGORIES, type TaskCategory, type WorkLogEntry } from '../../lib/types';
import { Button, Card, EmptyState, Field, Input, Spinner } from '../ui';
import { Sheet } from '../Sheet';

const blank = (): Omit<WorkLogEntry, 'id' | 'createdAt'> => ({
  date: todayIso(),
  clientSite: '',
  location: '',
  taskCategory: '',
  hours: 8,
  workSummary: '',
  keyFindings: '',
  status: '',
});

export function WorkLogSection({ reportId }: { reportId: string }) {
  const { data, isLoading } = useWorkLog(reportId);
  const { create, update, remove } = useWorkLogMutations(reportId);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<WorkLogEntry | null>(null);
  const entries = data ?? [];

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <View className="flex-row items-center justify-between">
        <Text className="text-sm text-slate-600">
          {entries.length} entries · {formatNumber(totalHours(entries), 1)} hrs
        </Text>
        <Button
          title="+ Add"
          onPress={() => {
            setEditing(null);
            setOpen(true);
          }}
        />
      </View>

      {isLoading ? (
        <Spinner />
      ) : entries.length === 0 ? (
        <EmptyState title="No work logged" description="Log each day: client, hours, what you did." />
      ) : (
        entries.map((e) => (
          <Pressable
            key={e.id}
            onPress={() => {
              setEditing(e);
              setOpen(true);
            }}
          >
            <Card className="p-4">
              <View className="flex-row justify-between">
                <Text className="text-sm font-semibold text-wls-ink">
                  {formatDate(e.date) || 'No date'} · {e.clientSite || 'Untitled'}
                </Text>
                <Text className="text-xs text-slate-500">{formatNumber(e.hours, 1)} hrs</Text>
              </View>
              <Text className="text-xs text-slate-400">
                {e.location}
                {e.taskCategory ? ` · ${e.taskCategory}` : ''}
              </Text>
              {e.workSummary ? (
                <Text className="mt-1 text-sm text-slate-600" numberOfLines={2}>
                  {e.workSummary}
                </Text>
              ) : null}
            </Card>
          </Pressable>
        ))
      )}

      <WorkLogSheet
        visible={open}
        onClose={() => setOpen(false)}
        initial={editing}
        saving={create.isPending || update.isPending}
        onDelete={
          editing
            ? async () => {
                await remove.mutateAsync(editing.id);
                setOpen(false);
              }
            : undefined
        }
        onSave={async (form) => {
          if (editing) await update.mutateAsync({ id: editing.id, data: form });
          else await create.mutateAsync(form);
          setOpen(false);
        }}
      />
    </ScrollView>
  );
}

function WorkLogSheet({
  visible,
  onClose,
  initial,
  saving,
  onSave,
  onDelete,
}: {
  visible: boolean;
  onClose: () => void;
  initial: WorkLogEntry | null;
  saving: boolean;
  onSave: (data: Omit<WorkLogEntry, 'id' | 'createdAt'>) => void;
  onDelete?: () => void;
}) {
  const [form, setForm] = useState(blank());
  useResetForm(initial?.id ?? 'new', visible, () =>
    setForm(initial ? stripMeta(initial) : blank()),
  );

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={initial ? 'Edit work entry' : 'Add work entry'}
      footer={
        <>
          {onDelete && <Button title="Delete" variant="ghost" onPress={onDelete} />}
          <Button title="Cancel" variant="secondary" onPress={onClose} />
          <Button
            title="Save"
            loading={saving}
            onPress={() => onSave({ ...form, hours: Number(form.hours) || 0 })}
          />
        </>
      }
    >
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Field label="Date" hint="YYYY-MM-DD">
            <Input value={form.date ?? ''} onChangeText={(v) => set('date', v)} />
          </Field>
        </View>
        <View className="flex-1">
          <Field label="Hours">
            <Input
              keyboardType="numeric"
              value={String(form.hours)}
              onChangeText={(v) => set('hours', Number(v) || 0)}
            />
          </Field>
        </View>
      </View>
      <Field label="Client / site">
        <Input value={form.clientSite} onChangeText={(v) => set('clientSite', v)} />
      </Field>
      <Field label="Location">
        <Input value={form.location} onChangeText={(v) => set('location', v)} />
      </Field>
      <Field label="Task category">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {TASK_CATEGORIES.map((c) => (
            <Pressable
              key={c}
              onPress={() => set('taskCategory', form.taskCategory === c ? '' : (c as TaskCategory))}
              className={`rounded-full border px-3 py-1.5 ${
                form.taskCategory === c ? 'border-wls-red bg-wls-red/10' : 'border-slate-300'
              }`}
            >
              <Text className="text-xs text-wls-ink">{c}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </Field>
      <Field label="Work summary">
        <Input
          multiline
          value={form.workSummary}
          onChangeText={(v) => set('workSummary', v)}
          style={{ minHeight: 80, textAlignVertical: 'top' }}
        />
      </Field>
      <Field label="Key findings / actions">
        <Input
          multiline
          value={form.keyFindings}
          onChangeText={(v) => set('keyFindings', v)}
          style={{ minHeight: 60, textAlignVertical: 'top' }}
        />
      </Field>
      <Field label="Status">
        <Input placeholder="e.g. Complete" value={form.status} onChangeText={(v) => set('status', v)} />
      </Field>
    </Sheet>
  );
}

function stripMeta(e: WorkLogEntry): Omit<WorkLogEntry, 'id' | 'createdAt'> {
  const { id: _id, createdAt: _c, ...rest } = e;
  return rest;
}
