import { useState } from 'react';
import { Image, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useUid } from '../../hooks/useUid';
import { useReceipts, useReceiptMutations } from '../../hooks/data';
import { useResetForm } from '../../hooks/useResetForm';
import { useImageUrl } from '../../hooks/useImageUrl';
import { uploadImage, deleteImage } from '../../lib/storage';
import { receiptsByCategory, receiptsTotal } from '../../lib/calc';
import { formatCurrency, formatDate, todayIso } from '../../lib/format';
import { EXPENSE_CATEGORIES, type ExpenseCategory, type Receipt } from '../../lib/types';
import { Button, Card, EmptyState, Field, Input, Spinner } from '../ui';
import { Sheet } from '../Sheet';

const blank = (): Omit<Receipt, 'id' | 'createdAt'> => ({
  date: todayIso(),
  vendor: '',
  category: 'Meals',
  amount: 0,
  paymentMethod: '',
  notes: '',
  imagePath: null,
});

export function ReceiptsSection({ reportId }: { reportId: string }) {
  const uid = useUid();
  const { data, isLoading } = useReceipts(reportId);
  const { create, update, remove } = useReceiptMutations(reportId);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Receipt | null>(null);
  const [busy, setBusy] = useState(false);

  const receipts = data ?? [];
  const byCat = receiptsByCategory(receipts).filter((c) => c.amount > 0);

  async function capture(fromCamera: boolean) {
    setBusy(true);
    try {
      if (fromCamera && Platform.OS !== 'web') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) return;
      }
      const result =
        fromCamera && Platform.OS !== 'web'
          ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.5 })
          : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.5 });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const path = await uploadImage(uid, reportId, 'receipts', asset.uri, asset.mimeType);
      const id = await create.mutateAsync({ ...blank(), imagePath: path });
      setEditing({ id, createdAt: Date.now(), ...blank(), imagePath: path });
      setOpen(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text className="text-sm text-slate-600">
        {receipts.length} receipts · {formatCurrency(receiptsTotal(receipts))}
      </Text>
      <View className="flex-row gap-2">
        <View className="flex-1">
          <Button
            title={Platform.OS === 'web' ? '📷 Add receipt' : '📷 Photo'}
            loading={busy}
            onPress={() => capture(true)}
          />
        </View>
        {Platform.OS !== 'web' && (
          <View className="flex-1">
            <Button title="🖼 Library" variant="secondary" onPress={() => capture(false)} />
          </View>
        )}
        <Button
          title="+ Manual"
          variant="secondary"
          onPress={() => {
            setEditing(null);
            setOpen(true);
          }}
        />
      </View>

      {byCat.length > 0 && (
        <View className="flex-row flex-wrap gap-2">
          {byCat.map((c) => (
            <View key={c.category} className="rounded-full bg-slate-100 px-3 py-1">
              <Text className="text-xs text-slate-600">
                {c.category}: {formatCurrency(c.amount)}
              </Text>
            </View>
          ))}
        </View>
      )}

      {isLoading ? (
        <Spinner />
      ) : receipts.length === 0 ? (
        <EmptyState title="No receipts" description="Snap a photo or add one manually." />
      ) : (
        receipts.map((r) => (
          <ReceiptRow
            key={r.id}
            receipt={r}
            onPress={() => {
              setEditing(r);
              setOpen(true);
            }}
          />
        ))
      )}

      <ReceiptSheet
        visible={open}
        onClose={() => setOpen(false)}
        reportId={reportId}
        initial={editing}
        saving={create.isPending || update.isPending}
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
    </ScrollView>
  );
}

