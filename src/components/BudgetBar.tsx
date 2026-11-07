import { motion } from 'framer-motion';
import type { Budget } from '@/lib/db';
import { formatMoney } from '@/lib/money';

interface BudgetBarProps {
  budget: Budget;
  categoryName?: string;
  categoryColor?: string;
  spent: number;
  currency: string;
  locale: string;
  onClick?: () => void;
}

export default function BudgetBar({ budget, categoryName, categoryColor, spent, currency, locale, onClick }: BudgetBarProps) {
  const limit = Number(budget.limitAmount) || 0;
  const pct = limit > 0 ? spent / limit : 0;
  const remaining = limit - spent;
  const over = spent > limit && limit > 0;
  const tone = over ? 'hsl(var(--expense))' : pct >= 0.8 ? 'hsl(var(--warn))' : 'hsl(var(--primary))';

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full min-h-[44px] rounded-2xl py-1 text-left transition-opacity active:opacity-70"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: categoryColor || tone }} />
          <span className="truncate text-[13.5px] font-medium">{categoryName}</span>
        </div>
        <span className="tnum shrink-0 text-[12px] text-muted-foreground">
          {formatMoney(spent, currency, locale)} <span className="opacity-50">of</span> {formatMoney(limit, currency, locale)}
        </span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(pct, 1) * 100}%` }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="h-full rounded-full"
          style={{ backgroundColor: tone }}
        />
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[11.5px]">
        <span style={{ color: tone }}>{over ? 'Over budget' : `${Math.round(pct * 100)}% used`}</span>
        <span className="tnum text-muted-foreground">
          {over
            ? `${formatMoney(Math.abs(remaining), currency, locale)} over`
            : `${formatMoney(Math.max(remaining, 0), currency, locale)} left`}
        </span>
      </div>
    </button>
  );
}
