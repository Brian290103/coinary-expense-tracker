import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'framer-motion';
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { ArrowDownLeft, ArrowUpRight, ChevronRight, Lock, Plus, Wallet } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { db, type Transaction } from '@/lib/db';
import { useAppStore } from '@/store/useAppStore';
import { formatMoney, fromMinor } from '@/lib/money';
import { monthKey, monthLabel, monthLabelShort, recentMonthKeys } from '@/lib/date';
import TransactionRow from '@/components/TransactionRow';
import BudgetBar from '@/components/BudgetBar';
import QuickActions from '@/components/home/QuickActions';
import EmptyState from '@/components/EmptyState';
import { cn } from '@/lib/utils';

function ChartTip({ active, payload, currency, locale }: { active?: boolean; payload?: { payload: { fullLabel: string; minor: number } }[]; currency: string; locale: string }) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="rounded-xl border border-border bg-popover px-3 py-2 text-[11.5px] shadow-xl">
      <p className="text-muted-foreground">{item.fullLabel}</p>
      <p className="tnum mt-0.5 text-[12.5px] font-semibold">{formatMoney(item.minor, currency, locale)}</p>
    </div>
  );
}

function StatPill({ icon: Icon, label, value, tone }: { icon: LucideIcon; label: string; value: string; tone: 'income' | 'expense' }) {
  return (
    <div className="rounded-2xl bg-secondary/50 px-3 py-2.5">
      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            'flex h-5 w-5 items-center justify-center rounded-full',
            tone === 'income' ? 'bg-income/15 text-income' : 'bg-expense/15 text-expense',
          )}
        >
          <Icon size={12} strokeWidth={2.4} />
        </span>
        <span className="text-[11.5px] font-medium text-muted-foreground">{label}</span>
      </div>
      <p className={cn('tnum mt-1.5 text-[15px] font-semibold', tone === 'income' ? 'text-income' : 'text-expense')}>
        {value}
      </p>
    </div>
  );
}

const Skeleton = () => (
  <div className="animate-pulse space-y-4 pt-4">
    <div className="h-3 w-20 rounded bg-secondary" />
    <div className="h-7 w-40 rounded bg-secondary" />
    <div className="h-44 rounded-[28px] bg-secondary" />
    <div className="h-36 rounded-3xl bg-secondary" />
  </div>
);

