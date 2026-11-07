import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Target } from 'lucide-react';
import { db, type Budget, type Category } from '@/lib/db';
import { useAppStore } from '@/store/useAppStore';
import { formatMoney } from '@/lib/money';
import { monthKey, monthLabel, shiftMonthKey } from '@/lib/date';
import PageHeader from '@/components/PageHeader';
import MonthSwitcher from '@/components/MonthSwitcher';
import BudgetBar from '@/components/BudgetBar';
import BudgetSheet from '@/components/BudgetSheet';
import EmptyState from '@/components/EmptyState';
import { cn } from '@/lib/utils';

export default function Budgets() {
  const settings = useAppStore((s) => s.settings);
  const currency = settings?.activeCurrencyCode || 'USD';
  const locale = settings?.locale || 'en-US';
  const current = monthKey(new Date());

  const [month, setMonth] = useState(current);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Budget | null>(null);

  const budgets = useLiveQuery(() => db.budgets.where('month').equals(month).toArray(), [month], []);
  const categories = useLiveQuery(() => db.categories.toArray(), [], []);
  const transactions = useLiveQuery(() => db.transactions.filter((t) => !t.deletedAt).toArray(), []);

  const categoryMap = useMemo(() => new Map<string, Category>((categories || []).map((c) => [c.id, c])), [categories]);

  const { spentByCategory, totalSpent }: { spentByCategory: Record<string, number>; totalSpent: number } = useMemo(() => {
    const map: Record<string, number> = {};
    let total = 0;
    (transactions || []).forEach((t) => {
      if (t.type !== 'expense') return;
      if (String(t.date || '').slice(0, 7) !== month) return;
      map[t.categoryId] = (map[t.categoryId] || 0) + t.amount;
      total += t.amount;
    });
    return { spentByCategory: map, totalSpent: total };
  }, [transactions, month]);

  const rows: { budget: Budget; category: Category; spent: number }[] = (budgets || [])
    .map((b) => ({ budget: b, category: categoryMap.get(b.categoryId), spent: spentByCategory[b.categoryId] || 0 }))
    .filter((r): r is { budget: Budget; category: Category; spent: number } => Boolean(r.category))
    .sort((a, b) => b.spent / Math.max(b.budget.limitAmount, 1) - a.spent / Math.max(a.budget.limitAmount, 1));

  const totalBudget = rows.reduce((sum, r) => sum + (Number(r.budget.limitAmount) || 0), 0);
  const totalBudgetSpent = rows.reduce((sum, r) => sum + r.spent, 0);
  const remaining = totalBudget - totalBudgetSpent;
  const overallPct = totalBudget > 0 ? Math.min(totalBudgetSpent / totalBudget, 1) : 0;
  const over = totalBudget > 0 && totalBudgetSpent > totalBudget;

  const openNew = () => {
    setEditing(null);
    setSheetOpen(true);
  };

  return (
    <div>
      <PageHeader
        title="Budgets"
        subtitle="Monthly limits by category"
        action={
          <button
            type="button"
            onClick={openNew}
            aria-label="New budget"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground"
          >
            <Plus size={18} />
          </button>
        }
      />

      <MonthSwitcher
        value={month}
        locale={locale}
        disableNext={month >= current}
        onChange={(delta: number) => {
          const next = shiftMonthKey(month, delta);
          if (next <= current) setMonth(next);
        }}
      />

      {rows.length > 0 ? (
        <section className="surface mt-4 p-4 md:p-5">
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-3">
            <div>
              <p className="text-[11.5px] text-muted-foreground">Total budgeted</p>
              <p className="tnum mt-1 text-[21px] font-bold leading-none md:text-[25px]">
                {formatMoney(totalBudget, currency, locale)}
              </p>
            </div>
            <div>
              <p className="text-[11.5px] text-muted-foreground">Total spent</p>
              <p className="tnum mt-1 text-[21px] font-bold leading-none text-expense md:text-[25px]">
                {formatMoney(totalBudgetSpent, currency, locale)}
              </p>
            </div>
            <div className="col-span-2 md:col-span-1">
              <p className="text-[11.5px] text-muted-foreground">{over ? 'Over budget' : 'Remaining'}</p>
              <p
                className={cn(
                  'tnum mt-1 text-[21px] font-bold leading-none md:text-[25px]',
                  over ? 'text-expense' : 'text-income',
                )}
              >
                {over ? '−' : ''}
                {formatMoney(Math.abs(remaining), currency, locale)}
              </p>
            </div>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${overallPct * 100}%`,
                backgroundColor: over ? 'hsl(var(--expense))' : overallPct >= 0.8 ? 'hsl(var(--warn))' : 'hsl(var(--primary))',
              }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[11.5px]">
            <span className="text-muted-foreground">{Math.round(overallPct * 100)}% of budget used</span>
            <span className={over ? 'text-expense' : 'text-muted-foreground'}>
              {over ? `${formatMoney(Math.abs(remaining), currency, locale)} over` : `${formatMoney(remaining, currency, locale)} left`}
            </span>
          </div>
          {totalSpent > totalBudgetSpent ? (
            <p className="mt-2 text-[11px] text-muted-foreground">
              {formatMoney(totalSpent - totalBudgetSpent, currency, locale)} of spending isn't covered by a budget.
            </p>
          ) : null}
        </section>
      ) : null}

      {rows.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={Target}
            title="No budgets this month"
            description={`Set a monthly limit for a category to keep ${monthLabel(month, locale)} on track.`}
            action={
              <button
                type="button"
                onClick={openNew}
                className="inline-flex h-11 items-center gap-2 rounded-2xl bg-primary px-5 text-[14px] font-semibold text-primary-foreground"
              >
                <Plus size={16} /> Create budget
              </button>
            }
          />
        </div>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rows.map(({ budget, category, spent }) => (
            <div key={budget.id} className="surface p-4">
              <BudgetBar
                budget={budget}
                categoryName={category.name}
                categoryColor={category.color}
                spent={spent}
                currency={budget.currencyCode || currency}
                locale={locale}
                onClick={() => {
                  setEditing(budget);
                  setSheetOpen(true);
                }}
              />
            </div>
          ))}
        </div>
      )}

      <BudgetSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        month={month}
        monthName={monthLabel(month, locale)}
        budget={editing}
      />
    </div>
  );
}