function ReceiptRow({ receipt, onPress }: { receipt: Receipt; onPress: () => void }) {
  const url = useImageUrl(receipt.imagePath);
  return (
    <Pressable onPress={onPress}>
      <Card className="flex-row gap-3 p-3">
        <View className="h-16 w-16 overflow-hidden rounded-lg bg-slate-100">
          {url ? (
            <Image source={{ uri: url }} style={{ width: 64, height: 64 }} resizeMode="cover" />
          ) : (
            <View className="h-full w-full items-center justify-center">
              <Text className="text-xl text-slate-300">🧾</Text>
            </View>
          )}
        </View>
        <View className="flex-1">
          <View className="flex-row justify-between">
            <Text className="text-sm font-semibold text-wls-ink" numberOfLines={1}>
              {receipt.vendor || 'Unnamed receipt'}
            </Text>
            <Text className="text-sm font-bold text-wls-ink">{formatCurrency(receipt.amount)}</Text>
          </View>
          <Text className="text-xs text-slate-400">
            {formatDate(receipt.date)} · {receipt.category}
          </Text>
          {receipt.notes ? (
            <Text className="text-xs text-slate-500" numberOfLines={1}>
              {receipt.notes}
            </Text>
          ) : null}
        </View>
      </Card>
    </Pressable>
  );
}

function ReceiptSheet({
  visible,
  onClose,
  reportId,
  initial,
  saving,
  onSave,
  onDelete,
}: {
  visible: boolean;
  onClose: () => void;
  reportId: string;
  initial: Receipt | null;
  saving: boolean;
  onSave: (data: Omit<Receipt, 'id' | 'createdAt'>) => void;
  onDelete?: () => void;
}) {
  const uid = useUid();
  const [form, setForm] = useState(blank());
  const [uploading, setUploading] = useState(false);
  useResetForm(initial?.id ?? 'new', visible, () =>
    setForm(initial ? stripMeta(initial) : blank()),
  );
  const url = useImageUrl(form.imagePath);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function attach() {
    setUploading(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.5,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const path = await uploadImage(uid, reportId, 'receipts', asset.uri, asset.mimeType);
      set('imagePath', path);
    } finally {
      setUploading(false);
    }
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={initial ? 'Edit receipt' : 'Add receipt'}
      footer={
        <>
          {onDelete && <Button title="Delete" variant="ghost" onPress={onDelete} />}
          <Button title="Cancel" variant="secondary" onPress={onClose} />
          <Button
            title="Save"
            loading={saving}
            onPress={() => onSave({ ...form, amount: Number(form.amount) || 0 })}
          />
        </>
      }
    >
      <View className="mb-2 flex-row items-center gap-3">
        <View className="h-24 w-24 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
          {url ? (
            <Image source={{ uri: url }} style={{ width: 96, height: 96 }} resizeMode="cover" />
          ) : (
            <View className="h-full w-full items-center justify-center">
              <Text className="text-2xl text-slate-300">🧾</Text>
            </View>
          )}
        </View>
        <Button
          title={form.imagePath ? 'Replace photo' : 'Attach photo'}
          variant="secondary"
          loading={uploading}
          onPress={attach}
        />
      </View>
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Field label="Date" hint="YYYY-MM-DD">
            <Input value={form.date ?? ''} onChangeText={(v) => set('date', v)} />
          </Field>
        </View>
        <View className="flex-1">
          <Field label="Amount ($)">
            <Input
              keyboardType="numeric"
              value={String(form.amount)}
              onChangeText={(v) => set('amount', Number(v) || 0)}
            />
          </Field>
        </View>
      </View>
      <Field label="Vendor / merchant">
        <Input value={form.vendor} onChangeText={(v) => set('vendor', v)} />
      </Field>
      <Field label="Category">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {EXPENSE_CATEGORIES.map((c) => (
            <Pressable
              key={c}
              onPress={() => set('category', c as ExpenseCategory)}
              className={`rounded-full border px-3 py-1.5 ${
                form.category === c ? 'border-wls-red bg-wls-red/10' : 'border-slate-300'
              }`}
            >
              <Text className="text-xs text-wls-ink">{c}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </Field>
      <Field label="Payment method">
        <Input placeholder="Visa 4284" value={form.paymentMethod} onChangeText={(v) => set('paymentMethod', v)} />
      </Field>
      <Field label="Notes">
        <Input value={form.notes} onChangeText={(v) => set('notes', v)} />
      </Field>
    </Sheet>
  );
}

function stripMeta(r: Receipt): Omit<Receipt, 'id' | 'createdAt'> {
  const { id: _id, createdAt: _c, imageUrl: _u, ...rest } = r;
  return rest;
}
