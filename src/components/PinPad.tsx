import { Delete } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PinPadProps {
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  disabled?: boolean;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

/** Dumb phone-style numeric pad. Parent owns the value + dots. */
export default function PinPad({ onDigit, onBackspace, disabled = false }: PinPadProps) {
  const keyClass =
    'flex h-16 items-center justify-center rounded-2xl bg-secondary text-[22px] font-semibold transition-all active:scale-95 active:bg-primary/20 disabled:opacity-40';

  return (
    <div className="grid grid-cols-3 gap-2.5" aria-label="PIN pad">
      {KEYS.map((key) => (
        <button key={key} type="button" disabled={disabled} onClick={() => onDigit(key)} className={keyClass}>
          {key}
        </button>
      ))}
      <span aria-hidden="true" />
      <button type="button" disabled={disabled} onClick={() => onDigit('0')} className={keyClass}>
        0
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={onBackspace}
        aria-label="Delete digit"
        className={cn(keyClass, 'text-muted-foreground')}
      >
        <Delete size={20} />
      </button>
    </div>
  );
}
