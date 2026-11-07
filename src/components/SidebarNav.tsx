import { useState, type ComponentType } from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Download, Plus, Upload } from 'lucide-react';
import { NAV_ITEMS } from '@/lib/navigation';
import { useAppStore } from '@/store/useAppStore';
import { exportTransactionsCsv } from '@/lib/exportData';
import ImportDialog from './ImportDialog';
import { cn } from '@/lib/utils';

const itemBase =
  'group relative flex min-h-[44px] w-full items-center gap-3 rounded-2xl text-[13.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50';

export default function SidebarNav({ collapsed }: { collapsed: boolean }) {
  const settings = useAppStore((s) => s.settings);
  const openTxSheet = useAppStore((s) => s.openTxSheet);
  const [importMode, setImportMode] = useState<'csv' | 'json' | null>(null);
  const currency = settings?.activeCurrencyCode || 'USD';

  const layout = collapsed ? 'justify-center px-0' : 'justify-center px-0 lg:justify-start lg:px-3';

  const action = ({ label: text, icon: Icon, onClick }: { label: string; icon: ComponentType<{ size?: number | string; className?: string }>; onClick: () => void }) => (
    <button
      key={text}
      type="button"
      onClick={onClick}
      title={text}
      aria-label={text}
      className={cn(
        itemBase,
        layout,
        'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
      )}
    >
      <Icon size={17} className="shrink-0" />
      {!collapsed ? <span className="hidden truncate lg:inline">{text}</span> : null}
    </button>
  );

  return (
    <div className="mt-2 flex min-h-0 flex-1 flex-col overflow-y-auto px-3 pb-2">
      <nav aria-label="Primary">
        <ul className="space-y-1">
          {NAV_ITEMS.map(({ to, label: text, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === '/'}
                title={text}
                aria-label={text}
                className={({ isActive }) =>
                  cn(
                    itemBase,
                    layout,
                    isActive
                      ? 'bg-primary/12 text-primary'
                      : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && !collapsed ? (
                      <motion.span
                        layoutId="sidebar-active"
                        className="absolute left-0 top-1/2 hidden h-5 w-[3px] -translate-y-1/2 rounded-full bg-primary lg:block"
                        transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                      />
                    ) : null}
                    <Icon size={18} strokeWidth={isActive ? 2.2 : 1.9} className="shrink-0" />
                    {!collapsed ? <span className="hidden truncate lg:inline">{text}</span> : null}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-4 border-t border-border/60 pt-3">
        {!collapsed ? (
          <p className="mb-1.5 hidden px-1 text-[9.5px] font-semibold uppercase tracking-[0.2em] text-muted-foreground lg:block">
            Actions
          </p>
        ) : null}
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => openTxSheet(null)}
            title="Add transaction"
            aria-label="Add transaction"
            className={cn(
              'group relative flex min-h-[44px] w-full items-center gap-3 rounded-2xl bg-primary/10 text-[13px] font-semibold text-primary transition-colors hover:bg-primary/16 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
              layout,
            )}
          >
            <Plus size={17} className="shrink-0" />
            {!collapsed ? <span className="hidden truncate lg:inline">Add transaction</span> : null}
          </button>

          {action({
            label: 'Export data',
            icon: Download,
            onClick: () => exportTransactionsCsv(currency),
          })}
          {action({
            label: 'Import data',
            icon: Upload,
            onClick: () => setImportMode('csv'),
          })}
        </div>
      </div>

      <ImportDialog open={importMode === 'csv'} mode="csv" onClose={() => setImportMode(null)} />
      <ImportDialog open={importMode === 'json'} mode="json" onClose={() => setImportMode(null)} />
    </div>
  );
}
