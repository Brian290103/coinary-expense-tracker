import type { Dispatch, SetStateAction } from 'react';
import BottomSheet from './BottomSheet';
import FilterControls, { type TxFilters } from './transactions/FilterControls';
import type { Account, Category } from '@/lib/db';

interface TransactionFiltersProps {
  open: boolean;
  onClose: () => void;
  filters: TxFilters;
  setFilters: Dispatch<SetStateAction<TxFilters>>;
  categories?: Category[];
  accounts?: Account[];
}

export default function TransactionFilters({ open, onClose, filters, setFilters, categories, accounts }: TransactionFiltersProps) {
  const reset = () =>
    setFilters({ categoryId: '', accountId: '', paymentMethod: '', from: '', to: '' });

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Filter transactions"
      subtitle="Narrow your ledger by category, account or dates"
      footer={
        <div className="flex gap-2">
          <button
            type="button"
            onClick={reset}
            className="h-12 flex-1 rounded-2xl border border-border text-[14px] font-semibold text-muted-foreground"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-12 flex-[2] rounded-2xl bg-primary text-[15px] font-semibold text-primary-foreground"
          >
            Show results
          </button>
        </div>
      }
    >
      <FilterControls
        filters={filters}
        setFilters={setFilters}
        categories={categories}
        accounts={accounts}
      />
    </BottomSheet>
  );
}
