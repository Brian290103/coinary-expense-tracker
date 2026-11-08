// Generates data/sample-profile-backup.json — deterministic KES demo ledger.
// Run manually:  node scripts/make-sample-backup.mjs
// Re-running produces byte-identical output (seeded PRNG).
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'data', 'sample-profile-backup.json');

// ---- seeded PRNG (mulberry32) ----
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20261108);
const int = (min, max) => min + Math.floor(rand() * (max - min + 1));
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

// ---- helpers ----
let seq = 0;
const uid = (p = 'seed') => `${p}-${String((seq += 1)).padStart(4, '0')}`;
const stamp = (date) => `${date}T09:00:00.000Z`;
const MONTHS = ['2026-07', '2026-08', '2026-09', '2026-10'];
const ts = '2026-07-01T09:00:00.000Z';

const tx = (o) => ({
  id: uid(),
  date: o.date,
  type: o.type,
  amount: o.amount,
  currencyCode: 'KES',
  categoryId: o.category,
  accountId: o.account,
  note: o.note || '',
  paymentMethod: o.method || '',
  receiptPhotoPath: '',
  createdAt: stamp(o.date),
  updatedAt: stamp(o.date),
  deletedAt: o.deletedAt || '',
});

const transactions = [];
const recur = (dates, make) => dates.forEach((date) => transactions.push(tx({ date, ...make(date) })));

// ---- fixed monthly flows ----
recur([...MONTHS, '2026-11'].map((m) => `${m}-01`), () => ({
  type: 'income', amount: 8500000, category: 'cat-salary', account: 'acc-bank',
  note: 'Monthly salary', method: 'Bank transfer',
}));
recur(MONTHS.map((m) => `${m}-03`), () => ({
  type: 'expense', amount: 2500000, category: 'cat-housing', account: 'acc-bank',
  note: 'Rent', method: 'Bank transfer',
}));
recur(MONTHS.map((m) => `${m}-05`), () => ({
  type: 'expense', amount: 1000000, category: 'cat-savings', account: 'acc-bank',
  note: 'Savings', method: 'Bank transfer',
}));
recur(MONTHS.map((m) => `${m}-15`), () => ({
  type: 'expense', amount: 110000, category: 'cat-subscriptions', account: 'acc-mobile-money',
  note: 'Netflix', method: 'Mobile money',
}));
recur(MONTHS.map((m) => `${m}-20`), () => ({
  type: 'expense', amount: int(200000, 350000), category: 'cat-utilities', account: 'acc-mobile-money',
  note: 'KPLC tokens', method: 'Mobile money',
}));
recur(MONTHS.map((m) => `${m}-25`), () => ({
  type: 'expense', amount: int(80000, 150000), category: 'cat-utilities', account: 'acc-mobile-money',
  note: 'Water bill', method: 'Mobile money',
}));
recur(MONTHS.map((m) => `${m}-28`), () => ({
  type: 'expense', amount: int(20000, 50000), category: 'cat-fees', account: 'acc-bank',
  note: 'Bank charges', method: 'Bank transfer',
}));

// ---- weekly groceries (Saturdays Jul 4 – Nov 7) ----
const saturdays = [];
{
  const d = new Date(2026, 6, 4);
  while (d <= new Date(2026, 10, 7)) {
    saturdays.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 7);
  }
}
recur(saturdays, () => ({
  type: 'expense', amount: int(300000, 900000), category: 'cat-groceries',
  account: pick(['acc-cash', 'acc-mobile-money', 'acc-mobile-money']),
  note: pick(['Weekly groceries', 'Market run', 'Supermarket shop', 'Mama mboga']),
  method: pick(['Cash', 'Mobile money', 'Mobile money']),
}));

