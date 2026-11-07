import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronRight, Plus, Wallet } from 'lucide-react';
import { db, type Account } from '@/lib/db';
import { useAppStore } from '@/store/useAppStore';
import { formatMoney } from '@/lib/money';
import PageHeader from '@/components/PageHeader';
import AccountSheet from '@/components/AccountSheet';
import CategoryIcon from '@/components/CategoryIcon';
import EmptyState from '@/components/EmptyState';

export default function Accounts() {
  const settings = useAppStore((s) => s.settings);
  const currency = settings?.activeCurrencyCode || 'USD';
  const locale = settings?.locale || 'en-US';

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);

  const accounts = useLiveQuery(() => db.accounts.toArray(), [], []);
  const transactions = useLiveQuery(() => db.transactions.filter((t) => !t.deletedAt).toArray(), []);

  const balances: Record<string, number> = useMemo(() => {
    const map: Record<string, number> = {};
    (transactions || []).forEach((t) => {
      if (!t.accountId) return;
      map[t.accountId] = (map[t.accountId] || 0) + (t.type === 'income' ? t.amount : -t.amount);
    });
    return map;
  }, [transactions]);

  const active = (accounts || []).filter((a) => !a.isArchived);
  const archived = (accounts || []).filter((a) => a.isArchived);
  const total = active.reduce((sum, a) => sum + (balances[a.id] || 0), 0);

  const openNew = () => {
    setEditing(null);
    setSheetOpen(true);
  };

  return (
    <div>
      <PageHeader
        title="Accounts"
        subtitle="Cash, bank, cards and wallets"
        back="/settings"
        action={
          <button
            type="button"
            onClick={openNew}
            aria-label="New account"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground"
          >
            <Plus size={18} />
          </button>
        }
      />

      {active.length > 0 ? (
        <section className="surface mb-4 p-4">
          <p className="text-[11.5px] text-muted-foreground">Across your accounts</p>
          <p className="tnum mt-1.5 text-[26px] font-bold leading-none">{formatMoney(total, currency, locale)}</p>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Only transactions assigned to an account are counted here.
          </p>
        </section>
      ) : null}

      {active.length === 0 && archived.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No accounts yet"
          description="Add a cash wallet or bank account to track where your money lives."
          action={
            <button
              type="button"
              onClick={openNew}
              className="inline-flex h-11 items-center gap-2 rounded-2xl bg-primary px-5 text-[14px] font-semibold text-primary-foreground"
            >
              <Plus size={16} /> Add account
            </button>
          }
        />
      ) : (
        <div className="surface divide-y divide-border/60 px-1.5 py-1">
          {active.map((account) => (
            <button
              key={account.id}
              type="button"
              onClick={() => {
                setEditing(account);
                setSheetOpen(true);
              }}
              className="flex min-h-[58px] w-full items-center gap-3 rounded-2xl px-2.5 py-2.5 text-left transition-colors hover:bg-secondary/40"
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: `${account.color || '#9CA3AF'}22`, color: account.color || '#9CA3AF' }}
              >
                <CategoryIcon name={account.icon || 'wallet'} size={16} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-medium">{account.name}</span>
                <span className="text-[11px] capitalize text-muted-foreground">
                  {(account.type || 'other').replace('_', ' ')}
                </span>
              </span>
              <span className="tnum shrink-0 text-[13.5px] font-semibold">
                {formatMoney(balances[account.id] || 0, account.currencyCode || currency, locale)}
              </span>
              <ChevronRight size={15} className="shrink-0 text-muted-foreground" />
            </button>
          ))}
        </div>
      )}

      {archived.length > 0 ? (
        <>
          <h2 className="mb-2 mt-5 px-1 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Archived
          </h2>
          <div className="surface divide-y divide-border/60 px-1.5 py-1 opacity-60">
            {archived.map((account) => (
              <button
                key={account.id}
                type="button"
                onClick={() => {
                  setEditing(account);
                  setSheetOpen(true);
                }}
                className="flex min-h-[52px] w-full items-center gap-3 rounded-2xl px-2.5 py-2 text-left"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                  <CategoryIcon name={account.icon || 'wallet'} size={14} />
                </span>
                <span className="min-w-0 flex-1 truncate text-[13px]">{account.name}</span>
                <span className="tnum text-[12.5px] text-muted-foreground">
                  {formatMoney(balances[account.id] || 0, account.currencyCode || currency, locale)}
                </span>
              </button>
            ))}
          </div>
        </>
      ) : null}

      <AccountSheet open={sheetOpen} onClose={() => setSheetOpen(false)} account={editing} />
    </div>
  );
}
