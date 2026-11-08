import type { ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Pencil, Repeat, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import BottomSheet from './BottomSheet';
import CategoryIcon from './CategoryIcon';
import ReceiptImage from './ReceiptImage';
import { db, softDeleteTransaction } from '@/lib/db';
import { formatMasked } from '@/lib/privacy';
import { useAmountsVisible } from '@/hooks/useAmountsVisible';
import { fullDate } from '@/lib/date';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-1 py-2.5">
      <span className="shrink-0 text-[12.5px] text-muted-foreground">{label}</span>
      <span className="tnum min-w-0 truncate text-right text-[13.5px] font-medium">{children}</span>
    </div>
  );
}

export default function TransactionViewSheet() {
  const viewTx = useAppStore((s) => s.viewTx);
  const closeViewTx = useAppStore((s) => s.closeViewTx);
  const openTxSheet = useAppStore((s) => s.openTxSheet);
  const askConfirm = useAppStore((s) => s.askConfirm);
  const settings = useAppStore((s) => s.settings);
  const visible = useAmountsVisible();

  const currency = settings?.activeCurrencyCode || 'USD';
  const locale = settings?.locale || 'en-US';
  const tx = viewTx.transaction;

  const category = useLiveQuery(async () => {
    if (!tx?.categoryId) return undefined;
    return db.categories.get(tx.categoryId);
  }, [tx?.categoryId]);
  const account = useLiveQuery(async () => {
    if (!tx?.accountId) return undefined;
    return db.accounts.get(tx.accountId);
  }, [tx?.accountId]);
  const rule = useLiveQuery(async () => {
    if (!tx?.recurringId) return undefined;
    return db.recurring.get(tx.recurringId);
  }, [tx?.recurringId]);

  if (!tx) return null;

  const title = category?.name || (tx.type === 'income' ? 'Income' : 'Expense');
  const color = category?.color || '#9CA3AF';

  const handleEdit = (): void => {
    closeViewTx();
    openTxSheet(tx);
  };

  const handleDelete = (): void => {
    askConfirm({
      title: 'Delete this transaction?',
      description: 'It will be removed from your ledger and all totals updated.',
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: async () => {
        await softDeleteTransaction(tx.id);
        closeViewTx();
        toast.success('Transaction deleted');
      },
    });
  };

  return (
    <BottomSheet
      open={viewTx.open}
      onClose={closeViewTx}
      title="Transaction"
      subtitle={fullDate(tx.date, locale)}
      footer={
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleDelete}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl border border-expense/40 text-[14px] font-semibold text-expense"
          >
            <Trash2 size={15} /> Delete
          </button>
          <button
            type="button"
            onClick={handleEdit}
            className="flex h-12 flex-[2] items-center justify-center gap-2 rounded-2xl bg-primary text-[15px] font-semibold text-primary-foreground"
          >
            <Pencil size={15} /> Edit
          </button>
        </div>
      }
    >
      <div className="flex items-center gap-3">
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
          style={{ backgroundColor: `${color}22`, color }}
        >
          <CategoryIcon name={category?.icon} size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[16px] font-bold">{title}</p>
          <p
            className={cn(
              'tnum mt-0.5 text-[15px] font-bold',
              tx.type === 'income' ? 'text-income' : 'text-expense',
            )}
          >
            {tx.type === 'income' ? '+' : '−'}
            {formatMasked(tx.amount, tx.currencyCode || currency, locale, visible)}
          </p>
        </div>
        {rule ? (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-secondary px-2 py-1 text-[10px] font-semibold text-muted-foreground">
            <Repeat size={11} /> Auto
          </span>
        ) : null}
      </div>

      <div className="mt-3 divide-y divide-border/60 rounded-2xl border border-border px-3">
        <DetailRow label="Type">{tx.type === 'income' ? 'Income' : 'Expense'}</DetailRow>
        <DetailRow label="Date">{fullDate(tx.date, locale)}</DetailRow>
        {category ? <DetailRow label="Category">{category.name}</DetailRow> : null}
        {account ? <DetailRow label="Account">{account.name}</DetailRow> : null}
        {tx.paymentMethod ? <DetailRow label="Method">{tx.paymentMethod}</DetailRow> : null}
        {tx.note ? <DetailRow label="Note">{tx.note}</DetailRow> : null}
      </div>

      {tx.receiptPhotoPath ? (
        <div className="mt-3 overflow-hidden rounded-2xl border border-border">
          <ReceiptImage receiptId={tx.receiptPhotoPath} className="max-h-64 w-full object-cover" />
        </div>
      ) : null}
    </BottomSheet>
  );
}
