import { motion } from 'framer-motion';
import type { Category, Transaction } from '@/lib/db';
import CategoryIcon from './CategoryIcon';
import { formatMasked } from '@/lib/privacy';
import { useAmountsVisible } from '@/hooks/useAmountsVisible';
import { dayLabel } from '@/lib/date';
import { cn } from '@/lib/utils';

interface TransactionRowProps {
  tx: Transaction;
  category?: Category;
  accountName?: string;
  currency: string;
  locale: string;
  index?: number;
  onSelect?: (tx: Transaction) => void;
}

export default function TransactionRow({ tx, category, accountName, currency, locale, index = 0, onSelect }: TransactionRowProps) {
  const visible = useAmountsVisible();
  const title = category?.name || (tx.type === 'income' ? 'Income' : 'Expense');
  const subtitleParts = [
    tx.note ? tx.note : null,
    accountName || null,
    tx.paymentMethod || null,
  ].filter(Boolean);
  const subtitle = subtitleParts.length ? subtitleParts.join(' · ') : dayLabel(tx.date, locale);
  const color = category?.color || '#9CA3AF';

  return (
    <motion.button
      type="button"
      onClick={() => onSelect?.(tx)}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: Math.min(index * 0.025, 0.25) }}
      className="flex min-h-[56px] w-full items-center gap-3 rounded-2xl px-1 py-2.5 text-left transition-colors hover:bg-secondary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
    >
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: `${color}22`, color }}
      >
        <CategoryIcon name={category?.icon} size={17} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-medium leading-tight">{title}</span>
        <span className="mt-1 block truncate text-[11.5px] text-muted-foreground">{subtitle}</span>
      </span>
      <span
        className={cn(
          'tnum shrink-0 text-[14px] font-semibold',
          tx.type === 'income' ? 'text-income' : 'text-expense',
        )}
      >
        {tx.type === 'income' ? '+' : '−'}
        {formatMasked(tx.amount, currency || tx.currencyCode, locale, visible)}
      </span>
    </motion.button>
  );
}
