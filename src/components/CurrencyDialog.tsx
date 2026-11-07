import { useMemo, useState } from 'react';
import { Search, Check } from 'lucide-react';
import BottomSheet from './BottomSheet';
import { CURRENCIES, currencyMeta, searchCurrencies } from '@/lib/currencies';
import { db, updateSettings } from '@/lib/db';
import { useAppStore } from '@/store/useAppStore';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function CurrencyDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const settings = useAppStore((s) => s.settings);
  const askConfirm = useAppStore((s) => s.askConfirm);
  const active = settings?.activeCurrencyCode || 'USD';
  const [query, setQuery] = useState('');

  const results = useMemo(() => searchCurrencies(query), [query]);

  const choose = (code: string): void => {
    if (code === active) {
      onClose();
      return;
    }
    const meta = currencyMeta(code);
    onClose();
    askConfirm({
      title: 'Change ledger currency?',
      description: `Your existing transactions will remain unchanged and will now be displayed in ${meta.name} (${code}). No exchange-rate conversion will be applied.`,
      confirmLabel: 'Change currency',
      onConfirm: async () => {
        await updateSettings({ activeCurrencyCode: code });
        await db.transactions.toCollection().modify({ currencyCode: code });
        await db.budgets.toCollection().modify({ currencyCode: code });
        await db.accounts.toCollection().modify({ currencyCode: code });
        toast.success(`Ledger currency is now ${code}`);
      },
    });
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Ledger currency"
      subtitle="A display label only — Coinary never converts money"
    >
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search currency or code"
          aria-label="Search currencies"
          className="field pl-10"
        />
      </div>

      <div className="no-scrollbar mt-3 max-h-[52vh] overflow-y-auto rounded-2xl border border-border">
        {results.length === 0 ? (
          <p className="px-4 py-6 text-center text-[12.5px] text-muted-foreground">No currencies match.</p>
        ) : (
          results.map((c) => {
            const isActive = c.code === active;
            return (
              <button
                key={c.code}
                type="button"
                onClick={() => choose(c.code)}
                className={cn(
                  'flex min-h-[52px] w-full items-center gap-3 border-b border-border/60 px-4 text-left transition-colors last:border-b-0',
                  isActive ? 'bg-primary/8' : 'hover:bg-secondary/50',
                )}
              >
                <span className="text-[17px] leading-none">{c.flag}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-medium">{c.name}</span>
                  <span className="text-[11px] text-muted-foreground">{c.code} · {c.symbol}</span>
                </span>
                {isActive ? <Check size={16} className="text-primary" /> : null}
              </button>
            );
          })
        )}
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        {CURRENCIES.length} currencies supported. Amounts are stored exactly as entered.
      </p>
    </BottomSheet>
  );
}
