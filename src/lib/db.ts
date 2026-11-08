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
  recurringId?: string;
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

export interface TxFilters {
  categoryId: string;
  accountId: string;
  paymentMethods: string[];
  minAmount?: number;
  maxAmount?: number;
  from: string;
  to: string;
}

export interface FilterPreset {
  id: string;
  name: string;
  filters: TxFilters;
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
  amountsVisible?: boolean;
  autoBackupEnabled?: boolean;
  autoBackupFrequency?: 'daily' | 'weekly';
  lastBackupAt?: string;
  profileLockEnabled?: boolean;
  profilePinHash?: string;
  profilePinSalt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Receipt {
  id: string;
  blob: Blob;
  createdAt: string;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  icon: string;
  color: string;
  deadline?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export const LEGACY_DB_NAME = 'coinary-ledger';

/** Database name for a profile. The very first profile reuses the legacy name. */
export function profileDbName(profileId: string): string {
  return profileId === 'personal' ? LEGACY_DB_NAME : `coinary-ledger-${profileId}`;
}

export type RecurringFrequency = 'daily' | 'weekly' | 'monthly';

export interface RecurringRule {
  id: string;
  type: TxType;
  amount: number;
  currencyCode: string;
  categoryId: string;
  accountId: string;
  note: string;
  paymentMethod: string;
  frequency: RecurringFrequency;
  dayOfMonth?: number;
  nextRunDate: string;
  lastRunDate?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export class CoinaryDB extends Dexie {
  transactions!: Table<Transaction, string>;
  categories!: Table<Category, string>;
  accounts!: Table<Account, string>;
  budgets!: Table<Budget, string>;
  settings!: Table<AppSettings, string>;
  receipts!: Table<Receipt, string>;
  goals!: Table<Goal, string>;
  recurring!: Table<RecurringRule, string>;
  filterPresets!: Table<FilterPreset, string>;

  constructor(dbName = LEGACY_DB_NAME) {
    super(dbName);
    this.version(1).stores({
      transactions: 'id, date, type, categoryId, accountId, createdAt, deletedAt',
      categories: 'id, type, sortOrder, name',
      accounts: 'id, name, type, isArchived',
      budgets: 'id, month, categoryId, [month+categoryId]',
      settings: 'id',
      receipts: 'id',
    });
    this.version(2).stores({
      transactions: 'id, date, type, categoryId, accountId, createdAt, deletedAt',
      categories: 'id, type, sortOrder, name',
      accounts: 'id, name, type, isArchived',
      budgets: 'id, month, categoryId, [month+categoryId]',
      settings: 'id',
      receipts: 'id',
      goals: 'id, createdAt',
    });
    this.version(3).stores({
      transactions: 'id, date, type, categoryId, accountId, createdAt, deletedAt, recurringId',
      categories: 'id, type, sortOrder, name',
      accounts: 'id, name, type, isArchived',
      budgets: 'id, month, categoryId, [month+categoryId]',
      settings: 'id',
      receipts: 'id',
      goals: 'id, createdAt',
      recurring: 'id, isActive, nextRunDate',
    });
    // v3 indexed a boolean (isActive), which IndexedDB rejects as a key.
    // v4 drops that index — active rules are filtered in JS instead.
    this.version(4).stores({
      transactions: 'id, date, type, categoryId, accountId, createdAt, deletedAt, recurringId',
      categories: 'id, type, sortOrder, name',
      accounts: 'id, name, type, isArchived',
      budgets: 'id, month, categoryId, [month+categoryId]',
      settings: 'id',
      receipts: 'id',
      goals: 'id, createdAt',
      recurring: 'id, nextRunDate',
    });
    // v5 adds saved filter presets (per profile).
    this.version(5).stores({
      transactions: 'id, date, type, categoryId, accountId, createdAt, deletedAt, recurringId',
      categories: 'id, type, sortOrder, name',
      accounts: 'id, name, type, isArchived',
      budgets: 'id, month, categoryId, [month+categoryId]',
      settings: 'id',
      receipts: 'id',
      goals: 'id, createdAt',
      recurring: 'id, nextRunDate',
      filterPresets: 'id, createdAt',
    });
  }
}

/** Active profile's database. Reassigned on profile switch (ES live binding). */
export let db: CoinaryDB = new CoinaryDB(LEGACY_DB_NAME);

/** Point the shared `db` binding at another profile's database. */
export function openProfileDatabase(profileId: string): CoinaryDB {
  try {
    db.close();
  } catch {
    // Ignore — freshly constructed instances may already be closed.
  }
  db = new CoinaryDB(profileDbName(profileId));
  return db;
}

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
  theme: 'system',
  startOfWeek: 'monday',
  firstDayOfMonth: 1,
  biometricLockEnabled: false,
  onboarded: false,
  amountsVisible: true,
};

const seedPromises = new Map<string, Promise<AppSettings | undefined>>();

/** Seeds default categories + settings the first time a profile's DB opens. */
export function ensureSeeded(currencyCode?: string): Promise<AppSettings | undefined> {
  const key = db.name;
  const cached = seedPromises.get(key);
  if (cached) return cached;
  const promise = (async () => {
    const existing = await db.settings.get(SETTINGS_ID);
    if (existing) return existing;
    const ts = nowIso();
    const categories: Category[] = DEFAULT_CATEGORIES.map((c) => ({ ...c, createdAt: ts, updatedAt: ts }));
    await db.categories.bulkPut(categories);
    const locale = typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'en-US';
    const settings: AppSettings = {
      ...DEFAULT_SETTINGS,
      activeCurrencyCode: currencyCode || DEFAULT_SETTINGS.activeCurrencyCode,
      locale,
      createdAt: ts,
      updatedAt: ts,
    };
    await db.settings.put(settings);
    return settings;
  })();
  seedPromises.set(key, promise);
  return promise;
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
  await db.transaction('rw', db.goals, db.recurring, async () => {
    await Promise.all([db.goals.clear(), db.recurring.clear()]);
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
