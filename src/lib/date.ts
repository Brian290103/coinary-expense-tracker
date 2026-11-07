import {
  format, parseISO, isToday, isYesterday, differenceInCalendarDays, subMonths, isValid,
} from 'date-fns';
import type { Transaction } from './db';

export const monthKey = (input: Date | string = new Date()): string => {
  const d = typeof input === 'string' ? parseISO(input) : input;
  if (!isValid(d)) return format(new Date(), 'yyyy-MM');
  return format(d, 'yyyy-MM');
};

export const isoDate = (input: Date = new Date()): string => format(input, 'yyyy-MM-dd');

export function monthLabel(key: string, locale = 'en-US', opts: Intl.DateTimeFormatOptions = {}): string {
  const [y, m] = String(key).split('-').map(Number);
  if (!y || !m) return key;
  try {
    return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', ...opts }).format(new Date(y, m - 1, 1));
  } catch {
    return key;
  }
}

export function monthLabelShort(key: string, locale = 'en-US'): string {
  const [y, m] = String(key).split('-').map(Number);
  if (!y || !m) return key;
  try {
    return new Intl.DateTimeFormat(locale, { month: 'short' }).format(new Date(y, m - 1, 1));
  } catch {
    return key;
  }
}

export function recentMonthKeys(count = 6, from: Date = new Date()): string[] {
  return Array.from({ length: count }, (_, i) => monthKey(subMonths(from, count - 1 - i)));
}

export function shiftMonthKey(key: string, delta: number): string {
  const [y, m] = String(key).split('-').map(Number);
  return monthKey(new Date(y, m - 1 + delta, 1));
}

export function parseDateSafe(value: string | Date | undefined | null): Date {
  if (!value) return new Date();
  const d = value instanceof Date ? value : parseISO(String(value));
  return isValid(d) ? d : new Date();
}

export function dayLabel(value: string | Date, locale = 'en-US'): string {
  const d = parseDateSafe(value);
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  try {
    return new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short' }).format(d);
  } catch {
    return format(d, 'dd MMM');
  }
}

export function fullDate(value: string | Date, locale = 'en-US'): string {
  const d = parseDateSafe(value);
  try {
    return new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(d);
  } catch {
    return format(d, 'yyyy-MM-dd');
  }
}

export interface TxGroup {
  label: string;
  items: Transaction[];
}

/** Groups transactions into Today / Yesterday / This week / This month / Earlier. */
export function groupTransactions(transactions: Transaction[], locale = 'en-US'): TxGroup[] {
  void locale;
  const buckets = new Map<string, Transaction[]>();
  const order = ['Today', 'Yesterday', 'This week', 'This month', 'Earlier'];

  transactions.forEach((tx) => {
    const d = parseDateSafe(tx.date);
    let label: string;
    if (isToday(d)) label = 'Today';
    else if (isYesterday(d)) label = 'Yesterday';
    else {
      const diff = differenceInCalendarDays(new Date(), d);
      if (diff < 7) label = 'This week';
      else if (monthKey(d) === monthKey(new Date())) label = 'This month';
      else label = 'Earlier';
    }
    if (!buckets.has(label)) buckets.set(label, []);
    buckets.get(label)!.push(tx);
  });

  return order
    .filter((label) => buckets.has(label))
    .map((label) => ({ label, items: buckets.get(label)! }));
}
