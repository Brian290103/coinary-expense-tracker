import { useState } from 'react';
import { Coins, Lock, Moon, Sun } from 'lucide-react';
import { updateSettings } from '@/lib/db';
import { currencyMeta } from '@/lib/currencies';
import { APP_VERSION, PRIVACY_NOTE } from '@/lib/appMeta';
import { useAppStore } from '@/store/useAppStore';
import CurrencyDialog from './CurrencyDialog';
import SidebarTip from './SidebarTip';
import { cn } from '@/lib/utils';

export default function SidebarFooter({ collapsed }: { collapsed: boolean }) {
  const settings = useAppStore((s) => s.settings);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const currency = settings?.activeCurrencyCode || 'USD';
  const meta = currencyMeta(currency);
  const theme = settings?.theme || 'dark';
  const isDark = theme === 'dark' || theme === 'system';
  const layout = collapsed ? 'justify-center px-0' : 'justify-center px-0 lg:justify-start lg:px-3';

  return (
    <div className="mt-auto border-t border-border/60 px-3 pb-4 pt-3">
      <div className="space-y-1.5">
        <button
          type="button"
          onClick={() => setCurrencyOpen(true)}
          className={cn(
            'group relative flex min-h-[44px] w-full items-center gap-2.5 rounded-2xl border border-border bg-secondary/30 text-left transition-colors hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
            layout,
          )}
        >
          <Coins size={16} className="shrink-0 text-primary" />
          {!collapsed ? (
            <span className="hidden min-w-0 lg:block">
              <span className="block truncate text-[12.5px] font-semibold">
                {meta.flag} {currency}
              </span>
              <span className="block truncate text-[10px] text-muted-foreground">{meta.name}</span>
            </span>
          ) : null}
          <SidebarTip
            label={`${currency} · ${meta.name}`}
            className={collapsed ? undefined : 'lg:hidden'}
          />
        </button>

        <button
          type="button"
          onClick={() => updateSettings({ theme: isDark ? 'light' : 'dark' })}
          aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
          className={cn(
            'group relative flex min-h-[44px] w-full items-center gap-2.5 rounded-2xl text-[12.5px] font-medium text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
            layout,
          )}
        >
          {isDark ? <Moon size={16} className="shrink-0" /> : <Sun size={16} className="shrink-0" />}
          {!collapsed ? (
            <span className="hidden lg:inline">{isDark ? 'Dark' : 'Light'} theme</span>
          ) : null}
          <SidebarTip
            label={`${isDark ? 'Dark' : 'Light'} theme`}
            className={collapsed ? undefined : 'lg:hidden'}
          />
        </button>
      </div>

      {!collapsed ? (
        <div className="hidden space-y-1.5 px-1 pt-2 lg:block">
          <p className="flex items-start gap-1.5 text-[10.5px] leading-snug text-muted-foreground">
            <Lock size={11} className="mt-0.5 shrink-0 text-primary" />
            {PRIVACY_NOTE}
          </p>
          <p className="text-[10px] text-muted-foreground/70">Coinary v{APP_VERSION}</p>
        </div>
      ) : null}

      <CurrencyDialog open={currencyOpen} onClose={() => setCurrencyOpen(false)} />
    </div>
  );
}
