import type { Dispatch, SetStateAction } from 'react';
import { Search, X } from 'lucide-react';
import type { Account, Category } from '@/lib/db';
import { formatMoney } from '@/lib/money';
import FilterControls, { type TxFilters } from './FilterControls';
import { cn } from '@/lib/utils';

interface Totals {
  income: number;
  expense: number;
  count: number;
}

interface FiltersPanelProps {
  search: string;
  setSearch: Dispatch<SetStateAction<string>>;
  type: string;
  setType: Dispatch<SetStateAction<'all' | 'income' | 'expense'>>;
  sort: string;
  setSort: Dispatch<SetStateAction<'newest' | 'oldest' | 'highest' | 'lowest'>>;
  sorts: { value: string; label: string }[];
  filters: TxFilters;
  setFilters: Dispatch<SetStateAction<TxFilters>>;
  categories?: Category[];
  accounts?: Account[];
  currency: string;
  locale: string;
  totals: Totals;
  onReset: () => void;
  activeFilterCount: number;
}

export default function FiltersPanel({
  search,
  setSearch,
  type,
  setType,
  sort,
  setSort,
  sorts,
  filters,
  setFilters,
  categories,
  accounts,
  currency,
  locale,
  totals,
  onReset,
  activeFilterCount,
}: FiltersPanelProps) {
  const hasAny = activeFilterCount > 0 || !!search || type !== 'all' || sort !== 'newest';

  return (
    <div className="surface p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Filters</h2>
        {hasAny ? (
          <button type="button" onClick={onReset} className="text-[11.5px] font-semibold text-primary">
            Reset all
          </button>
        ) : null}
      </div>

      <div className="relative mt-3">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search notes, categories, amounts"
          aria-label="Search transactions"
          className="field pl-9 pr-9 text-[13px]"
        />
        {search ? (
          <button
            type="button"
            onClick={() => setSearch('')}
            aria-label="Clear search"
            className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary"
          >
            <X size={13} />
          </button>
        ) : null}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-1 rounded-xl bg-secondary/60 p-1">
        {[
          { value: 'all', label: 'All' },
          { value: 'expense', label: 'Expenses' },
          { value: 'income', label: 'Income' },
        ].map((chip) => (
          <button
            key={chip.value}
            type="button"
            onClick={() => setType(chip.value as 'all' | 'income' | 'expense')}
            className={cn(
              'h-8 rounded-lg text-[11.5px] font-semibold transition-colors',
              type === chip.value ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground',
            )}
          >
            {chip.label}
          </button>
        ))}
      </div>

      <label className="mt-2 block">
        <span className="sr-only">Sort</span>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as 'newest' | 'oldest' | 'highest' | 'lowest')}
          className="field h-10 py-0 text-[12.5px] font-medium"
        >
          {sorts.map((s) => (
            <option key={s.value} value={s.value}>
              Sort: {s.label}
            </option>
          ))}
        </select>
      </label>

      <div className="mt-4 border-t border-border/60 pt-4">
        <FilterControls
          filters={filters}
          setFilters={setFilters}
          categories={categories}
          accounts={accounts}
        />
      </div>

      <div className="mt-4 space-y-2 border-t border-border/60 pt-4">
        <div className="flex items-center justify-between text-[12px]">
          <span className="text-muted-foreground">Income</span>
          <span className="tnum font-semibold text-income">{formatMoney(totals.income, currency, locale)}</span>
        </div>
        <div className="flex items-center justify-between text-[12px]">
          <span className="text-muted-foreground">Expenses</span>
          <span className="tnum font-semibold text-expense">{formatMoney(totals.expense, currency, locale)}</span>
        </div>
        <div className="flex items-center justify-between border-t border-border/60 pt-2 text-[12.5px]">
          <span className="text-muted-foreground">Net</span>
          <span className="tnum font-bold">
            {formatMoney(totals.income - totals.expense, currency, locale, { signDisplay: 'exceptZero' })}
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground">
          {totals.count} {totals.count === 1 ? 'entry matches' : 'entries match'}
        </p>
      </div>
    </div>
  );
}
