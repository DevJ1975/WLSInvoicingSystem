import { ChangeEvent, FormEvent, useRef, useState } from 'react';
import { useUid } from '../../hooks/useUid';
import { useReceipts, useReceiptMutations } from '../../hooks/data';
import { useResetForm } from '../../hooks/useResetForm';
import { useImageUrl } from '../../hooks/useImageUrl';
import { uploadImage, deleteImage } from '../../lib/storage';
import { receiptsByCategory, receiptsTotal } from '../../lib/calc';
import { formatCurrency, formatDate, todayIso } from '../../lib/format';
import { EXPENSE_CATEGORIES, type ExpenseCategory, type Receipt } from '../../lib/types';
import { EmptyState, Field, Spinner } from '../ui';
import { Modal } from '../Modal';

const blank = (): Omit<Receipt, 'id' | 'createdAt'> => ({
  date: todayIso(),
  vendor: '',
  category: 'Meals',
  amount: 0,
  paymentMethod: '',
  notes: '',
  imagePath: null,
});

export function ReceiptsTab({ reportId }: { reportId: string }) {
  const uid = useUid();
  const { data, isLoading } = useReceipts(reportId);
  const { create, update, remove } = useReceiptMutations(reportId);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Receipt | null>(null);
  const [uploading, setUploading] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);

  const receipts = data ?? [];
  const byCat = receiptsByCategory(receipts).filter((c) => c.amount > 0);

  async function onCapture(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const path = await uploadImage(uid, reportId, 'receipts', file);
      const id = await create.mutateAsync({ ...blank(), imagePath: path });
      // Open the new receipt for detail entry.
      setEditing({ id, createdAt: Date.now(), ...blank(), imagePath: path });
      setOpen(true);
    } finally {
      setUploading(false);
    }
  }

  function addManual() {
    setEditing(null);
    setOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-slate-600">
          <strong className="text-wls-ink">{receipts.length}</strong> receipts ·{' '}
          <strong className="text-wls-ink">{formatCurrency(receiptsTotal(receipts))}</strong>
        </div>
        <div className="flex gap-2">
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={onCapture}
          />
          <button
            className="btn-primary"
            onClick={() => cameraRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? <Spinner className="h-4 w-4 text-white" /> : '📷'} Photo receipt
          </button>
          <button className="btn-secondary" onClick={addManual}>
            + Manual
          </button>
        </div>
      </div>

      {byCat.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {byCat.map((c) => (
            <span key={c.category} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
              {c.category}: <strong>{formatCurrency(c.amount)}</strong>
            </span>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner className="h-6 w-6" />
        </div>
      ) : receipts.length === 0 ? (
        <EmptyState
          title="No receipts"
          description="Snap a photo of a receipt with your phone camera, or add one manually."
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {receipts.map((r) => (
            <ReceiptCard
              key={r.id}
              receipt={r}
              onClick={() => {
                setEditing(r);
                setOpen(true);
              }}
            />
          ))}
        </div>
      )}

      <ReceiptModal
        open={open}
        onClose={() => setOpen(false)}
        initial={editing}
        saving={create.isPending || update.isPending}
        reportId={reportId}
        onDelete={
          editing
            ? async () => {
                if (editing.imagePath) await deleteImage(editing.imagePath);
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
    </div>
  );
}

function ReceiptCard({ receipt, onClick }: { receipt: Receipt; onClick: () => void }) {
  const url = useImageUrl(receipt.imagePath);
  return (
    <button onClick={onClick} className="card flex gap-3 p-3 text-left hover:border-wls-red/40">
      <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-slate-100">
        {url ? (
          <img src={url} alt={receipt.vendor} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-300">🧾</div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex justify-between gap-2">
          <span className="truncate text-sm font-semibold text-wls-ink">
            {receipt.vendor || 'Unnamed receipt'}
          </span>
          <span className="text-sm font-bold text-wls-ink">{formatCurrency(receipt.amount)}</span>
        </div>
        <p className="text-xs text-slate-400">
          {formatDate(receipt.date)} · {receipt.category}
        </p>
        {receipt.notes && <p className="truncate text-xs text-slate-500">{receipt.notes}</p>}
      </div>
    </button>
  );
}

function ReceiptModal({
  open,
  onClose,
  initial,
  saving,
  reportId,
  onSave,
  onDelete,
}: {
  open: boolean;
  onClose: () => void;
  initial: Receipt | null;
  saving: boolean;
  reportId: string;
  onSave: (data: Omit<Receipt, 'id' | 'createdAt'>) => void;
  onDelete?: () => void;
}) {
  const uid = useUid();
  const [form, setForm] = useState(blank());
  const [uploading, setUploading] = useState(false);
  useResetForm(initial?.id ?? 'new', open, () =>
    setForm(initial ? stripMeta(initial) : blank()),
  );
  const url = useImageUrl(form.imagePath);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onPhoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const path = await uploadImage(uid, reportId, 'receipts', file);
      set('imagePath', path);
    } finally {
      setUploading(false);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    onSave({ ...form, amount: Number(form.amount) || 0 });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? 'Edit receipt' : 'Add receipt'}
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
          <button className="btn-primary" form="receipt-form" disabled={saving || uploading}>
            {saving && <Spinner className="h-4 w-4 text-white" />}
            Save
          </button>
        </>
      }
    >
      <form id="receipt-form" onSubmit={submit} className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
            {url ? (
              <img src={url} alt="receipt" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-2xl text-slate-300">
                🧾
              </div>
            )}
          </div>
          <label className="btn-secondary cursor-pointer">
            {uploading ? <Spinner className="h-4 w-4" /> : null}
            {form.imagePath ? 'Replace photo' : 'Attach photo'}
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={onPhoto} />
          </label>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Date">
            <input type="date" className="input" value={form.date ?? ''} onChange={(e) => set('date', e.target.value)} />
          </Field>
          <Field label="Amount ($)">
            <input type="number" step="0.01" className="input" value={form.amount} onChange={(e) => set('amount', Number(e.target.value))} />
          </Field>
          <Field label="Vendor / merchant">
            <input className="input" value={form.vendor} onChange={(e) => set('vendor', e.target.value)} />
          </Field>
          <Field label="Category">
            <select className="input" value={form.category} onChange={(e) => set('category', e.target.value as ExpenseCategory)}>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Payment method">
            <input className="input" placeholder="Visa 4284" value={form.paymentMethod} onChange={(e) => set('paymentMethod', e.target.value)} />
          </Field>
        </div>
        <Field label="Notes">
          <input className="input" value={form.notes} onChange={(e) => set('notes', e.target.value)} />
        </Field>
      </form>
    </Modal>
  );
}

function stripMeta(r: Receipt): Omit<Receipt, 'id' | 'createdAt'> {
  const { id: _id, createdAt: _c, imageUrl: _u, ...rest } = r;
  return rest;
}
