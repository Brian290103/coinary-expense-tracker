import { useAppStore } from '@/store/useAppStore';
import { formatMoney } from '@/lib/money';
import { cn } from '@/lib/utils';

interface MoneyProps {
  minor: number | string;
  code?: string;
  locale?: string;
  className?: string;
  signed?: boolean;
  compact?: boolean;
}

export default function Money({ minor, code, locale, className, signed = false, compact = false }: MoneyProps) {
  void compact;
  const settings = useAppStore((s) => s.settings);
  const currency = code || settings?.activeCurrencyCode || 'USD';
  const loc = locale || settings?.locale || 'en-US';
  const value = formatMoney(minor, currency, loc);
  const prefix = signed && Number(minor) > 0 ? '+' : '';
  return <span className={cn('tnum', className)}>{prefix}{value}</span>;
}
