import { db, newId, nowIso, type RecurringFrequency, type RecurringRule } from './db';
import { isoDate } from './date';

const DAY_MS = 86400000;
const MAX_CATCH_UP = 12;

function toDayStart(value: string | Date): Date {
  const d = value instanceof Date ? new Date(value) : new Date(`${value}T00:00:00`);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function todayKey(): string {
  return isoDate(new Date());
}

/** Next run strictly after `from` for the given frequency. */
export function advanceRunDate(rule: Pick<RecurringRule, 'frequency' | 'dayOfMonth'>, from: string | Date): string {
  const base = toDayStart(from);
  if (rule.frequency === 'daily') {
    return isoDate(new Date(base.getTime() + DAY_MS));
  }
  if (rule.frequency === 'weekly') {
    return isoDate(new Date(base.getTime() + 7 * DAY_MS));
  }
  const day = Math.min(Math.max(rule.dayOfMonth || base.getDate(), 1), 28);
  const next = new Date(base.getFullYear(), base.getMonth() + 1, 1);
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(day, lastDay));
  return isoDate(next);
}

/**
 * Posts every due occurrence as a real transaction and advances the rule.
 * Runs at app boot per active profile. Returns the number of posted entries.
 */
export async function processRecurring(): Promise<number> {
  const today = todayKey();
  const rules = (await db.recurring.toArray()).filter((r) => r.isActive);
  let posted = 0;
  const ts = nowIso();

  for (const rule of rules) {
    let next = rule.nextRunDate;
    let guard = 0;
    let lastRun: string | undefined;
    const entries: string[] = [];

    while (next <= today && guard < MAX_CATCH_UP) {
      entries.push(next);
      lastRun = next;
      next = advanceRunDate(rule, next);
      guard += 1;
    }
    if (entries.length === 0) continue;

    for (const runDate of entries) {
      await db.transactions.put({
        id: `rec-${rule.id}-${runDate}-${newId().slice(0, 6)}`,
        type: rule.type,
        amount: rule.amount,
        currencyCode: rule.currencyCode,
        categoryId: rule.categoryId,
        accountId: rule.accountId,
        date: runDate,
        note: rule.note,
        paymentMethod: rule.paymentMethod,
        receiptPhotoPath: '',
        recurringId: rule.id,
        createdAt: ts,
        updatedAt: ts,
        deletedAt: '',
      });
      posted += 1;
    }

    await db.recurring.update(rule.id, { nextRunDate: next, lastRunDate: lastRun, updatedAt: ts });
  }

  return posted;
}

/** Active rules with a run date within the next `days` days (inclusive). */
export async function getDueSoon(days = 3): Promise<RecurringRule[]> {
  const today = todayKey();
  const horizon = isoDate(new Date(Date.now() + days * DAY_MS));
  const rules = (await db.recurring.toArray()).filter((r) => r.isActive);
  return rules
    .filter((r) => r.nextRunDate >= today && r.nextRunDate <= horizon)
    .sort((a, b) => String(a.nextRunDate).localeCompare(String(b.nextRunDate)));
}

export type { RecurringFrequency };
