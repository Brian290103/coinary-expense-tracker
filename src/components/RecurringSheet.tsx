import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { toast } from 'sonner';
import BottomSheet from './BottomSheet';
import CategoryIcon from './CategoryIcon';
import { db, newId, nowIso, type RecurringFrequency, type RecurringRule, type TxType } from '@/lib/db';
import { advanceRunDate, todayKey } from '@/lib/recurring';
import { isoDate } from '@/lib/date';
import { amountToMinorSafe, fromMinor, moneySymbol, sanitizeAmountInput } from '@/lib/money';
import { PAYMENT_METHODS } from '@/lib/defaults';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';

const FREQUENCIES: { value: RecurringFrequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

interface RecurringSheetProps {
  open: boolean;
  onClose: () => void;
  rule: RecurringRule | null;
}

export default function RecurringSheet({ open, onClose, rule }: RecurringSheetProps) {
  const settings = useAppStore((s) => s.settings);
  const askConfirm = useAppStore((s) => s.askConfirm);
  const currency = settings?.activeCurrencyCode || 'USD';

  const categories = useLiveQuery(() => db.categories.toArray(), [], []);
  const accounts = useLiveQuery(() => db.accounts.filter((a) => !a.isArchived).toArray(), [], []);

  const [type, setType] = useState<TxType>('expense');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [startDate, setStartDate] = useState(isoDate());
  const [frequency, setFrequency] = useState<RecurringFrequency>('monthly');
  const [dayOfMonth, setDayOfMonth] = useState('1');
  const [note, setNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setType(rule?.type || 'expense');
    setAmount(rule ? String(fromMinor(rule.amount, rule.currencyCode || currency)) : '');
    setCategoryId(rule?.categoryId || '');
    setAccountId(rule?.accountId || '');
    setStartDate(rule?.nextRunDate || isoDate());
    setFrequency(rule?.frequency || 'monthly');
    setDayOfMonth(String(rule?.dayOfMonth || new Date().getDate()));
    setNote(rule?.note || '');
    setPaymentMethod(rule?.paymentMethod || '');
  }, [open, rule, currency]);

  const typedCategories = useMemo(
    () => (categories || []).filter((c) => c.type === type).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)),
    [categories, type],
  );

  const minor = amountToMinorSafe(amount, currency);
  const canSave = minor > 0 && !!categoryId && !!accountId && !saving;

  const changeType = (nextType: TxType): void => {
    setType(nextType);
    const stillValid = (categories || []).some((c) => c.id === categoryId && c.type === nextType);
    if (!stillValid) setCategoryId('');
  };

  const onAmountChange = (e: ChangeEvent<HTMLInputElement>): void =>
    setAmount(sanitizeAmountInput(e.target.value, currency));

  const handleSave = async (): Promise<void> => {
    if (!canSave) return;
    setSaving(true);
    try {
      const ts = nowIso();
      const start = startDate || todayKey();
      const firstRun = start < todayKey() ? todayKey() : start;
      const payload = {
        type,
        amount: minor,
        currencyCode: currency,
        categoryId,
        accountId,
        note: note.trim(),
        paymentMethod,
        frequency,
        dayOfMonth: frequency === 'monthly' ? Math.min(Math.max(Number(dayOfMonth) || 1, 1), 28) : undefined,
        nextRunDate: firstRun,
        updatedAt: ts,
      };
      if (rule) {
        await db.recurring.update(rule.id, payload);
        toast.success('Recurring rule updated');
      } else {
        await db.recurring.put({ id: newId(), isActive: true, createdAt: ts, ...payload });
        toast.success('Recurring rule created');
      }
      onClose();
    } catch {
      toast.error('Could not save this rule');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (): void => {
    if (!rule) return;
    askConfirm({
      title: 'Delete this rule?',
      description: 'Already-posted transactions stay in your ledger. Only future runs stop.',
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: async () => {
        await db.recurring.delete(rule.id);
        onClose();
        toast.success('Recurring rule deleted');
      },
    });
  };

  const previewNext = startDate
    ? advanceRunDate(
        { frequency, dayOfMonth: Math.min(Math.max(Number(dayOfMonth) || 1, 1), 28) },
        startDate < todayKey() ? todayKey() : startDate,
      )
    : null;

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={rule ? 'Edit recurring rule' : 'New recurring rule'}
      subtitle="Posted automatically as real transactions on schedule"
      footer={
        <div className="space-y-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="h-12 w-full rounded-2xl bg-primary text-[15px] font-semibold text-primary-foreground disabled:opacity-40"
          >
            {saving ? 'Saving…' : rule ? 'Save changes' : 'Create rule'}
          </button>
          {rule ? (
            <button
              type="button"
              onClick={handleDelete}
              className="h-10 w-full text-[13px] font-semibold text-expense"
            >
              Delete rule
            </button>
          ) : null}
        </div>
      }
    >
      <div className="grid grid-cols-2 gap-1 rounded-2xl bg-secondary/60 p-1">
        {(['expense', 'income'] as TxType[]).map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => changeType(opt)}
            className={cn(
              'h-10 rounded-xl text-[13px] font-semibold capitalize transition-colors',
              type === opt ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground',
            )}
          >
            {opt}
          </button>
        ))}
      </div>

      <div className="mt-3 flex items-baseline gap-1.5 rounded-2xl border border-border bg-secondary/40 px-4 py-3">
        <span className="text-[16px] font-semibold text-muted-foreground">{moneySymbol(currency)}</span>
        <input
          value={amount}
          onChange={onAmountChange}
          inputMode="decimal"
          placeholder="0"
          aria-label="Amount"
          className="tnum w-full bg-transparent text-[26px] font-bold leading-none outline-none placeholder:text-muted-foreground/40"
        />
      </div>

      <p className="mt-5 text-[12px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Category</p>
      <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto pb-1">
        {typedCategories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setCategoryId(cat.id)}
            className={cn('chip shrink-0', categoryId === cat.id && 'chip-active')}
          >
            <CategoryIcon name={cat.icon} size={13} style={{ color: cat.color }} />
            {cat.name}
          </button>
        ))}
      </div>

      <p className="mt-5 text-[12px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Account</p>
      <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto pb-1">
        {(accounts || []).map((acc) => (
          <button
            key={acc.id}
            type="button"
            onClick={() => setAccountId(acc.id)}
            className={cn('chip shrink-0', accountId === acc.id && 'chip-active')}
          >
            {acc.name}
          </button>
        ))}
      </div>

      <p className="mt-5 text-[12px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Repeats</p>
      <div className="mt-2 grid grid-cols-3 gap-1 rounded-xl bg-secondary/60 p-1">
        {FREQUENCIES.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setFrequency(opt.value)}
            className={cn(
              'h-9 rounded-lg text-[12px] font-semibold transition-colors',
              frequency === opt.value ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground',
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <label className="block">
          <span className="text-[11px] text-muted-foreground">First run</span>
          <input
            type="date"
            value={startDate}
            min={todayKey()}
            onChange={(e) => setStartDate(e.target.value)}
            className="field mt-1 py-2.5 text-[13px]"
          />
        </label>
        {frequency === 'monthly' ? (
          <label className="block">
            <span className="text-[11px] text-muted-foreground">Day of month</span>
            <input
              type="number"
              min={1}
              max={28}
              value={dayOfMonth}
              onChange={(e) => setDayOfMonth(e.target.value)}
              className="field mt-1 py-2.5 text-[13px]"
            />
          </label>
        ) : (
          <div className="flex items-end pb-1">
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              {previewNext ? `Following runs from ${previewNext}` : 'Pick a start date'}
            </p>
          </div>
        )}
      </div>

      <div className="mt-2 grid gap-2">
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note (optional)"
          aria-label="Note"
          maxLength={80}
          className="field py-2.5 text-[13px]"
        />
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setPaymentMethod('')}
            className={cn('chip shrink-0', !paymentMethod && 'chip-active')}
          >
            Any method
          </button>
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
    </BottomSheet>
  );
}
