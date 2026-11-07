import type { Dispatch, SetStateAction } from 'react';
import CategoryIcon from '@/components/CategoryIcon';
import type { Account, Category } from '@/lib/db';
import { PAYMENT_METHODS } from '@/lib/defaults';
import { cn } from '@/lib/utils';

export interface TxFilters {
  categoryId: string;
  accountId: string;
  paymentMethod: string;
  from: string;
  to: string;
}

interface FilterControlsProps {
  filters: TxFilters;
  setFilters: Dispatch<SetStateAction<TxFilters>>;
  categories?: Category[];
  accounts?: Account[];
}

export default function FilterControls({ filters, setFilters, categories, accounts }: FilterControlsProps) {
  const set = (patch: Partial<TxFilters>): void => setFilters({ ...filters, ...patch });
  const expenseCats = (categories || []).filter((c) => c.type === 'expense');
  const incomeCats = (categories || []).filter((c) => c.type === 'income');

  return (
    <>
      <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Category</p>
      <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => set({ categoryId: '' })}
          className={cn('chip shrink-0', !filters.categoryId && 'chip-active')}
        >
          All
        </button>
        {[...expenseCats, ...incomeCats].map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => set({ categoryId: filters.categoryId === cat.id ? '' : cat.id })}
            className={cn('chip shrink-0', filters.categoryId === cat.id && 'chip-active')}
          >
            <CategoryIcon name={cat.icon} size={13} style={{ color: cat.color }} />
            {cat.name}
          </button>
        ))}
      </div>

      <p className="mt-5 text-[12px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Account</p>
      <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => set({ accountId: '' })}
          className={cn('chip shrink-0', !filters.accountId && 'chip-active')}
        >
          All
        </button>
        {(accounts || []).map((acc) => (
          <button
            key={acc.id}
            type="button"
            onClick={() => set({ accountId: filters.accountId === acc.id ? '' : acc.id })}
            className={cn('chip shrink-0', filters.accountId === acc.id && 'chip-active')}
          >
            {acc.name}
          </button>
        ))}
      </div>

      <p className="mt-5 text-[12px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Payment method
      </p>
      <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => set({ paymentMethod: '' })}
          className={cn('chip shrink-0', !filters.paymentMethod && 'chip-active')}
        >
          All
        </button>
        {PAYMENT_METHODS.map((method) => (
          <button
            key={method}
            type="button"
            onClick={() => set({ paymentMethod: filters.paymentMethod === method ? '' : method })}
            className={cn('chip shrink-0', filters.paymentMethod === method && 'chip-active')}
          >
            {method}
          </button>
        ))}
      </div>

      <p className="mt-5 text-[12px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Date range</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <label className="block">
          <span className="text-[11px] text-muted-foreground">From</span>
          <input
            type="date"
            value={filters.from}
            onChange={(e) => set({ from: e.target.value })}
            className="field mt-1 py-2.5 text-[13px]"
          />
        </label>
        <label className="block">
          <span className="text-[11px] text-muted-foreground">To</span>
          <input
            type="date"
            value={filters.to}
            onChange={(e) => set({ to: e.target.value })}
            className="field mt-1 py-2.5 text-[13px]"
          />
        </label>
      </div>
    </>
  );
}