// ---- weekday matatu fares ----
{
  const d = new Date(2026, 6, 1);
  const end = new Date(2026, 10, 7);
  while (d <= end) {
    const wd = d.getDay();
    const iso = d.toISOString().slice(0, 10);
    if (wd >= 1 && wd <= 5 && rand() < 0.55) {
      transactions.push(tx({
        date: iso, type: 'expense', amount: int(10000, 30000),
        category: 'cat-transport', account: 'acc-cash',
        note: pick(['Matatu fare', 'Matatu to office', 'Matatu to town']),
        method: 'Cash',
      }));
    }
    // weekly airtime top-up on Mondays
    if (wd === 1) {
      transactions.push(tx({
        date: iso, type: 'expense', amount: int(50000, 100000),
        category: 'cat-utilities', account: 'acc-mobile-money',
        note: 'Safaricom airtime', method: 'Mobile money',
      }));
    }
    d.setDate(d.getDate() + 1);
  }
}

// ---- discretionary spread ----
const discretionary = [
  { category: 'cat-food', notes: ['Lunch', 'Nyama choma', 'Coffee', 'Dinner out'], min: 80000, max: 450000, perMonth: 3 },
  { category: 'cat-shopping', notes: ['Clothes', 'Shoes', 'Household items'], min: 200000, max: 1200000, perMonth: 1 },
  { category: 'cat-health', notes: ['Pharmacy', 'Dentist'], min: 150000, max: 400000, perMonth: 1, months: ['2026-07', '2026-09'] },
  { category: 'cat-entertainment', notes: ['Movies', 'Concert', 'Games night'], min: 100000, max: 500000, perMonth: 2 },
  { category: 'cat-education', notes: ['School fees', 'Online course'], min: 1500000, max: 1500000, perMonth: 1, months: ['2026-08'] },
  { category: 'cat-travel', notes: ['Upcountry bus', 'SGR to Mombasa'], min: 250000, max: 350000, perMonth: 1, months: ['2026-10'] },
  { category: 'cat-gifts', notes: ['Birthday gift'], min: 300000, max: 300000, perMonth: 1, months: ['2026-09'] },
];
for (const g of discretionary) {
  for (const m of g.months || MONTHS) {
    for (let i = 0; i < g.perMonth; i += 1) {
      const day = String(int(2, 27)).padStart(2, '0');
      transactions.push(tx({
        date: `${m}-${day}`, type: 'expense', amount: int(g.min, g.max),
        category: g.category, account: pick(['acc-cash', 'acc-mobile-money', 'acc-bank']),
        note: pick(g.notes), method: pick(['Cash', 'Mobile money', 'Card']),
      }));
    }
  }
}

// ---- one-off income ----
transactions.push(tx({
  date: '2026-08-20', type: 'income', amount: 1500000, category: 'cat-freelance',
  account: 'acc-mobile-money', note: 'Logo design gig', method: 'Mobile money',
}));
transactions.push(tx({
  date: '2026-10-12', type: 'income', amount: 180000, category: 'cat-refunds',
  account: 'acc-mobile-money', note: 'M-Pesa reversal', method: 'Mobile money',
}));

// ---- current week (Nov 1–7) extras ----
transactions.push(tx({
  date: '2026-11-02', type: 'expense', amount: 250000, category: 'cat-food',
  account: 'acc-cash', note: 'Lunch', method: 'Cash',
}));
transactions.push(tx({
  date: '2026-11-05', type: 'expense', amount: 120000, category: 'cat-health',
  account: 'acc-mobile-money', note: 'Pharmacy', method: 'Mobile money',
}));

// ---- soft-deleted records (future Trash screen test data) ----
transactions.push(tx({
  date: '2026-10-31', type: 'expense', amount: 520000, category: 'cat-groceries',
  account: 'acc-cash', note: 'Weekly groceries (duplicate)', method: 'Cash',
  deletedAt: '2026-11-01T09:00:00.000Z',
}));
transactions.push(tx({
  date: '2026-09-14', type: 'expense', amount: 20000, category: 'cat-transport',
  account: 'acc-cash', note: 'Matatu fare (duplicate)', method: 'Cash',
  deletedAt: '2026-09-15T09:00:00.000Z',
}));

