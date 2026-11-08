import { create } from 'zustand';
import { updateSettings } from '@/lib/db';
import type { Profile } from '@/lib/profiles';
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

export type LockState = 'checking' | 'pin' | 'biometric' | 'unlocked';

interface AppState {
  settings: AppSettings | null;
  setSettings: (settings: AppSettings | null) => void;
  txSheet: TxSheetState;
  openTxSheet: (transaction?: Transaction | null, defaultType?: TxType) => void;
  closeTxSheet: () => void;
  confirmRequest: ConfirmRequest | null;
  askConfirm: (request: ConfirmRequest) => void;
  closeConfirm: () => void;
  viewTx: { open: boolean; transaction: Transaction | null };
  openViewTx: (transaction: Transaction) => void;
  closeViewTx: () => void;
  toggleAmountsVisibility: () => Promise<void>;
  activeProfileId: string | null;
  setActiveProfileId: (id: string | null) => void;
  activeProfile: Profile | null;
  setActiveProfile: (profile: Profile | null) => void;
  lockState: LockState;
  setLockState: (state: LockState) => void;
}

export const useAppStore = create<AppState>((set) => ({
  settings: null,
  setSettings: (settings) => set({ settings }),

  // Add / edit transaction sheet
  txSheet: { open: false, transaction: null, defaultType: 'expense' },
  openTxSheet: (transaction = null, defaultType = 'expense') =>
    set({ txSheet: { open: true, transaction, defaultType } }),
  closeTxSheet: () => set({ txSheet: { open: false, transaction: null, defaultType: 'expense' } }),

  // View transaction (read-only preview)
  viewTx: { open: false, transaction: null },
  openViewTx: (transaction: Transaction) =>
    set({ viewTx: { open: true, transaction } }),
  closeViewTx: () => set({ viewTx: { open: false, transaction: null } }),

  // Generic confirm dialog
  confirmRequest: null,
  askConfirm: (request) => set({ confirmRequest: request }),
  closeConfirm: () => set({ confirmRequest: null }),

  // Active profile (database scope)
  activeProfileId: null,
  setActiveProfileId: (id) => set({ activeProfileId: id }),
  activeProfile: null,
  setActiveProfile: (profile) => set({ activeProfile: profile, activeProfileId: profile?.id ?? null }),
  lockState: 'checking' as LockState,
  setLockState: (state) => set({ lockState: state }),

  // Amount privacy (persisted in settings)
  toggleAmountsVisibility: async () => {
    const current = useAppStore.getState().settings;
    const next = !(current?.amountsVisible ?? true);
    const updated = await updateSettings({ amountsVisible: next });
    if (updated) useAppStore.getState().setSettings(updated);
  },
}));
