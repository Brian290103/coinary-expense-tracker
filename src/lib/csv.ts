import Papa from 'papaparse';
import { db, nowIso, type Account, type Category, type Transaction, type TxType } from './db';
import { decimalsFor } from './currencies';
import { fromMinor, toMinor } from './money';
import { CATEGORY_COLORS } from './defaults';

export const CSV_COLUMNS = ['date', 'type', 'amount', 'currency', 'category', 'account', 'payment_method', 'note'];

type CsvRow = Record<(typeof CSV_COLUMNS)[number], string>;

export function buildCsv(
  transactions: Transaction[] | undefined | null,
  categories: Category[] | undefined | null,
  accounts: Account[] | undefined | null,
  currency: string,
): string {
  const catName = new Map((categories || []).map((c) => [c.id, c.name]));
  const accName = new Map((accounts || []).map((a) => [a.id, a.name]));

  const rows: CsvRow[] = [...(transactions || [])]
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .map((t) => {
      const code = t.currencyCode || currency;
      return {
        date: t.date,
        type: t.type,
        amount: fromMinor(t.amount, code).toFixed(decimalsFor(code)),
        currency: code,
        category: catName.get(t.categoryId) || '',
        account: accName.get(t.accountId) || '',
        payment_method: t.paymentMethod || '',
        note: t.note || '',
      };
    });

  return Papa.unparse({ fields: CSV_COLUMNS, data: rows.map((r) => CSV_COLUMNS.map((c) => r[c])) });
}

export function downloadFile(filename: string, content: string, mime = 'text/csv;charset=utf-8'): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

type RawRecord = Record<string, unknown>;

const normalizeKeys = (raw: RawRecord | null | undefined): Record<string, string> =>
  Object.entries(raw || {}).reduce<Record<string, string>>((acc, [key, value]) => {
    const k = String(key).trim().toLowerCase().replace(/\s+/g, '_');
    acc[k] = value === null || value === undefined ? '' : String(value).trim();
    return acc;
  }, {});

const parseDateValue = (value: unknown): string | null => {
  const text = String(value || '').trim();
  if (!text) return null;
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(text);
  if (iso) {
    const [, y, m, d] = iso;
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return null;
  const y = parsed.getFullYear();
  const m = String(parsed.getMonth() + 1).padStart(2, '0');
  const d = String(parsed.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export interface ParsedCsv {
  rows: Record<string, string>[];
  errors: string[];
}

export function parseCsvText(text: string): ParsedCsv {
  const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: 'greedy' });
  const rows = (parsed.data || []).filter((r) => r && Object.keys(r).length > 0).map(normalizeKeys);
  const errors = (parsed.errors || []).map((e) => e.message);
  return { rows, errors };
}

export interface ValidRow {
  rowNumber: number;
  date: string;
  type: TxType;
  amount: number;
  amountText: string;
  currency: string;
  category: string;
  account: string;
  paymentMethod: string;
  note: string;
}

export interface InvalidRow {
  index: number;
  reason: string;
}

export function validateRows(rows: Record<string, string>[]): { valid: ValidRow[]; invalid: InvalidRow[] } {
  const valid: ValidRow[] = [];
  const invalid: InvalidRow[] = [];

  rows.forEach((row, index) => {
    const date = parseDateValue(row.date);
    const type = String(row.type || '').toLowerCase();
    const amountText = String(row.amount || '').replace(/[^\d.,-]/g, '').replace(/,/g, '.');
    const amountNumber = Number(amountText);

    if (!date) {
      invalid.push({ index: index + 1, reason: 'Invalid or missing date' });
      return;
    }
    if (type !== 'income' && type !== 'expense') {
      invalid.push({ index: index + 1, reason: 'Type must be income or expense' });
      return;
    }
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      invalid.push({ index: index + 1, reason: 'Amount must be greater than zero' });
      return;
    }
    if (!row.category) {
      invalid.push({ index: index + 1, reason: 'Category is required' });
      return;
    }

    valid.push({
      rowNumber: index + 1,
      date,
      type: type as TxType,
      amount: amountNumber,
      amountText,
      currency: (row.currency || '').toUpperCase(),
      category: row.category,
      account: row.account || '',
      paymentMethod: row.payment_method || row.paymentmethod || '',
      note: row.note || '',
    });
  });

  return { valid, invalid };
}

interface ImportOptions {
  createMissingCategories: boolean;
  activeCurrency: string;
}

