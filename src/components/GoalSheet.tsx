import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import BottomSheet from './BottomSheet';
import CategoryIcon, { ICON_OPTIONS } from './CategoryIcon';
import { db, newId, nowIso, type Goal } from '@/lib/db';
import { amountToMinorSafe, fromMinor, moneySymbol, sanitizeAmountInput } from '@/lib/money';
import { useAppStore } from '@/store/useAppStore';
import { CATEGORY_COLORS } from '@/lib/defaults';
import { cn } from '@/lib/utils';

interface GoalSheetProps {
  open: boolean;
  onClose: () => void;
  goal: Goal | null;
}

export default function GoalSheet({ open, onClose, goal }: GoalSheetProps) {
  const settings = useAppStore((s) => s.settings);
  const currency = settings?.activeCurrencyCode || 'USD';

  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [saved, setSaved] = useState('');
  const [icon, setIcon] = useState('gift');
  const [color, setColor] = useState(CATEGORY_COLORS[1]);
  const [deadline, setDeadline] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(goal?.name || '');
    setTarget(goal ? String(fromMinor(goal.targetAmount, currency)) : '');
    setSaved(goal ? String(fromMinor(goal.savedAmount, currency)) : '');
    setIcon(goal?.icon || 'gift');
    setColor(goal?.color || CATEGORY_COLORS[1]);
    setDeadline(goal?.deadline || '');
  }, [open, goal, currency]);

  const targetMinor = amountToMinorSafe(target, currency);
  const savedMinor = Math.max(amountToMinorSafe(saved || '0', currency), 0);
  const canSave = !!name.trim() && targetMinor > 0 && !saving;

  const handleSave = async (): Promise<void> => {
    if (!canSave) return;
    setSaving(true);
    try {
      const ts = nowIso();
      const wasComplete = !!goal && goal.targetAmount > 0 && goal.savedAmount >= goal.targetAmount;
      if (goal) {
        await db.goals.update(goal.id, {
          name: name.trim(),
          targetAmount: targetMinor,
          savedAmount: savedMinor,
          icon,
          color,
          deadline: deadline || undefined,
          updatedAt: ts,
        });
        const nowComplete = targetMinor > 0 && savedMinor >= targetMinor;
        toast.success(nowComplete && !wasComplete ? 'Goal achieved — nicely done!' : 'Goal updated');
      } else {
        const nowComplete = targetMinor > 0 && savedMinor >= targetMinor;
        await db.goals.put({
          id: newId(),
          name: name.trim(),
          targetAmount: targetMinor,
          savedAmount: savedMinor,
          icon,
          color,
          deadline: deadline || undefined,
          createdAt: ts,
          updatedAt: ts,
        });
        toast.success(nowComplete ? 'Goal created — already achieved!' : 'Goal created');
      }
      onClose();
    } catch {
      toast.error('Could not save this goal');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!goal) return;
    await db.goals.delete(goal.id);
    onClose();
    toast.success('Goal deleted');
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={goal ? 'Edit goal' : 'New savings goal'}
      subtitle="A wishlist target — saving here never touches your ledger"
      footer={
        <div className="space-y-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="h-12 w-full rounded-2xl bg-primary text-[15px] font-semibold text-primary-foreground disabled:opacity-40"
          >
            {saving ? 'Saving…' : goal ? 'Save changes' : 'Create goal'}
          </button>
          {goal ? (
            <button
              type="button"
              onClick={handleDelete}
              className="h-10 w-full text-[13px] font-semibold text-expense"
            >
              Delete goal
            </button>
          ) : null}
        </div>
      }
    >
      <div className="flex items-center gap-3">
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
          style={{ backgroundColor: `${color}22`, color }}
        >
          <CategoryIcon name={icon} size={20} />
        </span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="What are you saving for?"
          aria-label="Goal name"
          maxLength={40}
          className="field"
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <label className="block">
          <span className="text-[11px] text-muted-foreground">Target ({moneySymbol(currency)})</span>
          <input
            value={target}
            onChange={(e) => setTarget(sanitizeAmountInput(e.target.value, currency))}
            inputMode="decimal"
            placeholder="0"
            aria-label="Target amount"
            className="field mt-1 py-2.5 text-[15px]"
          />
        </label>
        <label className="block">
          <span className="text-[11px] text-muted-foreground">Saved so far</span>
          <input
            value={saved}
            onChange={(e) => setSaved(sanitizeAmountInput(e.target.value, currency))}
            inputMode="decimal"
            placeholder="0"
            aria-label="Saved amount"
            className="field mt-1 py-2.5 text-[15px]"
          />
        </label>
      </div>

      <label className="mt-4 block">
        <span className="text-[11px] text-muted-foreground">Deadline (optional)</span>
        <input
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          className="field mt-1 py-2.5 text-[13px]"
        />
      </label>

      <p className="mt-5 text-[12px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Icon</p>
      <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto pb-1">
        {ICON_OPTIONS.slice(0, 24).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setIcon(option)}
            aria-label={option}
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border transition-colors',
              icon === option ? 'border-primary/50 bg-primary/10 text-primary' : 'border-border text-muted-foreground',
            )}
          >
            <CategoryIcon name={option} size={17} />
          </button>
        ))}
      </div>

      <p className="mt-4 text-[12px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Color</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {CATEGORY_COLORS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setColor(option)}
            aria-label={`Color ${option}`}
            className={cn(
              'h-8 w-8 rounded-full border-2 transition-transform',
              color === option ? 'scale-110 border-foreground' : 'border-transparent',
            )}
            style={{ backgroundColor: option }}
          />
        ))}
      </div>
    </BottomSheet>
  );
}
