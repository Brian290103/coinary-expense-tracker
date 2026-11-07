import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { toast } from 'sonner';
import BottomSheet from './BottomSheet';
import CategoryIcon from './CategoryIcon';
import { db, newId, nowIso } from '@/lib/db';
import type { Budget } from '@/lib/db';
import { amountToMinorSafe, fromMinor, moneySymbol, sanitizeAmountInput } from '@/lib/money';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';

interface BudgetSheetProps {
  open: boolean;
  onClose: () => void;
  month: string;
  monthName: string;
  budget: Budget | null;
}

export default function BudgetSheet({ open, onClose, month, monthName, budget }: BudgetSheetProps) {
  const settings = useAppStore((s) => s.settings);
  const askConfirm = useAppStore((s) => s.askConfirm);
  const currency = settings?.activeCurrencyCode || 'USD';
  const categories = useLiveQuery(() => db.categories.filter((c) => c.type === 'expense').toArray(), [], []);
  const monthBudgets = useLiveQuery(() => db.budgets.where('month').equals(month).toArray(), [month], []);

  const [categoryId, setCategoryId] = useState('');
  const [limit, setLimit] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCategoryId(budget?.categoryId || '');
    setLimit(budget ? String(fromMinor(budget.limitAmount, budget.currencyCode || currency)) : '');
  }, [open, budget, currency]);

  const takenIds = useMemo(
    () => new Set((monthBudgets || []).filter((b) => b.id !== budget?.id).map((b) => b.categoryId)),
    [monthBudgets, budget],
  );

  const available = (categories || []).filter((c) => !takenIds.has(c.id));
  const minor = amountToMinorSafe(limit, currency);
  const canSave = !!categoryId && minor > 0 && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const ts = nowIso();
      if (budget) {
        await db.budgets.update(budget.id, {
          categoryId,
          limitAmount: minor,
          currencyCode: currency,
          updatedAt: ts,
        });
        toast.success('Budget updated');
      } else {
        await db.budgets.put({
          id: newId(),
          categoryId,
          month,
          limitAmount: minor,
          currencyCode: currency,
          createdAt: ts,
          updatedAt: ts,
        });
        toast.success('Budget created');
      }
      onClose();
    } catch (err) {
      toast.error('Could not save this budget');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!budget) return;
    askConfirm({
      title: 'Delete this budget?',
      description: 'Your transactions stay untouched — only the monthly limit is removed.',
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: async () => {
        await db.budgets.delete(budget.id);
        onClose();
        toast.success('Budget deleted');
      },
    });
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={budget ? 'Edit budget' : 'New budget'}
      subtitle={`Monthly limit for ${monthName}`}
      footer={
        <div className="space-y-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="h-12 w-full rounded-2xl bg-primary text-[15px] font-semibold text-primary-foreground disabled:opacity-40"
          >
            {saving ? 'Saving…' : budget ? 'Save changes' : 'Create budget'}
          </button>
          {budget ? (
            <button
              type="button"
              onClick={handleDelete}
              className="h-10 w-full text-[13px] font-semibold text-expense"
            >
              Delete budget
            </button>
          ) : null}
        </div>
      }
    >
      <div className="flex items-baseline gap-1.5 rounded-2xl border border-border bg-secondary/40 px-4 py-3">
        <span className="text-[16px] font-semibold text-muted-foreground">{moneySymbol(currency)}</span>
        <input
          value={limit}
          onChange={(e) => setLimit(sanitizeAmountInput(e.target.value, currency))}
          inputMode="decimal"
          placeholder="0"
          aria-label="Budget limit"
          className="tnum w-full bg-transparent text-[26px] font-bold leading-none outline-none placeholder:text-muted-foreground/40"
        />
      </div>

      <p className="mt-5 text-[12px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Category</p>
      {available.length === 0 ? (
        <p className="mt-3 text-[12.5px] text-muted-foreground">
          Every expense category already has a budget this month.
        </p>
      ) : (
        <div className="mt-2.5 grid grid-cols-3 gap-2">
          {available.map((cat) => {
            const selected = cat.id === categoryId;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoryId(cat.id)}
                className={cn(
                  'flex min-h-[70px] flex-col items-center justify-center gap-1.5 rounded-2xl border px-1 py-2 transition-colors',
                  selected ? 'border-primary/50 bg-primary/10' : 'border-border bg-secondary/30',
                )}
              >
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-full"
                  style={{ backgroundColor: `${cat.color}22`, color: cat.color }}
                >
                  <CategoryIcon name={cat.icon} size={14} />
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
      )}
    </BottomSheet>
  );
}
