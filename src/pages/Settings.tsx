import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
  CalendarDays, ChevronRight, Coins, Database, FileDown, FileUp, Gift, Info, Palette, Repeat,
  ShieldCheck, Tags, Trash2, Wallet,
} from 'lucide-react';
import { IconBrandGithub } from '@tabler/icons-react';
import { toast } from 'sonner';
import { resetLedger, updateSettings } from '@/lib/db';
import { currencyMeta } from '@/lib/currencies';
import { exportBackupJson, exportTransactionsCsv } from '@/lib/exportData';
import { APP_VERSION, PRIVACY_NOTE } from '@/lib/appMeta';
import { useAppStore } from '@/store/useAppStore';
import PageHeader from '@/components/PageHeader';
import CurrencyDialog from '@/components/CurrencyDialog';
import ImportDialog from '@/components/ImportDialog';
import SettingsNav from '@/components/settings/SettingsNav';
import AutoBackupControls from '@/components/settings/AutoBackupControls';
import { cn } from '@/lib/utils';

interface SectionProps {
  id: string;
  title: string;
  children: ReactNode;
  danger?: boolean;
}

function Section({ id, title, children, danger }: SectionProps) {
  return (
    <section id={id ? `settings-${id}` : undefined} className="mb-4 scroll-mt-24">
      <h2 className="mb-2 px-1 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {title}
      </h2>
      <div
        className={cn(
          'surface divide-y divide-border/60 overflow-hidden px-1.5 py-1',
          danger && 'border-expense/40 bg-expense/5',
        )}
      >
        {children}
      </div>
    </section>
  );
}

interface RowProps {
  icon: LucideIcon;
  title: string;
  value?: string;
  onClick?: () => void;
  to?: string;
  danger?: boolean;
}

