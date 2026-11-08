import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Gift, Plus } from 'lucide-react';
import { db, type Goal } from '@/lib/db';
import { useAppStore } from '@/store/useAppStore';
import { formatMasked } from '@/lib/privacy';
import { useAmountsVisible } from '@/hooks/useAmountsVisible';
import PageHeader from '@/components/PageHeader';
import GoalSheet from '@/components/GoalSheet';
import GoalContributeSheet from '@/components/GoalContributeSheet';
import CategoryIcon from '@/components/CategoryIcon';
import EmptyState from '@/components/EmptyState';
import { cn } from '@/lib/utils';

function daysLeft(deadline: string | undefined): number | null {
  if (!deadline) return null;
  const diff = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000);
  return Number.isFinite(diff) ? diff : null;
}

function GoalCard({
  goal,
  currency,
  locale,
  visible,
  onEdit,
  onContribute,
}: {
  goal: Goal;
  currency: string;
  locale: string;
  visible: boolean;
  onEdit: () => void;
  onContribute: () => void;
}) {
  const pct = goal.targetAmount > 0 ? Math.min(goal.savedAmount / goal.targetAmount, 1) : 0;
  const remaining = Math.max(goal.targetAmount - goal.savedAmount, 0);
  const left = daysLeft(goal.deadline);
  const complete = remaining <= 0 && goal.targetAmount > 0;
  const perDay = left !== null && left > 0 && remaining > 0 ? Math.ceil(remaining / left) : null;

  return (
    <div className="surface p-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Edit ${goal.name}`}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-transform active:scale-95"
          style={{ backgroundColor: `${goal.color}22`, color: goal.color }}
        >
          <CategoryIcon name={goal.icon} size={20} />
        </button>
        <button type="button" onClick={onEdit} className="min-w-0 flex-1 text-left">
          <p className="truncate text-[15px] font-semibold">{goal.name}</p>
          <p className="tnum mt-0.5 text-[12.5px] text-muted-foreground">
            {formatMasked(goal.savedAmount, currency, locale, visible)}
            <span className="opacity-60"> of </span>
            {formatMasked(goal.targetAmount, currency, locale, visible)}
          </p>
        </button>
        <span
          className={cn(
            'tnum shrink-0 text-[14px] font-bold',
            complete ? 'text-income' : 'text-primary',
          )}
        >
          {Math.round(pct * 100)}%
        </span>
        {!complete ? (
          <button
            type="button"
            onClick={onContribute}
            aria-label={`Add to ${goal.name}`}
            title="Add contribution"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform active:scale-95"
          >
            <Plus size={17} />
          </button>
        ) : null}
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={cn('h-full rounded-full transition-all duration-500', complete ? 'bg-income' : 'bg-primary')}
          style={{ width: `${pct * 100}%` }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-[11.5px] text-muted-foreground">
        <span>
          {complete
            ? 'Complete — nicely done'
            : perDay !== null
              ? `${formatMasked(perDay, currency, locale, visible)}/day to hit it`
              : `${formatMasked(remaining, currency, locale, visible)} to go`}
        </span>
        {goal.deadline ? (
          <span className={left !== null && left < 0 ? 'text-expense' : undefined}>
            {left !== null && left < 0 ? `${Math.abs(left)}d overdue` : `by ${goal.deadline}`}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export default function Goals() {
  const settings = useAppStore((s) => s.settings);
  const currency = settings?.activeCurrencyCode || 'USD';
  const locale = settings?.locale || 'en-US';
  const visible = useAmountsVisible();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [contributing, setContributing] = useState<Goal | null>(null);

  const goals = useLiveQuery(() => db.goals.orderBy('createdAt').toArray(), [], []);

  // Incomplete goals first, completed sink to the bottom.
  const sorted = [...(goals || [])].sort((a, b) => {
    const aDone = a.targetAmount > 0 && a.savedAmount >= a.targetAmount ? 1 : 0;
    const bDone = b.targetAmount > 0 && b.savedAmount >= b.targetAmount ? 1 : 0;
    if (aDone !== bDone) return aDone - bDone;
    return String(a.createdAt).localeCompare(String(b.createdAt));
  });

  const openNew = (): void => {
    setEditing(null);
    setSheetOpen(true);
  };

  const openEdit = (goal: Goal): void => {
    setEditing(goal);
    setSheetOpen(true);
  };

  return (
    <div>
      <PageHeader
        title="Savings goals"
        subtitle="Wishlist targets — no ledger impact"
        action={
          <button
            type="button"
            onClick={openNew}
            aria-label="New goal"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground"
          >
            <Plus size={18} />
          </button>
        }
      />

      {!goals ? (
        <div className="mt-4 animate-pulse space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 rounded-3xl bg-secondary" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={Gift}
            title="No goals yet"
            description="Save for something you want — a phone, a trip, a buffer. Track progress here."
            action={
              <button
                type="button"
                onClick={openNew}
                className="inline-flex h-11 items-center gap-2 rounded-2xl bg-primary px-5 text-[14px] font-semibold text-primary-foreground"
              >
                <Plus size={16} /> New goal
              </button>
            }
          />
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              currency={currency}
              locale={locale}
              visible={visible}
              onEdit={() => openEdit(goal)}
              onContribute={() => setContributing(goal)}
            />
          ))}
        </div>
      )}

      <GoalSheet open={sheetOpen} onClose={() => setSheetOpen(false)} goal={editing} />
      <GoalContributeSheet
        open={contributing !== null}
        onClose={() => setContributing(null)}
        goal={contributing}
      />
    </div>
  );
}
