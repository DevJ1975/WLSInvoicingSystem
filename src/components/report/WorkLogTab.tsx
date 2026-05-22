import { FormEvent, useState } from 'react';
import { useWorkLog, useWorkLogMutations } from '../../hooks/data';
import { useResetForm } from '../../hooks/useResetForm';
import { totalHours } from '../../lib/calc';
import { formatDate, formatNumber, todayIso } from '../../lib/format';
import { TASK_CATEGORIES, type TaskCategory, type WorkLogEntry } from '../../lib/types';
import { EmptyState, Field, Spinner } from '../ui';
import { Modal } from '../Modal';

const blankEntry = (): Omit<WorkLogEntry, 'id' | 'createdAt'> => ({
  date: todayIso(),
  clientSite: '',
  location: '',
  taskCategory: '',
  hours: 8,
  workSummary: '',
  keyFindings: '',
  status: '',
});

export function WorkLogTab({ reportId }: { reportId: string }) {
  const { data, isLoading } = useWorkLog(reportId);
  const { create, update, remove } = useWorkLogMutations(reportId);
  const [editing, setEditing] = useState<WorkLogEntry | null>(null);
  const [open, setOpen] = useState(false);

  const entries = data ?? [];

  function openNew() {
    setEditing(null);
    setOpen(true);
  }
  function openEdit(entry: WorkLogEntry) {
    setEditing(entry);
    setOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-4 text-sm text-slate-600">
          <span>
            <strong className="text-wls-ink">{entries.length}</strong> entries
          </span>
          <span>
            <strong className="text-wls-ink">{formatNumber(totalHours(entries), 1)}</strong> hours
          </span>
        </div>
        <button className="btn-primary" onClick={openNew}>
          + Add entry
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner className="h-6 w-6" />
        </div>
      ) : entries.length === 0 ? (
        <EmptyState
          title="No work logged"
          description="Log each onsite day: client, location, hours, what you did, and key findings."
          action={
            <button className="btn-primary" onClick={openNew}>
              + Add entry
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          {entries.map((e) => (
            <button
              key={e.id}
              onClick={() => openEdit(e)}
              className="card block w-full px-4 py-3 text-left hover:border-wls-red/40"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-wls-ink">
                  {formatDate(e.date) || 'No date'} · {e.clientSite || 'Untitled'}
                </span>
                <span className="text-xs text-slate-500">{formatNumber(e.hours, 1)} hrs</span>
              </div>
              <p className="text-xs text-slate-400">
                {e.location}
                {e.taskCategory ? ` · ${e.taskCategory}` : ''}
              </p>
              {e.workSummary && (
                <p className="mt-1 line-clamp-2 text-sm text-slate-600">{e.workSummary}</p>
              )}
            </button>
          ))}
        </div>
      )}

      <WorkLogModal
        open={open}
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
        onSave={async (data) => {
          if (editing) await update.mutateAsync({ id: editing.id, data });
          else await create.mutateAsync(data);
          setOpen(false);
        }}
      />
    </div>
  );
}

function WorkLogModal({
  open,
  onClose,
  initial,
  saving,
  onSave,
  onDelete,
}: {
  open: boolean;
  onClose: () => void;
  initial: WorkLogEntry | null;
  saving: boolean;
  onSave: (data: Omit<WorkLogEntry, 'id' | 'createdAt'>) => void;
  onDelete?: () => void;
}) {
  const [form, setForm] = useState(blankEntry());

  // Reset form whenever the modal opens for a different entry.
  const key = initial?.id ?? 'new';
  useResetForm(key, open, () => setForm(initial ? toForm(initial) : blankEntry()));

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    onSave({ ...form, hours: Number(form.hours) || 0 });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title={initial ? 'Edit work entry' : 'Add work entry'}
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
          <button className="btn-primary" form="worklog-form" disabled={saving}>
            {saving && <Spinner className="h-4 w-4 text-white" />}
            Save
          </button>
        </>
      }
    >
      <form id="worklog-form" onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Date">
            <input type="date" className="input" value={form.date ?? ''} onChange={(e) => set('date', e.target.value)} />
          </Field>
          <Field label="Hours">
            <input type="number" step="0.5" className="input" value={form.hours} onChange={(e) => set('hours', Number(e.target.value))} />
          </Field>
          <Field label="Client / site">
            <input className="input" value={form.clientSite} onChange={(e) => set('clientSite', e.target.value)} />
          </Field>
          <Field label="Location">
            <input className="input" value={form.location} onChange={(e) => set('location', e.target.value)} />
          </Field>
          <Field label="Task category">
            <select className="input" value={form.taskCategory} onChange={(e) => set('taskCategory', e.target.value as TaskCategory | '')}>
              <option value="">— Select —</option>
              {TASK_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <input className="input" placeholder="e.g. Complete" value={form.status} onChange={(e) => set('status', e.target.value)} />
          </Field>
        </div>
        <Field label="Work summary">
          <textarea className="input min-h-[80px]" value={form.workSummary} onChange={(e) => set('workSummary', e.target.value)} />
        </Field>
        <Field label="Key findings / actions">
          <textarea className="input min-h-[60px]" value={form.keyFindings} onChange={(e) => set('keyFindings', e.target.value)} />
        </Field>
      </form>
    </Modal>
  );
}

function toForm(e: WorkLogEntry): Omit<WorkLogEntry, 'id' | 'createdAt'> {
  const { id: _id, createdAt: _c, ...rest } = e;
  return rest;
}
