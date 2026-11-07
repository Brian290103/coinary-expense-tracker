import { cn } from '@/lib/utils';

export default function SidebarTip({ label, className }: { label: string; className?: string }) {
  return (
    <span
      className={cn(
        'pointer-events-none absolute left-full top-1/2 z-40 ml-2 -translate-y-1/2 whitespace-nowrap rounded-lg border border-border bg-popover px-2 py-1 text-[11.5px] font-medium text-popover-foreground opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100',
        className,
      )}
    >
      {label}
    </span>
  );
}