function Row({ icon: Icon, title, value, onClick, to, danger }: RowProps) {
  const content = (
    <>
      <span
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl',
          danger ? 'bg-expense/12 text-expense' : 'bg-secondary text-muted-foreground',
        )}
      >
        <Icon size={15} />
      </span>
      <span className={cn('min-w-0 flex-1 truncate text-[13.5px] font-medium', danger && 'text-expense')}>{title}</span>
      {value ? <span className="shrink-0 text-[12px] text-muted-foreground">{value}</span> : null}
      {onClick || to ? <ChevronRight size={15} className="shrink-0 text-muted-foreground" /> : null}
    </>
  );

  const className = cn(
    'flex min-h-[52px] w-full items-center gap-3 rounded-2xl px-2.5 py-2.5 text-left transition-colors hover:bg-secondary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
    danger && 'hover:bg-expense/10',
  );

  if (to) {
    return (
      <Link to={to} className={className}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}

export default function Settings() {
  const settings = useAppStore((s) => s.settings);
  const activeProfile = useAppStore((s) => s.activeProfile);
  const askConfirm = useAppStore((s) => s.askConfirm);
  const currency = settings?.activeCurrencyCode || 'USD';
  const meta = currencyMeta(currency);

  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [importMode, setImportMode] = useState<'csv' | 'json' | null>(null);

  const profileName = activeProfile?.name || 'this profile';
  const clearData = () => {
    askConfirm({
      title: `Clear all data in ${profileName}?`,
      description: `Every transaction, budget, account and category in ${profileName} will be deleted. Export a backup first if you might need it.`,
      confirmLabel: 'Continue',
      destructive: true,
      onConfirm: () =>
        askConfirm({
          title: 'This cannot be undone',
          description: `The ${profileName} ledger will be emptied and default categories restored.`,
          confirmLabel: 'Erase everything',
          destructive: true,
          onConfirm: async () => {
            await resetLedger({ keepSettings: true });
            toast.success('All ledger data cleared');
          },
        }),
    });
  };

  const themes = [
    { value: 'system', label: 'System' },
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
  ];

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle={activeProfile ? `${activeProfile.name} · local, private, yours` : 'Local, private, yours'}
      />

      <div className="md:grid md:grid-cols-[168px_minmax(0,1fr)] md:gap-6 lg:grid-cols-[224px_minmax(0,1fr)] lg:gap-8">
        <SettingsNav />

        <div className="min-w-0 md:max-w-2xl">
          <Section id="currency" title="Currency">
            <Row
              icon={Coins}
              title="Currency"
              value={`${meta.flag} ${currency}`}
              onClick={() => setCurrencyOpen(true)}
            />
          </Section>

          <Section id="appearance" title="Appearance">
            <div className="px-2.5 py-3">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
                  <Palette size={15} />
                </span>
                <span className="flex-1 text-[13.5px] font-medium">Theme</span>
                <span className="text-[11.5px] capitalize text-muted-foreground">{settings?.theme || 'dark'}</span>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-1 rounded-xl bg-secondary/60 p-1">
                {themes.map((theme) => (
                  <button
                    key={theme.value}
                    type="button"
                    onClick={() => updateSettings({ theme: theme.value as import('@/lib/db').ThemeName })}
                    className={cn(
                      'h-9 rounded-lg text-[12.5px] font-semibold transition-colors',
                      (settings?.theme || 'dark') === theme.value
                        ? 'bg-card text-foreground shadow-sm'
                        : 'text-muted-foreground',
                    )}
                  >
                    {theme.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="px-2.5 py-3">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
                  <CalendarDays size={15} />
                </span>
                <span className="flex-1 text-[13.5px] font-medium">Week starts on</span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-1 rounded-xl bg-secondary/60 p-1">
                {['sunday', 'monday'].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => updateSettings({ startOfWeek: option as import('@/lib/db').StartOfWeek })}
                    className={cn(
                      'h-9 rounded-lg text-[12.5px] font-semibold capitalize transition-colors',
                      (settings?.startOfWeek || 'monday') === option
                        ? 'bg-card text-foreground shadow-sm'
                        : 'text-muted-foreground',
                    )}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </Section>

          <Section id="categories" title="Categories">
            <Row icon={Tags} title="Categories" value="Add, edit, archive" to="/categories" />
          </Section>

          <Section id="accounts" title="Accounts">
            <Row icon={Wallet} title="Accounts" value="Cash, bank, cards" to="/accounts" />
          </Section>

          <Section id="goals" title="Savings goals">
            <Row icon={Gift} title="Goals" value="Wishlist targets" to="/goals" />
          </Section>

          <Section id="automations" title="Automations">
            <Row icon={Repeat} title="Recurring" value="Auto-posted rules" to="/recurring" />
          </Section>

          <Section id="data" title="Data & backup">
            <AutoBackupControls />
            <Row icon={FileDown} title="Export CSV" value="Transactions" onClick={() => exportTransactionsCsv(currency)} />
            <Row icon={Database} title="Export JSON backup" value="Everything" onClick={exportBackupJson} />
            <Row icon={FileUp} title="Import CSV" onClick={() => setImportMode('csv')} />
            <Row icon={FileUp} title="Import JSON backup" onClick={() => setImportMode('json')} />
            <p className="px-2.5 py-2 text-[11px] leading-relaxed text-muted-foreground">
              Exports always contain real amounts, even while amounts are hidden on screen.
            </p>
          </Section>

          <Section id="danger" title="Danger zone" danger>
            <Row icon={Trash2} title="Clear all data" value="Cannot be undone" onClick={clearData} danger />
          </Section>

          <Section id="about" title="About">
            <div className="px-3 py-3.5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                  <ShieldCheck size={17} />
                </span>
                <div>
                  <p className="text-[13.5px] font-semibold">Coinary · Expense Tracker &amp; Budget</p>
                  <p className="text-[11px] text-muted-foreground">Version {APP_VERSION} · MIT License</p>
                </div>
              </div>
              <p className="mt-3 text-[11.5px] leading-relaxed text-muted-foreground">
                An open-source, offline-first ledger. All data lives in your browser&apos;s IndexedDB on this
                device — no accounts, no cloud sync, no analytics. Amounts are stored as integer minor units, and
                currencies are display labels only: nothing is ever converted.
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {['React', 'Dexie', 'Recharts', 'Framer Motion', 'Tailwind', 'PapaParse'].map((tech) => (
                  <span
                    key={tech}
                    className="rounded-full border border-border px-2.5 py-1 text-[10.5px] text-muted-foreground"
                  >
                    {tech}
                  </span>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <IconBrandGithub size={12} />
                <span className="font-mono">coinary-expense-tracker</span>
              </div>
            </div>
          </Section>

          <div className="flex items-center justify-center gap-1.5 pb-4 text-[10.5px] text-muted-foreground">
            <Info size={11} />
            {PRIVACY_NOTE}
          </div>
        </div>
      </div>

      <CurrencyDialog open={currencyOpen} onClose={() => setCurrencyOpen(false)} />
      <ImportDialog open={importMode === 'csv'} mode="csv" onClose={() => setImportMode(null)} />
      <ImportDialog open={importMode === 'json'} mode="json" onClose={() => setImportMode(null)} />
    </div>
  );
}
