import type { ChangeEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLiveQuery } from 'dexie-react-hooks';
import { Camera, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  addTransaction, db, deleteReceipt, putReceipt, saveTransaction, softDeleteTransaction,
  type TxType,
} from '@/lib/db';
import { amountToMinorSafe, fromMinor, moneySymbol, sanitizeAmountInput } from '@/lib/money';
import { isoDate } from '@/lib/date';
import { PAYMENT_METHODS } from '@/lib/defaults';
import { useAppStore } from '@/store/useAppStore';
import CategoryIcon from './CategoryIcon';
import ReceiptImage from './ReceiptImage';
import { cn } from '@/lib/utils';

export default function TransactionSheet() {
  const txSheet = useAppStore((s) => s.txSheet);
  const closeTxSheet = useAppStore((s) => s.closeTxSheet);
  const askConfirm = useAppStore((s) => s.askConfirm);
  const settings = useAppStore((s) => s.settings);
  const currency = settings?.activeCurrencyCode || 'USD';

  const categories = useLiveQuery(() => db.categories.toArray(), [], []);
  const accounts = useLiveQuery(() => db.accounts.toArray(), [], []);
  const activeAccounts = useMemo(() => (accounts || []).filter((a) => !a.isArchived), [accounts]);

  const editing = txSheet.transaction;
  const amountRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [type, setType] = useState<TxType>('expense');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState(isoDate());
  const [note, setNote] = useState('');
  const [accountId, setAccountId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [receiptId, setReceiptId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!txSheet.open) return;
    if (editing) {
      setType(editing.type);
      setAmount(String(fromMinor(editing.amount, editing.currencyCode || currency)));
      setCategoryId(editing.categoryId || '');
      setDate(editing.date || isoDate());
      setNote(editing.note || '');
      setAccountId(editing.accountId || '');
      setPaymentMethod(editing.paymentMethod || '');
      setReceiptId(editing.receiptPhotoPath || '');
    } else {
      setType(txSheet.defaultType === 'income' ? 'income' : 'expense');
      setAmount('');
      setCategoryId('');
      setDate(isoDate());
      setNote('');
      setAccountId('');
      setPaymentMethod('');
      setReceiptId('');
    }
    const t = setTimeout(() => amountRef.current?.focus(), 260);
    return () => clearTimeout(t);
  }, [txSheet.open, editing]);

  useEffect(() => {
    if (txSheet.open && !editing && !accountId && activeAccounts.length) {
      setAccountId(activeAccounts[0].id);
    }
  }, [txSheet.open, activeAccounts, accountId, editing]);

  useEffect(() => {
    if (!txSheet.open) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeTxSheet();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [txSheet.open, closeTxSheet]);

  const typedCategories = useMemo(
    () => (categories || []).filter((c) => c.type === type).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)),
    [categories, type],
  );

  const minor = amountToMinorSafe(amount, currency);
  const canSave = minor > 0 && !!categoryId && !saving;

  const changeType = (nextType: TxType) => {
    setType(nextType);
    const stillValid = (categories || []).some((c) => c.id === categoryId && c.type === nextType);
    if (!stillValid) setCategoryId('');
  };

  const onAmountChange = (e: ChangeEvent<HTMLInputElement>): void => setAmount(sanitizeAmountInput(e.target.value, currency));

  const onPickReceipt = async (e: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file');
      return;
    }
    const id = await putReceipt(file);
    setReceiptId(id);
    toast.success('Receipt attached');
  };

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const payload = {
        type,
        amount: minor,
        currencyCode: currency,
        categoryId,
        accountId,
        date,
        note: note.trim(),
        paymentMethod,
        receiptPhotoPath: receiptId,
      };
      if (editing) {
        await saveTransaction(editing.id, payload);
        if (editing.receiptPhotoPath && editing.receiptPhotoPath !== receiptId) {
          await deleteReceipt(editing.receiptPhotoPath);
        }
        toast.success('Transaction updated');
      } else {
        await addTransaction(payload);
        toast.success('Transaction added');
      }
      closeTxSheet();
    } catch (err) {
      toast.error('Could not save this transaction');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (): void => {
    if (!editing) return;
    askConfirm({
      title: 'Delete this transaction?',
      description: 'It will be removed from your ledger and all totals updated.',
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: async () => {
        await softDeleteTransaction(editing.id);
        if (editing.receiptPhotoPath) await deleteReceipt(editing.receiptPhotoPath);
        closeTxSheet();
        toast.success('Transaction deleted');
      },
    });
  };

  return (
    <AnimatePresence>
      {txSheet.open ? (
        <motion.div
          key="sheet"
          className="fixed inset-0 z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div
            className="absolute inset-0 bg-black/65 backdrop-blur-[2px]"
            onClick={closeTxSheet}
            aria-hidden="true"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={editing ? 'Edit transaction' : 'Add transaction'}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 34, stiffness: 340 }}
            className="absolute inset-x-0 bottom-0 mx-auto max-h-[93vh] w-full max-w-lg overflow-y-auto rounded-t-[30px] border-t border-border bg-card pb-8 shadow-2xl md:inset-x-0 md:bottom-auto md:top-[5vh] md:max-w-4xl md:rounded-[28px] md:border md:pb-6"
          >
            <div className="sticky top-0 z-10 bg-card/95 px-5 pt-3 backdrop-blur-xl md:px-8 md:pt-5">
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border md:hidden" />
              <div className="flex items-center justify-between pb-2">
                <h2 className="text-[16px] font-bold">{editing ? 'Edit transaction' : 'New transaction'}</h2>
                <div className="flex items-center gap-1">
                  {editing ? (
                    <button
                      type="button"
                      onClick={handleDelete}
                      aria-label="Delete transaction"
                      className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-expense/10 hover:text-expense"
                    >
                      <Trash2 size={17} />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={closeTxSheet}
                    aria-label="Close"
                    className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            </div>

            <div className="px-5 md:grid md:grid-cols-2 md:items-start md:gap-x-8 md:px-8">
              {/* Type toggle */}
              <div className="relative mt-1 grid grid-cols-2 gap-1 rounded-2xl bg-secondary/60 p-1 md:col-span-2">
                {[
                  { value: 'expense', label: 'Expense' },
                  { value: 'income', label: 'Income' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => changeType(opt.value as TxType)}
                    className={cn(
                      'relative z-10 flex h-10 items-center justify-center rounded-xl text-[13.5px] font-semibold transition-colors',
                      type === opt.value
                        ? opt.value === 'income'
                          ? 'text-income'
                          : 'text-expense'
                        : 'text-muted-foreground',
                    )}
                  >
                    {type === opt.value ? (
                      <motion.span
                        layoutId="tx-type-pill"
                        className="absolute inset-0 rounded-xl bg-card shadow-sm"
                        transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                      />
                    ) : null}
                    <span className="relative">{opt.label}</span>
                  </button>
                ))}
              </div>

              {/* Left column — amount + category */}
              <div className="md:col-span-1">
              {/* Amount */}
              <div className="mt-5 flex items-baseline justify-center gap-1.5 md:mt-4">
                <span className="text-[22px] font-semibold text-muted-foreground">{moneySymbol(currency)}</span>
                <input
                  ref={amountRef}
                  value={amount}
                  onChange={onAmountChange}
                  inputMode="decimal"
                  placeholder="0"
                  aria-label="Amount"
                  className="tnum w-full max-w-[220px] border-0 bg-transparent p-0 text-center text-[42px] font-bold leading-none tracking-tight outline-none placeholder:text-muted-foreground/35"
                />
              </div>
              <p className="mt-2 text-center text-[11.5px] text-muted-foreground">
                {amount && minor === 0 ? 'Enter an amount greater than zero' : `Amount in ${currency}`}
              </p>

              {/* Category */}
              <div className="mt-6">
                <label className="text-[12px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Category
                </label>
                <div className="mt-2.5 grid grid-cols-4 gap-2">
                  {typedCategories.map((cat) => {
                    const selected = cat.id === categoryId;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategoryId(cat.id)}
                        className={cn(
                          'flex min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-2xl border px-1 py-2 transition-colors',
                          selected
                            ? 'border-primary/50 bg-primary/10'
                            : 'border-border bg-secondary/30 hover:bg-secondary/60',
                        )}
                      >
                        <span
                          className="flex h-8 w-8 items-center justify-center rounded-full"
                          style={{ backgroundColor: `${cat.color}22`, color: cat.color }}
                        >
                          <CategoryIcon name={cat.icon} size={16} />
                        </span>
                        <span
                          className={cn(
                            'w-full truncate px-0.5 text-center text-[10.5px] font-medium',
                            selected ? 'text-primary' : 'text-muted-foreground',
                          )}
                        >
                          {cat.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {typedCategories.length === 0 ? (
                  <p className="mt-3 text-[12.5px] text-muted-foreground">
                    No {type} categories yet. Add one in Settings → Categories.
                  </p>
                ) : null}
              </div>

              </div>

              {/* Right column — date, account, payment method, receipt */}
              <div className="md:col-span-1">
              {/* Date */}
              <div className="mt-5 flex items-center gap-2 md:mt-4">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  aria-label="Date"
                  className="field flex-1"
                />
                <button
                  type="button"
                  onClick={() => setDate(isoDate())}
                  className={cn('chip shrink-0', date === isoDate() && 'chip-active')}
                >
                  Today
                </button>
              </div>

              {/* Note */}
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a note (optional)"
                aria-label="Note"
                maxLength={140}
                className="field mt-3"
              />

              {/* Account */}
              <div className="mt-5">
                <label className="text-[12px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Account
                </label>
                <div className="no-scrollbar mt-2.5 flex gap-2 overflow-x-auto pb-1">
                  <button
                    type="button"
                    onClick={() => setAccountId('')}
                    className={cn('chip shrink-0', !accountId && 'chip-active')}
                  >
                    No account
                  </button>
                  {activeAccounts.map((acc) => (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => setAccountId(acc.id)}
                      className={cn('chip shrink-0', accountId === acc.id && 'chip-active')}
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: acc.color || '#9CA3AF' }}
                      />
                      {acc.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment method */}
              <div className="mt-4">
                <label className="text-[12px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Payment method
                </label>
                <div className="no-scrollbar mt-2.5 flex gap-2 overflow-x-auto pb-1">
                  {PAYMENT_METHODS.map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(paymentMethod === method ? '' : method)}
                      className={cn('chip shrink-0', paymentMethod === method && 'chip-active')}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              {/* Receipt */}
              <div className="mt-4">
                <label className="text-[12px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Receipt
                </label>
                <div className="mt-2.5 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-border bg-secondary/30 text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                  >
                    {receiptId ? (
                      <ReceiptImage receiptId={receiptId} className="h-full w-full object-cover" alt="Receipt preview" />
                    ) : (
                      <Camera size={20} />
                    )}
                  </button>
                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="text-[13px] font-medium text-primary"
                    >
                      {receiptId ? 'Replace photo' : 'Attach photo'}
                    </button>
                    <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                      Stored only on this device. Nothing is uploaded.
                    </p>
                  </div>
                  {receiptId ? (
                    <button
                      type="button"
                      onClick={() => setReceiptId('')}
                      aria-label="Remove receipt"
                      className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
                    >
                      <X size={16} />
                    </button>
                  ) : null}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={onPickReceipt}
                  className="hidden"
                />
              </div>
              </div>

              <button
                type="button"
                onClick={handleSave}
                disabled={!canSave}
                className="mt-6 h-12 w-full rounded-2xl bg-primary text-[15px] font-semibold text-primary-foreground transition-opacity disabled:opacity-40 md:col-span-2 md:mt-7"
              >
                {saving ? 'Saving…' : editing ? 'Save changes' : 'Save transaction'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
