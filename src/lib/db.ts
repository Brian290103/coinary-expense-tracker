import Dexie, { type Table } from 'dexie';
import { DEFAULT_CATEGORIES, makeDefaultAccounts } from './defaults';

export type TxType = 'income' | 'expense';
export type ThemeName = 'system' | 'light' | 'dark';
export type StartOfWeek = 'sunday' | 'monday';

export interface Transaction {
  id: string;
  date: string;
  type: TxType;
  amount: number;
  currencyCode: string;
  categoryId: string;
  accountId: string;
  note: string;
  paymentMethod: string;
  receiptPhotoPath: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string;
}

export interface Category {
  id: string;
  name: string;
  type: TxType;
  icon: string;
  color: string;
  isDefault: boolean;
  sortOrder: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Account {
  id: string;
  name: string;
  type: string;
  icon: string;
  color: string;
  currencyCode: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Budget {
  id: string;
  month: string;
  categoryId: string;
  limitAmount: number;
  currencyCode: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  id: string;
  activeCurrencyCode: string;
  locale: string;
  theme: ThemeName;
  startOfWeek: StartOfWeek;
  firstDayOfMonth: number;
  biometricLockEnabled: boolean;
  onboarded: boolean;
  sidebarCollapsed?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Receipt {
  id: string;
  blob: Blob;
  createdAt: string;
}

class CoinaryDB extends Dexie {
  transactions!: Table<Transaction, string>;
  categories!: Table<Category, string>;
  accounts!: Table<Account, string>;
  budgets!: Table<Budget, string>;
  settings!: Table<AppSettings, string>;
  receipts!: Table<Receipt, string>;

  constructor() {
    super('coinary-ledger');
    this.version(1).stores({
      transactions: 'id, date, type, categoryId, accountId, createdAt, deletedAt',
      categories: 'id, type, sortOrder, name',
      accounts: 'id, name, type, isArchived',
      budgets: 'id, month, categoryId, [month+categoryId]',
      settings: 'id',
      receipts: 'id',
    });
  }
}

export const db = new CoinaryDB();

export const SETTINGS_ID = 'app-settings';

export const nowIso = (): string => new Date().toISOString();

export function newId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

type SettingsSeed = Omit<AppSettings, 'createdAt' | 'updatedAt'>;

export const DEFAULT_SETTINGS: SettingsSeed = {
  id: SETTINGS_ID,
  activeCurrencyCode: 'USD',
  locale: 'en-US',
  theme: 'dark',
  startOfWeek: 'monday',
  firstDayOfMonth: 1,
  biometricLockEnabled: false,
  onboarded: false,
};

let seedPromise: Promise<AppSettings | undefined> | null = null;

/** Seeds default categories + settings the first time the app opens. */
export function ensureSeeded(): Promise<AppSettings | undefined> {
  if (!seedPromise) {
    seedPromise = (async () => {
      const existing = await db.settings.get(SETTINGS_ID);
      if (existing) return existing;
      const ts = nowIso();
      const categories: Category[] = DEFAULT_CATEGORIES.map((c) => ({ ...c, createdAt: ts, updatedAt: ts }));
      await db.categories.bulkPut(categories);
      const locale = typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'en-US';
      const settings: AppSettings = { ...DEFAULT_SETTINGS, locale, createdAt: ts, updatedAt: ts };
      await db.settings.put(settings);
      return settings;
    })();
  }
  return seedPromise;
}

export async function seedAccountsForCurrency(currencyCode: string): Promise<void> {
  const count = await db.accounts.count();
  if (count > 0) return;
  const ts = nowIso();
  await db.accounts.bulkPut(
    makeDefaultAccounts(currencyCode).map((a) => ({ ...a, createdAt: ts, updatedAt: ts })),
  );
}

export async function updateSettings(patch: Partial<AppSettings>): Promise<AppSettings | undefined> {
  const next = { ...patch, updatedAt: nowIso() };
  await db.settings.update(SETTINGS_ID, next);
  return db.settings.get(SETTINGS_ID);
}

/** All live (non soft-deleted) transactions. */
export const liveTransactions = (): Promise<Transaction[]> =>
  db.transactions.filter((t) => !t.deletedAt).toArray();

export async function getLiveTransactionsArray(): Promise<Transaction[]> {
  return db.transactions.filter((t) => !t.deletedAt).toArray();
}

export type NewTransaction = Partial<Transaction> & { amount: number; date: string; type: TxType };

export async function addTransaction(data: NewTransaction): Promise<Transaction> {
  const ts = nowIso();
  const record: Transaction = {
    id: newId(),
    createdAt: ts,
    updatedAt: ts,
    deletedAt: '',
    note: '',
    paymentMethod: '',
    accountId: '',
    receiptPhotoPath: '',
    currencyCode: 'USD',
    categoryId: '',
    ...data,
  };
  await db.transactions.add(record);
  return record;
}

export async function saveTransaction(id: string, patch: Partial<Transaction>): Promise<void> {
  await db.transactions.update(id, { ...patch, updatedAt: nowIso() });
}

export async function softDeleteTransaction(id: string): Promise<void> {
  await db.transactions.update(id, { deletedAt: nowIso(), updatedAt: nowIso() });
}

export async function restoreTransaction(id: string): Promise<void> {
  await db.transactions.update(id, { deletedAt: '', updatedAt: nowIso() });
}

export async function putReceipt(blob: Blob): Promise<string> {
  const id = newId();
  await db.receipts.put({ id, blob, createdAt: nowIso() });
  return id;
}

export async function deleteReceipt(id: string | undefined): Promise<void> {
  if (!id) return;
  await db.receipts.delete(id);
}

export async function reassignTransactions(fromCategoryId: string, toCategoryId: string): Promise<void> {
  const targets = await db.transactions.where('categoryId').equals(fromCategoryId).toArray();
  await Promise.all(
    targets.map((t) => db.transactions.update(t.id, { categoryId: toCategoryId || '', updatedAt: nowIso() })),
  );
}

export async function clearAllData(): Promise<void> {
  await db.transaction('rw', db.transactions, db.categories, db.accounts, db.budgets, db.receipts, async () => {
    await Promise.all([
      db.transactions.clear(),
      db.categories.clear(),
      db.accounts.clear(),
      db.budgets.clear(),
      db.receipts.clear(),
    ]);
  });
}

export async function resetLedger({ keepSettings = true }: { keepSettings?: boolean } = {}): Promise<void> {
  await clearAllData();
  const ts = nowIso();
  await db.categories.bulkPut(DEFAULT_CATEGORIES.map((c) => ({ ...c, createdAt: ts, updatedAt: ts })));
  if (!keepSettings) {
    await db.settings.put({ ...DEFAULT_SETTINGS, createdAt: ts, updatedAt: ts });
  }
}
