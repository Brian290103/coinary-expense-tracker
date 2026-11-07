import { ChevronsLeft, ChevronsRight, Wallet } from 'lucide-react';
import { updateSettings } from '@/lib/db';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';
import SidebarNav from './SidebarNav';
import SidebarFooter from './SidebarFooter';

export default function Sidebar() {
  const settings = useAppStore((s) => s.settings);
  const collapsed = !!settings?.sidebarCollapsed;

  return (
    <aside
      className={cn(
        'sticky top-0 hidden h-screen shrink-0 flex-col border-r border-border/70 bg-card/30 md:flex',
        collapsed ? 'w-[76px]' : 'w-[76px] lg:w-[248px] xl:w-[276px]',
      )}
    >
      <div
        className={cn(
          'flex items-center gap-2.5 pt-5',
          collapsed ? 'justify-center px-3' : 'justify-center px-3 lg:justify-start lg:px-5',
        )}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary">
          <Wallet size={18} strokeWidth={2} />
        </span>
        {!collapsed ? (
          <div className="hidden min-w-0 lg:block">
            <p className="font-heading text-[15px] font-extrabold leading-none tracking-tight">Coinary</p>
            <p className="mt-1 text-[9.5px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Ledger
            </p>
          </div>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => updateSettings({ sidebarCollapsed: !collapsed })}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-expanded={!collapsed}
        className="mt-3 hidden h-8 w-full items-center justify-center rounded-xl text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 lg:flex"
      >
        {collapsed ? (
          <ChevronsRight size={16} />
        ) : (
          <>
            <ChevronsLeft size={16} className="hidden lg:block" />
            <ChevronsRight size={16} className="lg:hidden" />
          </>
        )}
      </button>

      <SidebarNav collapsed={collapsed} />
      <SidebarFooter collapsed={collapsed} />
    </aside>
  );
}
