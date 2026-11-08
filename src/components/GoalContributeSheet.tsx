import { useEffect, useState, type ChangeEvent } from 'react';
import { toast } from 'sonner';
import BottomSheet from './BottomSheet';
import CategoryIcon from './CategoryIcon';
import { db, nowIso, type Goal } from '@/lib/db';
import { amountToMinorSafe, fromMinor, moneySymbol, sanitizeAmountInput, toMinor } from '@/lib/money';
import { formatMasked } from '@/lib/privacy';
import { useAmountsVisible } from '@/hooks/useAmountsVisible';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';

interface GoalContributeSheetProps {
  open: boolean;
  onClose: () => void;
  goal: Goal | null;
}

const QUICK_AMOUNTS = [500, 1000, 5000, 10000];

export default function GoalContributeSheet({ open, onClose, goal }: GoalContributeSheetProps) {
  const settings = useAppStore((s) => s.settings);
  const currency = settings?.activeCurrencyCode || 'USD';
  const locale = settings?.locale || 'en-US';
  const visible = useAmountsVisible();

  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setAmount('');
    setSaving(false);
  }, [open, goal]);

  if (!goal) return null;

  const minor = amountToMinorSafe(amount, currency);
  const newSaved = goal.savedAmount + minor;
  const pct = goal.targetAmount > 0 ? Math.min(newSaved / goal.targetAmount, 1) : 0;
  const wasComplete = goal.targetAmount > 0 && goal.savedAmount >= goal.targetAmount;
  const canSave = minor > 0 && !saving;

  const onAmountChange = (e: ChangeEvent<HTMLInputElement>): void =>
    setAmount(sanitizeAmountInput(e.target.value, currency));

  const addQuick = (major: number): void => {
    const current = amountToMinorSafe(amount || '0', currency);
    setAmount(String(fromMinor(current + toMinor(major, currency), currency)));
  };

  const handleAdd = async (): Promise<void> => {
    if (!canSave) return;
    setSaving(true);
    try {
      await db.goals.update(goal.id, { savedAmount: newSaved, updatedAt: nowIso() });
      toast.success(
        !wasComplete && goal.targetAmount > 0 && newSaved >= goal.targetAmount
          ? 'Contribution added — goal achieved!'
          : 'Contribution added',
      );
      onClose();
    } catch {
      toast.error('Could not add this contribution');
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={`Add to “${goal.name}”`}
      subtitle="Appends to what you've already saved — no maths needed"
      footer={
        <button
          type="button"
          onClick={handleAdd}
          disabled={!canSave}
          className="h-12 w-full rounded-2xl bg-primary text-[15px] font-semibold text-primary-foreground disabled:opacity-40"
        >
          {saving ? 'Adding…' : `Add ${formatMasked(minor, currency, locale, visible)}`}
        </button>
      }
    >
      <div className="flex items-center gap-3">
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
          style={{ backgroundColor: `${goal.color}22`, color: goal.color }}
        >
          <CategoryIcon name={goal.icon} size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="tnum truncate text-[15px] font-semibold">
            {formatMasked(goal.savedAmount, currency, locale, visible)}
            <span className="text-muted-foreground"> → {formatMasked(newSaved, currency, locale, visible)}</span>
          </p>
          <p className="tnum mt-0.5 text-[11.5px] text-muted-foreground">
            Target {formatMasked(goal.targetAmount, currency, locale, visible)} · {Math.round(pct * 100)}%
          </p>
        </div>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${pct * 100}%` }}
        />
      </div>

      <div className="mt-4 flex items-baseline gap-1.5 rounded-2xl border border-border bg-secondary/40 px-4 py-3">
        <span className="text-[16px] font-semibold text-muted-foreground">{moneySymbol(currency)}</span>
        <input
          value={amount}
          onChange={onAmountChange}
          inputMode="decimal"
          placeholder="0"
          aria-label="Contribution amount"
          className="tnum w-full bg-transparent text-[26px] font-bold leading-none outline-none placeholder:text-muted-foreground/40"
        />
      </div>

      <div className="mt-2.5 flex flex-wrap gap-2">
        {QUICK_AMOUNTS.map((quick) => (
          <button
            key={quick}
            type="button"
            onClick={() => addQuick(quick)}
            className={cn('chip', 'tnum')}
          >
            +{quick.toLocaleString()}
          </button>
        ))}
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        Quick chips add to whatever you've typed. Saving here only moves the goal's progress — your ledger is untouched.
      </p>
    </BottomSheet>
  );
}