export default function Home() {
  const settings = useAppStore((s) => s.settings);
  const openTxSheet = useAppStore((s) => s.openTxSheet);
  const navigate = useNavigate();
  const currency = settings?.activeCurrencyCode || 'USD';
  const locale = settings?.locale || 'en-US';
  const currentMonth = monthKey(new Date());

  const transactions = useLiveQuery(() => db.transactions.filter((t) => !t.deletedAt).toArray(), []);
  const categories = useLiveQuery(() => db.categories.toArray(), [], []);
  const accounts = useLiveQuery(() => db.accounts.toArray(), [], []);
  const budgets = useLiveQuery(
    () => db.budgets.where('month').equals(currentMonth).toArray(),
    [currentMonth],
    [],
  );

  const categoryMap = useMemo(() => new Map<string, import('@/lib/db').Category>((categories || []).map((c) => [c.id, c])), [categories]);
  const accountMap = useMemo(() => new Map<string, import('@/lib/db').Account>((accounts || []).map((a) => [a.id, a])), [accounts]);

  const stats = useMemo(() => {
    const list: Transaction[] = transactions || [];
    let balance = 0;
    let income = 0;
    let expense = 0;
    const expensesByMonth: Record<string, number> = {};
    const spentByCategory: Record<string, number> = {};

    list.forEach((t) => {
      const amount = Number(t.amount) || 0;
      if (t.type === 'income') balance += amount;
      else balance -= amount;

      const key = String(t.date || '').slice(0, 7);
      if (t.type === 'expense') expensesByMonth[key] = (expensesByMonth[key] || 0) + amount;

      if (key === currentMonth) {
        if (t.type === 'income') income += amount;
        else {
          expense += amount;
          spentByCategory[t.categoryId] = (spentByCategory[t.categoryId] || 0) + amount;
        }
      }
    });

    const sorted = [...list].sort(
      (a, b) => String(b.date || '').localeCompare(String(a.date || ''))
        || String(b.createdAt || '').localeCompare(String(a.createdAt || '')),
    );

    return { balance, income, expense, expensesByMonth, spentByCategory, recent: sorted.slice(0, 6), count: list.length };
  }, [transactions, currentMonth]);

  if (!transactions || !settings) return <Skeleton />;

  const chartData = recentMonthKeys(6).map((key) => ({
    key,
    label: monthLabelShort(key, locale),
    fullLabel: monthLabel(key, locale),
    minor: stats.expensesByMonth[key] || 0,
    value: fromMinor(stats.expensesByMonth[key] || 0, currency),
  }));

  const net = stats.income - stats.expense;
  const budgetRows: { budget: import('@/lib/db').Budget; category: import('@/lib/db').Category; spent: number }[] = (budgets || [])
    .map((b) => ({ budget: b, category: categoryMap.get(b.categoryId), spent: stats.spentByCategory[b.categoryId] || 0 }))
    .filter((row): row is { budget: import('@/lib/db').Budget; category: import('@/lib/db').Category; spent: number } => Boolean(row.category))
    .slice(0, 3);

  return (
    <div className="space-y-4 lg:space-y-6">
      <header className="flex items-start justify-between gap-3 pt-5 md:pt-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Coinary
            </span>
          </div>
          <h1 className="mt-2 text-[26px] font-bold leading-none">{monthLabel(currentMonth, locale)}</h1>
          <p className="mt-2 text-[12.5px] text-muted-foreground">Know where your money goes.</p>
        </div>
        <div className="mt-1 flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-2.5 text-[10.5px] font-medium text-muted-foreground">
          <Lock size={11} className="text-primary" />
          Local only
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-12 lg:gap-6">
        <div className="space-y-4 md:col-span-12 lg:col-span-7 lg:space-y-6 xl:col-span-8">
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-[28px] border border-border bg-card p-5 md:p-6"
      >
        <div className="pointer-events-none absolute -right-16 -top-24 h-52 w-52 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative">
          <p className="text-[12.5px] font-medium text-muted-foreground">Total balance</p>
          <p className="tnum mt-2 text-[36px] font-bold leading-none tracking-tight">
            {formatMoney(stats.balance, currency, locale)}
          </p>

          <div className="mt-5 grid grid-cols-2 gap-2.5">
            <StatPill
              icon={ArrowDownLeft}
              label="Income"
              tone="income"
              value={formatMoney(stats.income, currency, locale)}
            />
            <StatPill
              icon={ArrowUpRight}
              label="Expenses"
              tone="expense"
              value={formatMoney(stats.expense, currency, locale)}
            />
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-border/70 pt-3">
            <span className="text-[12px] text-muted-foreground">Net this month</span>
            <span
              className={cn(
                'tnum text-[13.5px] font-semibold',
                net >= 0 ? 'text-income' : 'text-expense',
              )}
            >
              {net >= 0 ? '+' : '−'}
              {formatMoney(Math.abs(net), currency, locale)}
            </span>
          </div>
        </div>
      </motion.section>

      {stats.count === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Your ledger is empty"
          description="Add your first income or expense — everything stays on this device."
          action={
            <button
              type="button"
              onClick={() => openTxSheet(null)}
              className="inline-flex h-11 items-center gap-2 rounded-2xl bg-primary px-5 text-[14px] font-semibold text-primary-foreground"
            >
              <Plus size={17} /> Add transaction
            </button>
          }
        />
      ) : (
        <>
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
            className="surface p-4"
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-[14.5px] font-semibold">Spending trend</h2>
                <p className="mt-0.5 text-[11.5px] text-muted-foreground">Last 6 months</p>
              </div>
              <p className="tnum text-[14px] font-semibold">{formatMoney(stats.expense, currency, locale)}</p>
            </div>
            <div className="mt-3 h-[118px] w-full md:h-[150px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }} barCategoryGap="32%">
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    dy={6}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10.5 }}
                  />
                  <Tooltip
                    cursor={{ fill: 'hsl(var(--foreground) / 0.04)', radius: 8 }}
                    content={<ChartTip currency={currency} locale={locale} />}
                  />
                  <Bar dataKey="value" radius={[7, 7, 7, 7]}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={entry.key}
                        fill={
                          index === chartData.length - 1
                            ? 'hsl(var(--primary))'
                            : 'hsl(var(--foreground) / 0.14)'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.section>

          <section className="surface p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[14.5px] font-semibold">Recent activity</h2>
              <Link to="/transactions" className="flex items-center gap-0.5 text-[12px] font-medium text-primary">
                See all <ChevronRight size={13} />
              </Link>
            </div>
            <div className="mt-2 divide-y divide-border/60">
              {stats.recent.map((tx, index) => (
                <TransactionRow
                  key={tx.id}
                  tx={tx}
                  index={index}
                  category={categoryMap.get(tx.categoryId)}
                  accountName={accountMap.get(tx.accountId)?.name}
                  currency={currency}
                  locale={locale}
                  onSelect={() => openTxSheet(tx)}
                />
              ))}
            </div>
          </section>
        </>
      )}
        </div>

        <div
          className={cn(
            'space-y-4 md:col-span-12 md:grid md:gap-4 md:space-y-0 lg:col-span-5 lg:block lg:space-y-6 xl:col-span-4',
            budgetRows.length > 0 ? 'md:grid-cols-2' : 'md:grid-cols-1',
          )}
        >
          {budgetRows.length > 0 ? (
            <section className="surface p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-[14.5px] font-semibold">Budgets</h2>
                <Link to="/budgets" className="flex items-center gap-0.5 text-[12px] font-medium text-primary">
                  View all <ChevronRight size={13} />
                </Link>
              </div>
              <div className="mt-3 space-y-3.5">
                {budgetRows.map(({ budget, category, spent }) => (
                  <BudgetBar
                    key={budget.id}
                    budget={budget}
                    categoryName={category.name}
                    categoryColor={category.color}
                    spent={spent}
                    currency={budget.currencyCode || currency}
                    locale={locale}
                    onClick={() => navigate('/budgets')}
                  />
                ))}
              </div>
            </section>
          ) : null}
          <QuickActions />
        </div>
      </div>
    </div>
  );
}
