import { create } from 'zustand';
import type { AppSettings, Transaction, TxType } from '@/lib/db';

export interface ConfirmRequest {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
}

interface TxSheetState {
  open: boolean;
  transaction: Transaction | null;
  defaultType: TxType;
}

interface AppState {
  settings: AppSettings | null;
  setSettings: (settings: AppSettings | null) => void;
  txSheet: TxSheetState;
  openTxSheet: (transaction?: Transaction | null, defaultType?: TxType) => void;
  closeTxSheet: () => void;
  confirmRequest: ConfirmRequest | null;
  askConfirm: (request: ConfirmRequest) => void;
  closeConfirm: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  settings: null,
  setSettings: (settings) => set({ settings }),

  // Add / edit transaction sheet
  txSheet: { open: false, transaction: null, defaultType: 'expense' },
  openTxSheet: (transaction = null, defaultType = 'expense') =>
    set({ txSheet: { open: true, transaction, defaultType } }),
  closeTxSheet: () => set({ txSheet: { open: false, transaction: null, defaultType: 'expense' } }),

  // Generic confirm dialog
  confirmRequest: null,
  askConfirm: (request) => set({ confirmRequest: request }),
  closeConfirm: () => set({ confirmRequest: null }),
}));