transactions.sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.id).localeCompare(String(b.id)));

// ---- budgets (Nov 2026) ----
const budgets = [
  ['cat-groceries', 2000000],
  ['cat-transport', 500000],
  ['cat-food', 800000],
  ['cat-entertainment', 500000],
].map(([categoryId, limitAmount], i) => ({
  id: `seed-bud-${i + 1}`,
  month: '2026-11',
  categoryId,
  limitAmount,
  currencyCode: 'KES',
  createdAt: '2026-11-01T09:00:00.000Z',
  updatedAt: '2026-11-01T09:00:00.000Z',
}));

// ---- goals (1 achieved, 1 in progress, 1 just started) ----
const goals = [
  {
    id: 'seed-goal-1',
    name: 'Emergency fund',
    targetAmount: 5000000,
    savedAmount: 5200000,
    icon: 'piggy-bank',
    color: '#34D399',
    deadline: '2026-12-31',
    createdAt: ts,
    updatedAt: ts,
  },
  {
    id: 'seed-goal-2',
    name: 'New phone',
    targetAmount: 4500000,
    savedAmount: 2700000,
    icon: 'smartphone',
    color: '#60A5FA',
    deadline: '2027-02-28',
    createdAt: ts,
    updatedAt: ts,
  },
  {
    id: 'seed-goal-3',
    name: 'December holiday',
    targetAmount: 6000000,
    savedAmount: 600000,
    icon: 'plane',
    color: '#22D3EE',
    deadline: '2026-12-20',
    createdAt: ts,
    updatedAt: ts,
  },
];

// ---- recurring rules (mixed active + paused) ----
const recurring = [
  {
    id: 'seed-rec-1',
    type: 'expense',
    amount: 2500000,
    currencyCode: 'KES',
    categoryId: 'cat-housing',
    accountId: 'acc-bank',
    note: 'Rent',
    paymentMethod: 'Bank transfer',
    frequency: 'monthly',
    dayOfMonth: 3,
    nextRunDate: '2026-12-03',
    isActive: true,
    createdAt: ts,
    updatedAt: ts,
  },
  {
    id: 'seed-rec-2',
    type: 'income',
    amount: 8500000,
    currencyCode: 'KES',
    categoryId: 'cat-salary',
    accountId: 'acc-bank',
    note: 'Monthly salary',
    paymentMethod: 'Bank transfer',
    frequency: 'monthly',
    dayOfMonth: 1,
    nextRunDate: '2026-12-01',
    isActive: true,
    createdAt: ts,
    updatedAt: ts,
  },
  {
    id: 'seed-rec-3',
    type: 'expense',
    amount: 600000,
    currencyCode: 'KES',
    categoryId: 'cat-groceries',
    accountId: 'acc-mobile-money',
    note: 'Weekly groceries',
    paymentMethod: 'Mobile money',
    frequency: 'weekly',
    nextRunDate: '2026-11-14',
    isActive: true,
    createdAt: ts,
    updatedAt: ts,
  },
  {
    id: 'seed-rec-4',
    type: 'expense',
    amount: 300000,
    currencyCode: 'KES',
    categoryId: 'cat-entertainment',
    accountId: 'acc-mobile-money',
    note: 'Gym membership',
    paymentMethod: 'Mobile money',
    frequency: 'monthly',
    dayOfMonth: 15,
    nextRunDate: '2026-11-15',
    lastRunDate: '2026-10-15',
    isActive: false,
    createdAt: ts,
    updatedAt: ts,
  },
];

