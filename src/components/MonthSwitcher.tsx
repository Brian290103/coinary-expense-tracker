import { ChevronLeft, ChevronRight } from 'lucide-react';
import { monthLabel } from '@/lib/date';
import { cn } from '@/lib/utils';

interface MonthSwitcherProps {
  value: string;
  onChange: (delta: number) => void;
  locale?: string;
  disableNext?: boolean;
}

export default function MonthSwitcher({ value, onChange, locale = 'en-US', disableNext = false }: MonthSwitcherProps) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-1.5 py-1">
      <button
        type="button"
        onClick={() => onChange(-1)}
        aria-label="Previous month"
        className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      >
        <ChevronLeft size={17} />
      </button>
      <span className="text-[13.5px] font-semibold">{monthLabel(value, locale)}</span>
      <button
        type="button"
        onClick={() => onChange(1)}
        disabled={disableNext}
        aria-label="Next month"
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground',
          disableNext && 'opacity-30',
        )}
      >
        <ChevronRight size={17} />
      </button>
    </div>
  );
}
