import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Pause, Play, Plus, Repeat } from 'lucide-react';
import { toast } from 'sonner';
import { db, type RecurringRule } from '@/lib/db';
import { todayKey } from '@/lib/recurring';
import { useAppStore } from '@/store/useAppStore';
import { formatMasked } from '@/lib/privacy';
import { useAmountsVisible } from '@/hooks/useAmountsVisible';
import { fullDate } from '@/lib/date';
import PageHeader from '@/components/PageHeader';
import RecurringSheet from '@/components/RecurringSheet';
import CategoryIcon from '@/components/CategoryIcon';
import EmptyState from '@/components/EmptyState';
import { cn } from '@/lib/utils';

const FREQUENCY_LABEL: Record<RecurringRule['frequency'], string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
};

export default function Recurring() {
  const settings = useAppStore((s) => s.settings);
  const currency = settings?.activeCurrencyCode || 'USD';
  const locale = settings?.locale || 'en-US';
  const visible = useAmountsVisible();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringRule | null>(null);

  const rules = useLiveQuery(() => db.recurring.orderBy('nextRunDate').toArray(), [], []);
  const categories = useLiveQuery(() => db.categories.toArray(), [], []);
  const accounts = useLiveQuery(() => db.accounts.toArray(), [], []);

  const categoryMap = useMemo(
    () => new Map((categories || []).map((c) => [c.id, c])),
    [categories],
  );
  const accountMap = useMemo(() => new Map((accounts || []).map((a) => [a.id, a])), [accounts]);

  const toggleActive = async (rule: RecurringRule): Promise<void> => {
    await db.recurring.update(rule.id, { isActive: !rule.isActive, updatedAt: new Date().toISOString() });
    toast.success(rule.isActive ? 'Rule paused' : 'Rule resumed');
  };

  return (
    <div>
      <PageHeader
        title="Recurring"
        subtitle="Posted automatically on schedule"
        action={
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setSheetOpen(true);
            }}
            aria-label="New recurring rule"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground"
          >
            <Plus size={18} />
          </button>
        }
      />

      {!rules ? (
        <div className="mt-4 animate-pulse space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 rounded-3xl bg-secondary" />
          ))}
        </div>
      ) : rules.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={Repeat}
            title="Nothing repeats yet"
            description="Rent, subscriptions, salary — set it once and Coinary logs it on schedule."
            action={
              <button
                type="button"
                onClick={() => {
                  setEditing(null);
                  setSheetOpen(true);
                }}
                className="inline-flex h-11 items-center gap-2 rounded-2xl bg-primary px-5 text-[14px] font-semibold text-primary-foreground"
              >
                <Plus size={16} /> New rule
              </button>
            }
          />
        </div>
      ) : (
        <div className="space-y-2.5">
          {rules.map((rule) => {
            const cat = categoryMap.get(rule.categoryId);
            const overdue = rule.isActive && rule.nextRunDate < todayKey();
            return (
              <div
                key={rule.id}
                className={cn('surface flex items-center gap-3 p-3.5', !rule.isActive && 'opacity-60')}
              >
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${cat?.color || '#9CA3AF'}22`, color: cat?.color || '#9CA3AF' }}
                >
                  <CategoryIcon name={cat?.icon} size={17} />
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(rule);
                    setSheetOpen(true);
                  }}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="truncate text-[14px] font-semibold">
                    {rule.note || cat?.name || (rule.type === 'income' ? 'Income' : 'Expense')}
                  </p>
                  <p className="mt-0.5 truncate text-[11.5px] text-muted-foreground">
                    {FREQUENCY_LABEL[rule.frequency]} · {accountMap.get(rule.accountId)?.name || 'Account'} ·{' '}
                    {overdue ? 'posting…' : `next ${fullDate(rule.nextRunDate, locale)}`}
                  </p>
                </button>
                <span
                  className={cn(
                    'tnum shrink-0 text-[13.5px] font-semibold',
                    rule.type === 'income' ? 'text-income' : 'text-expense',
                  )}
                >
                  {formatMasked(rule.amount, rule.currencyCode || currency, locale, visible)}
                </span>
                <button
                  type="button"
                  onClick={() => void toggleActive(rule)}
                  aria-label={rule.isActive ? 'Pause rule' : 'Resume rule'}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  {rule.isActive ? <Pause size={16} /> : <Play size={16} />}
                </button>
              </div>
            );
          })}
        </div>
      )}

      <RecurringSheet open={sheetOpen} onClose={() => setSheetOpen(false)} rule={editing} />
    </div>
  );
}
