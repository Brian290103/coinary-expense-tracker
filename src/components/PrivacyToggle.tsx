import { Eye, EyeOff } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useAmountsVisible } from '@/hooks/useAmountsVisible';
import { cn } from '@/lib/utils';

export default function PrivacyToggle({ className }: { className?: string }) {
  const visible = useAmountsVisible();
  const toggle = useAppStore((s) => s.toggleAmountsVisibility);

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      aria-label={visible ? 'Hide amounts' : 'Show amounts'}
      title={visible ? 'Hide amounts' : 'Show amounts'}
      className={cn(
        'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:text-foreground',
        className,
      )}
    >
      {visible ? <Eye size={17} /> : <EyeOff size={17} />}
    </button>
  );
}
