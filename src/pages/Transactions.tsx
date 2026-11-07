import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'framer-motion';
import { ArrowLeftRight, Plus, Search, SlidersHorizontal, X } from 'lucide-react';
import { toast } from 'sonner';
import { db, softDeleteTransaction, type Account, type Category, type Transaction } from '@/lib/db';
import { useAppStore } from '@/store/useAppStore';
import { formatMoney } from '@/lib/money';
import { groupTransactions } from '@/lib/date';
import PageHeader from '@/components/PageHeader';
import TransactionRow from '@/components/TransactionRow';
import SwipeRow from '@/components/SwipeRow';
import TransactionFilters from '@/components/TransactionFilters';
import FiltersPanel from '@/components/transactions/FiltersPanel';
import type { TxFilters } from '@/components/transactions/FilterControls';
import EmptyState from '@/components/EmptyState';
import { cn } from '@/lib/utils';

const SORTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'highest', label: 'Highest' },
  { value: 'lowest', label: 'Lowest' },
];

const EMPTY_FILTERS: TxFilters = { categoryId: '', accountId: '', paymentMethod: '', from: '', to: '' };

type SortValue = 'newest' | 'oldest' | 'highest' | 'lowest';
type TypeFilter = 'all' | 'income' | 'expense';

export default function Transactions() {
  const settings = useAppStore((s) => s.settings);
  const openTxSheet = useAppStore((s) => s.openTxSheet);
  const askConfirm = useAppStore((s) => s.askConfirm);
  const currency = settings?.activeCurrencyCode || 'USD';
  const locale = settings?.locale || 'en-US';

  const [search, setSearch] = useState('');
  const [type, setType] = useState<TypeFilter>('all');
  const [sort, setSort] = useState<SortValue>('newest');
  const [filters, setFilters] = useState<TxFilters>(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [visible, setVisible] = useState(40);

  const transactions = useLiveQuery(() => db.transactions.filter((t) => !t.deletedAt).toArray(), []);
  const categories = useLiveQuery(() => db.categories.toArray(), [], []);
  const accounts = useLiveQuery(() => db.accounts.toArray(), [], []);

  const categoryMap = useMemo(() => new Map<string, Category>((categories || []).map((c) => [c.id, c])), [categories]);
  const accountMap = useMemo(() => new Map<string, Account>((accounts || []).map((a) => [a.id, a])), [accounts]);

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    let list: Transaction[] = (transactions || []).filter((t) => {
      if (type !== 'all' && t.type !== type) return false;
      if (filters.categoryId && t.categoryId !== filters.categoryId) return false;
      if (filters.accountId && t.accountId !== filters.accountId) return false;
      if (filters.paymentMethod && t.paymentMethod !== filters.paymentMethod) return false;
      if (filters.from && String(t.date) < filters.from) return false;
      if (filters.to && String(t.date) > filters.to) return false;
      if (term) {
        const cat = categoryMap.get(t.categoryId);
        const haystack = [
          t.note || '',
          cat?.name || '',
          t.paymentMethod || '',
          accountMap.get(t.accountId)?.name || '',
          String(t.amount / 100),
          formatMoney(t.amount, t.currencyCode || currency, locale),
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });

    if (sort === 'newest') {
      list = list.sort(
        (a, b) => String(b.date).localeCompare(String(a.date))
          || String(b.createdAt || '').localeCompare(String(a.createdAt || '')),
      );
    } else if (sort === 'oldest') {
      list = list.sort(
        (a, b) => String(a.date).localeCompare(String(b.date))
          || String(a.createdAt || '').localeCompare(String(b.createdAt || '')),
      );
    } else if (sort === 'highest') {
      list = list.sort((a, b) => b.amount - a.amount);
    } else {
      list = list.sort((a, b) => a.amount - b.amount);
    }
    return list;
  }, [transactions, type, filters, search, sort, categoryMap, accountMap, currency, locale]);

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    filtered.forEach((t: Transaction) => {
      if (t.type === 'income') income += t.amount;
      else expense += t.amount;
    });
    return { income, expense, count: filtered.length };
  }, [filtered]);

  const grouped = useMemo(
    () => (sort === 'newest' || sort === 'oldest' ? groupTransactions(filtered.slice(0, visible), locale) : null),
    [filtered, sort, locale, visible],
  );

  const handleDelete = (tx: Transaction) => {
    askConfirm({
      title: 'Delete this transaction?',
      description: 'It will be removed from your ledger and all totals updated.',
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: async () => {
        await softDeleteTransaction(tx.id);
        toast.success('Transaction deleted');
      },
    });
  };

  const renderRow = (tx: Transaction, index: number) => (
    <SwipeRow key={tx.id} onEdit={() => openTxSheet(tx)} onDelete={() => handleDelete(tx)}>
      <TransactionRow
        tx={tx}
        index={index}
        category={categoryMap.get(tx.categoryId)}
        accountName={accountMap.get(tx.accountId)?.name}
        currency={currency}
        locale={locale}
        onSelect={() => openTxSheet(tx)}
      />
    </SwipeRow>
  );

  const shown = filtered.slice(0, visible);

  return (
    <div>
      <PageHeader
        title="Transactions"
        subtitle={`${totals.count} ${totals.count === 1 ? 'entry' : 'entries'}`}
        action={
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              aria-label="Filters"
              className={cn(
                'relative flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground lg:hidden',
                activeFilterCount > 0 && 'border-primary/40 text-primary',
              )}
            >
              <SlidersHorizontal size={16} />
              {activeFilterCount > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9.5px] font-bold text-primary-foreground">
                  {activeFilterCount}
                </span>
              ) : null}
            </button>
            <button
              type="button"
              onClick={() => openTxSheet(null)}
              aria-label="Add transaction"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground"
            >
              <Plus size={18} />
            </button>
          </div>
        }
      />

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_336px] lg:items-start lg:gap-6">
        <div className="min-w-0">
      <div className="relative lg:hidden">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search notes, categories, amounts"
          aria-label="Search transactions"
          className="field pl-10 pr-10"
        />
        {search ? (
          <button
            type="button"
            onClick={() => setSearch('')}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary"
          >
            <X size={14} />
          </button>
        ) : null}
      </div>

      <div className="no-scrollbar mt-3 flex items-center gap-2 overflow-x-auto pb-1 lg:hidden">
        {[
          { value: 'all', label: 'All' },
          { value: 'expense', label: 'Expenses' },
          { value: 'income', label: 'Income' },
        ].map((chip) => (
          <button
            key={chip.value}
            type="button"
            onClick={() => setType(chip.value as TypeFilter)}
            className={cn('chip shrink-0', type === chip.value && 'chip-active')}
          >
            {chip.label}
          </button>
        ))}
        <span className="mx-0.5 h-5 w-px shrink-0 bg-border" />
        <label className="relative shrink-0">
          <span className="sr-only">Sort</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortValue)}
            className="chip shrink-0 appearance-none bg-transparent pr-7 focus:outline-none"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-muted-foreground">
            ▾
          </span>
        </label>
      </div>

      {filtered.length > 0 ? (
        <div className="mt-3 flex items-center justify-between rounded-2xl bg-secondary/40 px-3.5 py-2.5 lg:hidden">
          <span className="text-[11.5px] text-muted-foreground">
            {formatMoney(totals.income, currency, locale)} in ·{' '}
            <span className="text-expense">{formatMoney(totals.expense, currency, locale)} out</span>
          </span>
          <span className="tnum text-[12px] font-semibold">
            {formatMoney(totals.income - totals.expense, currency, locale, { signDisplay: 'exceptZero' })}
          </span>
        </div>
      ) : null}

      {!transactions ? (
        <div className="mt-4 animate-pulse space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 rounded-2xl bg-secondary" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={ArrowLeftRight}
            title={transactions.length === 0 ? 'No transactions yet' : 'Nothing matches'}
            description={
              transactions.length === 0
                ? 'Tap the plus button to record your first income or expense.'
                : 'Try a different search term or clear your filters.'
            }
            action={
              transactions.length === 0 ? (
                <button
                  type="button"
                  onClick={() => openTxSheet(null)}
                  className="inline-flex h-11 items-center gap-2 rounded-2xl bg-primary px-5 text-[14px] font-semibold text-primary-foreground"
                >
                  <Plus size={16} /> Add transaction
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setType('all');
                    setFilters(EMPTY_FILTERS);
                  }}
                  className="h-11 rounded-2xl border border-border px-5 text-[13.5px] font-semibold text-muted-foreground"
                >
                  Clear filters
                </button>
              )
            }
          />
        </div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2">
          {grouped
            ? grouped.map((group) => (
                <section key={group.label} className="mb-4">
                  <h2 className="mb-1 px-1 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    {group.label}
                  </h2>
                  <div className="surface divide-y divide-border/50 px-1.5 py-1">
                    {group.items.map((tx: Transaction, index: number) => renderRow(tx, index))}
                  </div>
                </section>
              ))
            : (
                <div className="surface divide-y divide-border/50 px-1.5 py-1">
                  {shown.map((tx: Transaction, index: number) => renderRow(tx, index))}
                </div>
              )}

          {filtered.length > visible ? (
            <button
              type="button"
              onClick={() => setVisible((v) => v + 40)}
              className="mt-3 h-11 w-full rounded-2xl border border-border text-[13px] font-semibold text-muted-foreground"
            >
              Load more ({filtered.length - visible} left)
            </button>
          ) : null}
        </motion.div>
      )}

        </div>

        <aside className="hidden lg:sticky lg:top-24 lg:block">
          <FiltersPanel
            search={search}
            setSearch={setSearch}
            type={type}
            setType={setType}
            sort={sort}
            setSort={setSort}
            sorts={SORTS}
            filters={filters}
            setFilters={setFilters}
            categories={categories}
            accounts={accounts}
            currency={currency}
            locale={locale}
            totals={totals}
            activeFilterCount={activeFilterCount}
            onReset={() => {
              setSearch('');
              setType('all');
              setSort('newest');
              setFilters(EMPTY_FILTERS);
            }}
          />
        </aside>
      </div>

      <TransactionFilters
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        filters={filters}
        setFilters={setFilters}
        categories={categories}
        accounts={accounts}
      />
    </div>
  );
}
