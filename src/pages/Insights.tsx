import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getDaysInMonth } from 'date-fns';
import { Area, AreaChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { ArrowDownRight, ArrowUpRight, BarChart3, TrendingDown, TrendingUp } from 'lucide-react';
import { db, type Category, type Transaction } from '@/lib/db';
import { useAppStore } from '@/store/useAppStore';
import { fromMinor } from '@/lib/money';
import { formatMasked } from '@/lib/privacy';
import { useAmountsVisible } from '@/hooks/useAmountsVisible';
import { monthKey, monthLabel, shiftMonthKey } from '@/lib/date';
import PageHeader from '@/components/PageHeader';
import MonthSwitcher from '@/components/MonthSwitcher';
import EmptyState from '@/components/EmptyState';
import CategoryIcon from '@/components/CategoryIcon';
import { cn } from '@/lib/utils';

function MiniStat({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3.5">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={cn('tnum mt-1.5 text-[15.5px] font-bold leading-tight', tone)}>{value}</p>
      {hint ? <p className="mt-1 text-[10.5px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export default function Insights() {
  const settings = useAppStore((s) => s.settings);
  const currency = settings?.activeCurrencyCode || 'USD';
  const locale = settings?.locale || 'en-US';
  const amountsVisible = useAmountsVisible();
  const current = monthKey(new Date());

  const [month, setMonth] = useState(current);

  const transactions = useLiveQuery(() => db.transactions.filter((t) => !t.deletedAt).toArray(), []);
  const categories = useLiveQuery(() => db.categories.toArray(), [], []);
  const categoryMap = useMemo(() => new Map<string, Category>((categories || []).map((c) => [c.id, c])), [categories]);

  const data = useMemo<{
    income: number;
    expense: number;
    net: number;
    prevExpense: number;
    daily: { day: number; value: number; minor: number }[];
    breakdown: { category: Category; amount: number }[];
    largest: Transaction | null;
    days: number;
    avgDaily: number;
    monthCount: number;
    forecast: {
      projected: number;
      avgMonthly: number;
      overPace: boolean;
      safePerDay: number;
    } | null;
  }>(() => {
    const list = transactions || [];
    const prevKey = shiftMonthKey(month, -1);
    let income = 0;
    let expense = 0;
    let prevExpense = 0;
    const byCategory: Record<string, number> = {};
    const byDay: Record<number, number> = {};
    let largest: Transaction | null = null;

    list.forEach((t) => {
      const key = String(t.date || '').slice(0, 7);
      if (key === prevKey && t.type === 'expense') prevExpense += t.amount;
      if (key !== month) return;
      if (t.type === 'income') {
        income += t.amount;
      } else {
        expense += t.amount;
        byCategory[t.categoryId] = (byCategory[t.categoryId] || 0) + t.amount;
        const day = Number(String(t.date).slice(8, 10)) || 1;
        byDay[day] = (byDay[day] || 0) + t.amount;
        if (!largest || t.amount > largest.amount) largest = t;
      }
    });

    const [y, m] = month.split('-').map(Number);
    const days = getDaysInMonth(new Date(y, m - 1, 1));
    const isCurrent = month === current;
    const elapsed = isCurrent ? new Date().getDate() : days;

    const daily = Array.from({ length: days }, (_, i) => ({
      day: i + 1,
      value: fromMinor(byDay[i + 1] || 0, currency),
      minor: byDay[i + 1] || 0,
    }));

    const breakdown: { category: Category; amount: number }[] = Object.entries(byCategory)
      .map(([categoryId, amount]) => ({ category: categoryMap.get(categoryId), amount }))
      .filter((row): row is { category: Category; amount: number } => Boolean(row.category))
      .sort((a, b) => b.amount - a.amount);

    const monthCount = list.filter((t) => String(t.date || '').slice(0, 7) === month).length;

    // Forecast: simple average of the last 3 full months (v1, unweighted).
    let forecast: {
      projected: number;
      avgMonthly: number;
      overPace: boolean;
      safePerDay: number;
    } | null = null;
    if (isCurrent) {
      const pastKeys = [1, 2, 3].map((i) => shiftMonthKey(month, -i));
      let histExpense = 0;
      let histDays = 0;
      for (const k of pastKeys) {
        const [py, pm] = k.split('-').map(Number);
        histDays += getDaysInMonth(new Date(py, pm - 1, 1));
      }
      list.forEach((t) => {
        if (t.type !== 'expense') return;
        if (pastKeys.includes(String(t.date || '').slice(0, 7))) histExpense += t.amount;
      });
      if (histExpense > 0 && histDays > 0) {
        const dailyBurn = histExpense / histDays;
        const avgMonthly = Math.round((histExpense / pastKeys.length));
        const daysLeft = Math.max(days - elapsed, 0);
        const projected = Math.round(expense + dailyBurn * daysLeft);
        const proRata = (avgMonthly / days) * elapsed;
        forecast = {
          projected,
          avgMonthly,
          overPace: expense > proRata,
          safePerDay: daysLeft > 0 ? Math.max(Math.round((avgMonthly - expense) / daysLeft), 0) : 0,
        };
      }
    }

    return {
      income,
      expense,
      net: income - expense,
      prevExpense,
      daily,
      breakdown,
      largest,
      days,
      avgDaily: elapsed > 0 ? Math.round(expense / elapsed) : 0,
      monthCount,
      forecast,
    };
  }, [transactions, month, categoryMap, currency, current]);

  const donutData = data.breakdown.slice(0, 6).map((row) => ({
    name: row.category.name,
    value: fromMinor(row.amount, currency),
    color: row.category.color,
    minor: row.amount,
  }));
  const otherTotal = data.breakdown.slice(6).reduce((sum, row) => sum + row.amount, 0);
  if (otherTotal > 0) {
    donutData.push({ name: 'Other', value: fromMinor(otherTotal, currency), color: '#9CA3AF', minor: otherTotal });
  }

  const expenseChange =
    data.prevExpense > 0 ? Math.round(((data.expense - data.prevExpense) / data.prevExpense) * 100) : null;

  return (
    <div>
      <PageHeader title="Insights" subtitle="Understand your spending" />

      <MonthSwitcher
        value={month}
        locale={locale}
        disableNext={month >= current}
        onChange={(delta) => {
          const next = shiftMonthKey(month, delta);
          if (next <= current) setMonth(next);
        }}
      />

      {!transactions ? (
        <div className="mt-4 animate-pulse space-y-3">
          <div className="h-48 rounded-3xl bg-secondary" />
          <div className="h-56 rounded-3xl bg-secondary" />
        </div>
      ) : data.monthCount === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={BarChart3}
            title={`Nothing recorded in ${monthLabel(month, locale)}`}
            description="Insights appear as soon as you log income or expenses for this month."
          />
        </div>
      ) : (
        <div className="mt-4 grid gap-4 [&>*]:min-w-0 md:grid-cols-2 lg:grid-cols-3">
          <section className="surface p-4">
            <h2 className="text-[14.5px] font-semibold">Month summary</h2>
            <div className="mt-3 space-y-3">
              <div>
                <div className="flex items-center justify-between text-[12.5px]">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <ArrowDownRight size={13} className="text-income" /> Income
                  </span>
                  <span className="tnum font-semibold text-income">{formatMasked(data.income, currency, locale, amountsVisible)}</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-income"
                    style={{ width: `${data.income ? Math.min((data.income / Math.max(data.income, data.expense)) * 100, 100) : 0}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-[12.5px]">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <ArrowUpRight size={13} className="text-expense" /> Expenses
                  </span>
                  <span className="tnum font-semibold text-expense">{formatMasked(data.expense, currency, locale, amountsVisible)}</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-expense"
                    style={{ width: `${data.expense ? Math.min((data.expense / Math.max(data.income, data.expense)) * 100, 100) : 0}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
              <span className="text-[12px] text-muted-foreground">
                {data.net >= 0 ? 'Saved this month' : 'Deficit this month'}
              </span>
              <span className={cn('tnum text-[15px] font-bold', data.net >= 0 ? 'text-income' : 'text-expense')}>
                {data.net >= 0 ? '+' : '−'}
                {formatMasked(Math.abs(data.net), currency, locale, amountsVisible)}
              </span>
            </div>
          </section>

          {data.forecast ? (
            <section className="surface p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-[14.5px] font-semibold">Forecast</h2>
                  <p className="mt-0.5 text-[11.5px] text-muted-foreground">At your 3-month average pace</p>
                </div>
                <span
                  className={cn(
                    'rounded-full px-2.5 py-1 text-[10.5px] font-bold',
                    data.forecast.overPace ? 'bg-expense/12 text-expense' : 'bg-income/12 text-income',
                  )}
                >
                  {data.forecast.overPace ? 'Over pace' : 'On track'}
                </span>
              </div>
              <p className="tnum mt-3 text-[24px] font-bold leading-none tracking-tight">
                {formatMasked(data.forecast.projected, currency, locale, amountsVisible)}
              </p>
              <p className="mt-1.5 text-[11.5px] text-muted-foreground">projected spending by month end</p>
              <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-[12px]">
                <span className="text-muted-foreground">Safe to spend daily</span>
                <span className="tnum font-semibold">
                  {formatMasked(data.forecast.safePerDay, currency, locale, amountsVisible)}/day
                </span>
              </div>
            </section>
          ) : null}

          <section className="surface p-4">
            <h2 className="text-[14.5px] font-semibold">Category breakdown</h2>
            <div className="mt-2 flex items-center gap-4">
              <div className="relative h-[150px] w-[150px] shrink-0 md:h-[170px] md:w-[170px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      dataKey="value"
                      innerRadius={48}
                      outerRadius={68}
                      paddingAngle={2}
                      stroke="none"
                      startAngle={90}
                      endAngle={-270}
                    >
                      {donutData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={(props: { active?: boolean; payload?: readonly { payload?: { minor: number; name: string } }[] }) =>
                        props.active && props.payload?.length ? (
                          <div className="rounded-xl border border-border bg-popover px-3 py-2 text-[11.5px] shadow-xl">
                            <p className="text-muted-foreground">{props.payload[0].payload?.name}</p>
                            <p className="tnum mt-0.5 font-semibold">
                              {props.payload[0].payload ? formatMasked(props.payload[0].payload.minor, currency, locale, amountsVisible) : null}
                            </p>
                          </div>
                        ) : null
                      }
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[9.5px] uppercase tracking-wider text-muted-foreground">Spent</span>
                  <span className="tnum text-[13px] font-bold">{formatMasked(data.expense, currency, locale, amountsVisible)}</span>
                </div>
              </div>
              <div className="min-w-0 flex-1 space-y-1.5">
                {data.breakdown.slice(0, 4).map((row) => (
                  <div key={row.category.id} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: row.category.color }} />
                    <span className="min-w-0 flex-1 truncate text-[11.5px] text-muted-foreground">{row.category.name}</span>
                    <span className="tnum text-[11.5px] font-medium">
                      {Math.round((row.amount / Math.max(data.expense, 1)) * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="surface p-4 md:col-span-2 lg:col-span-2">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-[14.5px] font-semibold">Daily spending</h2>
                <p className="mt-0.5 text-[11.5px] text-muted-foreground">{monthLabel(month, locale)}</p>
              </div>
              <span className="tnum text-[12px] text-muted-foreground">{formatMasked(data.avgDaily, currency, locale, amountsVisible)}/day</span>
            </div>
            <div className="mt-3 h-[130px] w-full md:h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.daily} margin={{ top: 4, right: 2, left: 2, bottom: 0 }}>
                  <defs>
                    <linearGradient id="spendFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    interval={Math.ceil(data.days / 6)}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                  />
                  <Tooltip
                    content={(props: { active?: boolean; payload?: readonly { payload?: { minor: number; name?: string } }[]; label?: string | number }) =>
                      props.active && props.payload?.length ? (
                        <div className="rounded-xl border border-border bg-popover px-3 py-2 text-[11.5px] shadow-xl">
                          <p className="text-muted-foreground">Day {props.label}</p>
                          <p className="tnum mt-0.5 font-semibold">
                            {props.payload[0].payload ? formatMasked(props.payload[0].payload.minor, currency, locale, amountsVisible) : null}
                          </p>
                        </div>
                      ) : null
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#spendFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="surface p-4">
            <h2 className="text-[14.5px] font-semibold">Top categories</h2>
            <div className="mt-3 space-y-3">
              {data.breakdown.slice(0, 5).map((row) => {
                const pct = Math.round((row.amount / Math.max(data.expense, 1)) * 100);
                return (
                  <div key={row.category.id}>
                    <div className="flex items-center gap-2">
                      <span
                        className="flex h-6 w-6 items-center justify-center rounded-full"
                        style={{ backgroundColor: `${row.category.color}22`, color: row.category.color }}
                      >
                        <CategoryIcon name={row.category.icon} size={12} />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium">{row.category.name}</span>
                      <span className="tnum text-[12.5px] font-semibold">
                        {formatMasked(row.amount, currency, locale, amountsVisible)}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: row.category.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <div className="grid grid-cols-2 gap-3 md:col-span-2 md:grid-cols-4 lg:col-span-3">
            <MiniStat
              label="Average per day"
              value={formatMasked(data.avgDaily, currency, locale, amountsVisible)}
              hint={`Across ${month === current ? new Date().getDate() : data.days} days`}
            />
            <MiniStat
              label="Largest expense"
              value={data.largest ? formatMasked(data.largest.amount, currency, locale, amountsVisible) : '—'}
              hint={data.largest ? categoryMap.get(data.largest.categoryId)?.name || '' : 'No expenses yet'}
              tone="text-expense"
            />
            <MiniStat
              label="Income"
              value={formatMasked(data.income, currency, locale, amountsVisible)}
              hint="This month"
              tone="text-income"
            />
            <MiniStat
              label="vs last month"
              value={
                expenseChange === null
                  ? '—'
                  : `${expenseChange > 0 ? '+' : ''}${expenseChange}%`
              }
              hint={
                expenseChange === null
                  ? 'No data for last month'
                  : expenseChange > 0
                    ? 'More spent than last month'
                    : 'Less spent than last month'
              }
              tone={expenseChange !== null && expenseChange > 0 ? 'text-expense' : 'text-income'}
            />
          </div>

          {expenseChange !== null ? (
            <div className="flex items-center gap-2 rounded-2xl bg-secondary/40 px-3.5 py-3 md:col-span-2 lg:col-span-3">
              {expenseChange > 0 ? (
                <TrendingUp size={15} className="shrink-0 text-expense" />
              ) : (
                <TrendingDown size={15} className="shrink-0 text-income" />
              )}
              <p className="text-[11.5px] leading-relaxed text-muted-foreground">
                You spent{' '}
                <span className={expenseChange > 0 ? 'text-expense' : 'text-income'}>
                  {formatMasked(Math.abs(data.expense - data.prevExpense), currency, locale, amountsVisible)}
                </span>{' '}
                {expenseChange > 0 ? 'more' : 'less'} than in {monthLabel(shiftMonthKey(month, -1), locale)}.
              </p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
