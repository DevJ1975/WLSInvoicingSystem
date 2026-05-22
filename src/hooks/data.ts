import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as db from '../lib/db';
import { useUid } from './useUid';
import type {
  AppSettings,
  Client,
  ExpenseReport,
  MileageTrip,
  Profile,
  Receipt,
  WorkLogEntry,
} from '../lib/types';

// ---- Profile & settings -------------------------------------------------

export function useProfile() {
  const uid = useUid();
  return useQuery({ queryKey: ['profile', uid], queryFn: () => db.getProfile(uid) });
}

export function useSaveProfile() {
  const uid = useUid();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (profile: Profile) => db.saveProfile(uid, profile),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile', uid] }),
  });
}

export function useSettings() {
  const uid = useUid();
  return useQuery({ queryKey: ['settings', uid], queryFn: () => db.getSettings(uid) });
}

export function useSaveSettings() {
  const uid = useUid();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (settings: AppSettings) => db.saveSettings(uid, settings),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings', uid] }),
  });
}

// ---- Clients ------------------------------------------------------------

export function useClients() {
  const uid = useUid();
  return useQuery({ queryKey: ['clients', uid], queryFn: () => db.listClients(uid) });
}

export function useClientMutations() {
  const uid = useUid();
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['clients', uid] });
  return {
    create: useMutation({
      mutationFn: (data: Omit<Client, 'id' | 'createdAt'>) => db.createClient(uid, data),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, data }: { id: string; data: Partial<Client> }) =>
        db.updateClient(uid, id, data),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: string) => db.deleteClient(uid, id),
      onSuccess: invalidate,
    }),
  };
}

// ---- Reports ------------------------------------------------------------

export function useReports() {
  const uid = useUid();
  return useQuery({ queryKey: ['reports', uid], queryFn: () => db.listReports(uid) });
}

export function useReport(reportId: string) {
  const uid = useUid();
  return useQuery({
    queryKey: ['report', uid, reportId],
    queryFn: () => db.getReport(uid, reportId),
    enabled: Boolean(reportId),
  });
}

export function useReportMutations() {
  const uid = useUid();
  const qc = useQueryClient();
  const invalidate = (reportId?: string) => {
    qc.invalidateQueries({ queryKey: ['reports', uid] });
    if (reportId) qc.invalidateQueries({ queryKey: ['report', uid, reportId] });
  };
  return {
    create: useMutation({
      mutationFn: (data: Partial<ExpenseReport>) => db.createReport(uid, data),
      onSuccess: () => invalidate(),
    }),
    update: useMutation({
      mutationFn: ({ id, data }: { id: string; data: Partial<ExpenseReport> }) =>
        db.updateReport(uid, id, data).then(() => db.recomputeReportTotals(uid, id)),
      onSuccess: (_r, vars) => invalidate(vars.id),
    }),
    remove: useMutation({
      mutationFn: (id: string) => db.deleteReport(uid, id),
      onSuccess: () => invalidate(),
    }),
  };
}

// ---- Work log -----------------------------------------------------------

export function useWorkLog(reportId: string) {
  const uid = useUid();
  return useQuery({
    queryKey: ['workLog', uid, reportId],
    queryFn: () => db.listWorkLog(uid, reportId),
    enabled: Boolean(reportId),
  });
}

export function useWorkLogMutations(reportId: string) {
  const uid = useUid();
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['workLog', uid, reportId] });
  return {
    create: useMutation({
      mutationFn: (data: Omit<WorkLogEntry, 'id' | 'createdAt'>) =>
        db.createWorkLog(uid, reportId, data),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, data }: { id: string; data: Partial<WorkLogEntry> }) =>
        db.updateWorkLog(uid, reportId, id, data),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: string) => db.deleteWorkLog(uid, reportId, id),
      onSuccess: invalidate,
    }),
  };
}

// ---- Receipts -----------------------------------------------------------

export function useReceipts(reportId: string) {
  const uid = useUid();
  return useQuery({
    queryKey: ['receipts', uid, reportId],
    queryFn: () => db.listReceipts(uid, reportId),
    enabled: Boolean(reportId),
  });
}

export function useReceiptMutations(reportId: string) {
  const uid = useUid();
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['receipts', uid, reportId] });
    qc.invalidateQueries({ queryKey: ['report', uid, reportId] });
    qc.invalidateQueries({ queryKey: ['reports', uid] });
  };
  return {
    create: useMutation({
      mutationFn: (data: Omit<Receipt, 'id' | 'createdAt'>) =>
        db.createReceipt(uid, reportId, data),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, data }: { id: string; data: Partial<Receipt> }) =>
        db.updateReceipt(uid, reportId, id, data),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: string) => db.deleteReceipt(uid, reportId, id),
      onSuccess: invalidate,
    }),
  };
}

// ---- Mileage ------------------------------------------------------------

export function useMileage(reportId: string) {
  const uid = useUid();
  return useQuery({
    queryKey: ['mileage', uid, reportId],
    queryFn: () => db.listMileage(uid, reportId),
    enabled: Boolean(reportId),
  });
}

export function useMileageMutations(reportId: string) {
  const uid = useUid();
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['mileage', uid, reportId] });
    qc.invalidateQueries({ queryKey: ['report', uid, reportId] });
    qc.invalidateQueries({ queryKey: ['reports', uid] });
  };
  return {
    create: useMutation({
      mutationFn: (data: Omit<MileageTrip, 'id' | 'createdAt'>) =>
        db.createMileage(uid, reportId, data),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, data }: { id: string; data: Partial<MileageTrip> }) =>
        db.updateMileage(uid, reportId, id, data),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: string) => db.deleteMileage(uid, reportId, id),
      onSuccess: invalidate,
    }),
  };
}
