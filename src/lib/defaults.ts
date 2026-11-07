import type { Account, Category, TxType } from './db';

// Default categories & accounts seeded once, on first launch.
type CategorySeed = Omit<Category, 'createdAt' | 'updatedAt'>;

const base = (
  id: string,
  name: string,
  type: TxType,
  icon: string,
  color: string,
  sortOrder: number,
): CategorySeed => ({
  id,
  name,
  type,
  icon,
  color,
  isDefault: true,
  sortOrder,
  isArchived: false,
});

export const DEFAULT_CATEGORIES: CategorySeed[] = [
  // Expense
  base('cat-food', 'Food & Drinks', 'expense', 'utensils', '#F87171', 10),
  base('cat-groceries', 'Groceries', 'expense', 'shopping-basket', '#FBBF24', 20),
  base('cat-transport', 'Transport', 'expense', 'car', '#60A5FA', 30),
  base('cat-housing', 'Housing', 'expense', 'home', '#A78BFA', 40),
  base('cat-utilities', 'Utilities', 'expense', 'zap', '#F59E0B', 50),
  base('cat-shopping', 'Shopping', 'expense', 'shopping-bag', '#F472B6', 60),
  base('cat-health', 'Health', 'expense', 'heart-pulse', '#34D399', 70),
  base('cat-education', 'Education', 'expense', 'graduation-cap', '#38BDF8', 80),
  base('cat-entertainment', 'Entertainment', 'expense', 'film', '#C084FC', 90),
  base('cat-travel', 'Travel', 'expense', 'plane', '#22D3EE', 100),
  base('cat-gifts', 'Gifts', 'expense', 'gift', '#FB7185', 110),
  base('cat-subscriptions', 'Subscriptions', 'expense', 'repeat', '#818CF8', 120),
  base('cat-fees', 'Fees', 'expense', 'receipt', '#94A3B8', 130),
  base('cat-savings', 'Savings', 'expense', 'piggy-bank', '#2DD4BF', 140),
  base('cat-other-expense', 'Other', 'expense', 'circle-ellipsis', '#9CA3AF', 150),
  // Income
  base('cat-salary', 'Salary', 'income', 'briefcase', '#34D399', 10),
  base('cat-freelance', 'Freelance', 'income', 'laptop', '#22D3EE', 20),
  base('cat-business', 'Business', 'income', 'building-2', '#60A5FA', 30),
  base('cat-investments', 'Investments', 'income', 'trending-up', '#A3E635', 40),
  base('cat-gifts-in', 'Gifts', 'income', 'gift', '#FB7185', 50),
  base('cat-refunds', 'Refunds', 'income', 'rotate-ccw', '#FBBF24', 60),
  base('cat-other-income', 'Other', 'income', 'circle-ellipsis', '#9CA3AF', 70),
];

type AccountSeed = Omit<Account, 'createdAt' | 'updatedAt'>;

export const makeDefaultAccounts = (currencyCode = 'USD'): AccountSeed[] =>
  [
    { id: 'acc-cash', name: 'Cash', type: 'cash', icon: 'banknote', color: '#34D399' },
    { id: 'acc-bank', name: 'Bank Account', type: 'bank', icon: 'landmark', color: '#60A5FA' },
  ].map((a) => ({
    ...a,
    currencyCode,
    isArchived: false,
  }));

export const ACCOUNT_TYPES: { value: string; label: string; icon: string }[] = [
  { value: 'cash', label: 'Cash', icon: 'banknote' },
  { value: 'bank', label: 'Bank', icon: 'landmark' },
  { value: 'mobile_money', label: 'Mobile money', icon: 'smartphone' },
  { value: 'card', label: 'Card', icon: 'credit-card' },
  { value: 'savings', label: 'Savings', icon: 'piggy-bank' },
  { value: 'other', label: 'Other', icon: 'wallet' },
];

export const PAYMENT_METHODS: string[] = ['Cash', 'Card', 'Bank transfer', 'Mobile money', 'Other'];

export const CATEGORY_COLORS: string[] = [
  '#34D399', '#F87171', '#FBBF24', '#60A5FA', '#A78BFA', '#F472B6',
  '#22D3EE', '#FB7185', '#A3E635', '#818CF8', '#2DD4BF', '#9CA3AF',
];