export async function importCsvRows(validRows: ValidRow[], { createMissingCategories, activeCurrency }: ImportOptions): Promise<{ imported: number; skipped: number }> {
  const categories = await db.categories.toArray();
  const accounts = await db.accounts.toArray();
  const existing = await db.transactions.filter((t) => !t.deletedAt).toArray();

  const catLookup = new Map(categories.map((c) => [`${c.type}|${c.name.trim().toLowerCase()}`, c]));
  const accLookup = new Map(accounts.map((a) => [a.name.trim().toLowerCase(), a]));
  const dedupe = new Set(
    existing.map((t) => `${t.date}|${t.type}|${t.amount}|${(t.note || '').trim().toLowerCase()}`),
  );

  let imported = 0;
  let skipped = 0;
  const ts = nowIso();

  for (let i = 0; i < validRows.length; i += 1) {
    const row = validRows[i];
    const code = row.currency || activeCurrency;
    const amountMinor = toMinor(row.amount, code);
    const key = `${row.date}|${row.type}|${amountMinor}|${row.note.toLowerCase()}`;
    if (dedupe.has(key)) {
      skipped += 1;
      continue;
    }

    let category = catLookup.get(`${row.type}|${row.category.trim().toLowerCase()}`);
    if (!category && createMissingCategories) {
      category = {
        id: `cat-custom-${Date.now().toString(36)}-${i}`,
        name: row.category.trim().slice(0, 40),
        type: row.type,
        icon: row.type === 'income' ? 'briefcase' : 'tag',
        color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
        isDefault: false,
        isArchived: false,
        sortOrder: 500 + i,
        createdAt: ts,
        updatedAt: ts,
      };
      await db.categories.put(category);
      catLookup.set(`${category.type}|${category.name.toLowerCase()}`, category);
    }

    const fallbackId = row.type === 'income' ? 'cat-other-income' : 'cat-other-expense';
    const account = row.account ? accLookup.get(row.account.trim().toLowerCase()) : null;

    await db.transactions.put({
      id: `imp-${Date.now().toString(36)}-${i}-${Math.random().toString(36).slice(2, 7)}`,
      type: row.type,
      amount: amountMinor,
      currencyCode: code,
      categoryId: category ? category.id : fallbackId,
      accountId: account ? account.id : '',
      date: row.date,
      note: row.note,
      paymentMethod: row.paymentMethod,
      receiptPhotoPath: '',
      createdAt: ts,
      updatedAt: ts,
      deletedAt: '',
    });
    dedupe.add(key);
    imported += 1;
  }

  return { imported, skipped };
}

export interface BackupPayload {
  app: string;
  format: string;
  version: number;
  exportedAt: string;
  data: {
    transactions: Transaction[];
    categories: Category[];
    accounts: Account[];
    budgets: import('./db').Budget[];
    goals: import('./db').Goal[];
    recurring: import('./db').RecurringRule[];
    settings: import('./db').AppSettings[];
  };
}

export async function buildBackup(): Promise<BackupPayload> {
  const [transactions, categories, accounts, budgets, goals, recurring, settings] = await Promise.all([
    db.transactions.toArray(),
    db.categories.toArray(),
    db.accounts.toArray(),
    db.budgets.toArray(),
    db.goals.toArray(),
    db.recurring.toArray(),
    db.settings.toArray(),
  ]);
  return {
    app: 'Coinary',
    format: 'coinary-backup',
    version: 1,
    exportedAt: nowIso(),
    data: { transactions, categories, accounts, budgets, goals, recurring, settings },
  };
}

export async function restoreBackup(payload: BackupPayload, { replace = false }: { replace?: boolean } = {}): Promise<{ transactions: number; categories: number; accounts: number; budgets: number; goals: number; recurring: number }> {
  if (!payload || payload.format !== 'coinary-backup' || !payload.data) {
    throw new Error('This file is not a Coinary backup');
  }
  const { transactions = [], categories = [], accounts = [], budgets = [], goals = [], recurring = [], settings = [] } = payload.data;

  // Dexie caps a transaction at 5 tables, so goals/recurring go in a second one.
  await db.transaction('rw', db.transactions, db.categories, db.accounts, db.budgets, db.settings, async () => {
    if (replace) {
      await Promise.all([
        db.transactions.clear(),
        db.categories.clear(),
        db.accounts.clear(),
        db.budgets.clear(),
      ]);
    }
    await db.categories.bulkPut(categories);
    await db.accounts.bulkPut(accounts);
    await db.budgets.bulkPut(budgets);
    await db.transactions.bulkPut(transactions);
    if (settings.length) {
      const current = await db.settings.get('app-settings');
      await db.settings.bulkPut(settings.map((s) => ({ ...s, onboarded: true })));
      if (current && !settings.some((s) => s.id === current.id)) {
        await db.settings.put({ ...current, onboarded: true });
      }
    }
  });
  await db.transaction('rw', db.goals, db.recurring, async () => {
    if (replace) {
      await Promise.all([db.goals.clear(), db.recurring.clear()]);
    }
    await db.goals.bulkPut(goals);
    await db.recurring.bulkPut(recurring);
  });

  return {
    transactions: transactions.length,
    categories: categories.length,
    accounts: accounts.length,
    budgets: budgets.length,
    goals: goals.length,
    recurring: recurring.length,
  };
}

export const csvTemplate = (): string =>
  `${CSV_COLUMNS.join(',')}\n2026-01-15,expense,12.50,USD,Food & Drinks,Cash,Card,Coffee`;