// ---- accounts / settings ----
const accounts = [
  { id: 'acc-cash', name: 'Cash', type: 'cash', icon: 'banknote', color: '#34D399' },
  { id: 'acc-mobile-money', name: 'Mobile Money', type: 'mobile_money', icon: 'smartphone', color: '#A78BFA' },
  { id: 'acc-bank', name: 'Bank Account', type: 'bank', icon: 'landmark', color: '#60A5FA' },
].map((a) => ({ ...a, currencyCode: 'KES', isArchived: false, createdAt: ts, updatedAt: ts }));

// Default categories (mirrors src/lib/defaults.ts — same stable IDs so the
// import matches seeded categories instead of creating duplicates).
const DEFAULT_CATEGORIES = [
  ['cat-food', 'Food & Drinks', 'expense', 'utensils', '#F87171', 10],
  ['cat-groceries', 'Groceries', 'expense', 'shopping-basket', '#FBBF24', 20],
  ['cat-transport', 'Transport', 'expense', 'car', '#60A5FA', 30],
  ['cat-housing', 'Housing', 'expense', 'home', '#A78BFA', 40],
  ['cat-utilities', 'Utilities', 'expense', 'zap', '#F59E0B', 50],
  ['cat-shopping', 'Shopping', 'expense', 'shopping-bag', '#F472B6', 60],
  ['cat-health', 'Health', 'expense', 'heart-pulse', '#34D399', 70],
  ['cat-education', 'Education', 'expense', 'graduation-cap', '#38BDF8', 80],
  ['cat-entertainment', 'Entertainment', 'expense', 'film', '#C084FC', 90],
  ['cat-travel', 'Travel', 'expense', 'plane', '#22D3EE', 100],
  ['cat-gifts', 'Gifts', 'expense', 'gift', '#FB7185', 110],
  ['cat-subscriptions', 'Subscriptions', 'expense', 'repeat', '#818CF8', 120],
  ['cat-fees', 'Fees', 'expense', 'receipt', '#94A3B8', 130],
  ['cat-savings', 'Savings', 'expense', 'piggy-bank', '#2DD4BF', 140],
  ['cat-other-expense', 'Other', 'expense', 'circle-ellipsis', '#9CA3AF', 150],
  ['cat-salary', 'Salary', 'income', 'briefcase', '#34D399', 10],
  ['cat-freelance', 'Freelance', 'income', 'laptop', '#22D3EE', 20],
  ['cat-business', 'Business', 'income', 'building-2', '#60A5FA', 30],
  ['cat-investments', 'Investments', 'income', 'trending-up', '#A3E635', 40],
  ['cat-gifts-in', 'Gifts', 'income', 'gift', '#FB7185', 50],
  ['cat-refunds', 'Refunds', 'income', 'rotate-ccw', '#FBBF24', 60],
  ['cat-other-income', 'Other', 'income', 'circle-ellipsis', '#9CA3AF', 70],
].map(([id, name, type, icon, color, sortOrder]) => ({
  id, name, type, icon, color, isDefault: true, sortOrder, isArchived: false,
}));
const categories = DEFAULT_CATEGORIES.map((c) => ({ ...c, createdAt: ts, updatedAt: ts }));

const payload = {
  app: 'Coinary',
  format: 'coinary-backup',
  version: 1,
  exportedAt: '2026-11-08T00:00:00.000Z',
  data: {
    transactions,
    categories,
    accounts,
    budgets,
    goals,
    recurring,
    settings: [{
      id: 'app-settings',
      activeCurrencyCode: 'KES',
      locale: 'en-KE',
      theme: 'system',
      startOfWeek: 'monday',
      firstDayOfMonth: 1,
      biometricLockEnabled: false,
      onboarded: true,
      amountsVisible: true,
      createdAt: ts,
      updatedAt: ts,
    }],
  },
};

mkdirSync(join(ROOT, 'data'), { recursive: true });
writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`);
console.log(`wrote ${OUT}: ${transactions.length} transactions, ${categories.length} categories, ${budgets.length} budgets, ${goals.length} goals, ${recurring.length} recurring rules`);
