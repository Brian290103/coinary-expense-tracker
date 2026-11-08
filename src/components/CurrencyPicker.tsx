import { useMemo, useState } from 'react';
import { Check, Search } from 'lucide-react';
import { currencyMeta, searchCurrencies } from '@/lib/currencies';
import { cn } from '@/lib/utils';

interface CurrencyPickerProps {
  value: string;
  onChange: (code: string) => void;
  autoFocus?: boolean;
}

/** Shared currency search + list, used by Onboarding and the profile sheet. */
export default function CurrencyPicker({ value, onChange, autoFocus = false }: CurrencyPickerProps) {
  const [query, setQuery] = useState('');
  const results = useMemo(() => searchCurrencies(query), [query]);
  const selected = currencyMeta(value);

  return (
    <>
      <div className="relative mt-5">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search currency or code"
          aria-label="Search currencies"
          autoFocus={autoFocus}
          className="field pl-10"
        />
      </div>

      <div className="no-scrollbar mt-3 max-h-[38vh] flex-1 overflow-y-auto rounded-2xl border border-border">
        {results.length === 0 ? (
          <p className="px-4 py-6 text-center text-[12.5px] text-muted-foreground">
            No currencies match “{query}”.
          </p>
        ) : (
          results.map((c) => {
            const active = c.code === value;
            return (
              <button
                key={c.code}
                type="button"
                onClick={() => onChange(c.code)}
                className={cn(
                  'flex min-h-[52px] w-full items-center gap-3 border-b border-border/60 px-4 text-left transition-colors last:border-b-0',
                  active ? 'bg-primary/8' : 'hover:bg-secondary/50',
                )}
              >
                <span className="text-[17px] leading-none">{c.flag}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-medium">{c.name}</span>
                  <span className="text-[11px] text-muted-foreground">{c.code} · {c.symbol}</span>
                </span>
                {active ? <Check size={16} className="text-primary" /> : null}
              </button>
            );
          })
        )}
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-2xl bg-secondary/50 px-4 py-3">
        <p className="text-[11.5px] leading-relaxed text-muted-foreground">
          Selected: <span className="font-semibold text-foreground">{selected.code}</span> — no exchange rates, no
          conversion, ever.
        </p>
      </div>
    </>
  );
}
