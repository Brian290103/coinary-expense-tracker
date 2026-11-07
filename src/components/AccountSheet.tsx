import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import BottomSheet from './BottomSheet';
import CategoryIcon from './CategoryIcon';
import { db, newId, nowIso, type Account } from '@/lib/db';
import { ACCOUNT_TYPES, CATEGORY_COLORS } from '@/lib/defaults';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';

interface AccountSheetProps {
  open: boolean;
  onClose: () => void;
  account: Account | null;
}

export default function AccountSheet({ open, onClose, account }: AccountSheetProps) {
  const settings = useAppStore((s) => s.settings);
  const askConfirm = useAppStore((s) => s.askConfirm);
  const currency = settings?.activeCurrencyCode || 'USD';

  const [name, setName] = useState('');
  const [type, setType] = useState('cash');
  const [color, setColor] = useState(CATEGORY_COLORS[3]);
  const [archived, setArchived] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(account?.name || '');
    setType(account?.type || 'cash');
    setColor(account?.color || CATEGORY_COLORS[3]);
    setArchived(!!account?.isArchived);
  }, [open, account]);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error('Give this account a name');
      return;
    }
    setSaving(true);
    try {
      const ts = nowIso();
      const icon = ACCOUNT_TYPES.find((t) => t.value === type)?.icon || 'wallet';
      if (account) {
        await db.accounts.update(account.id, { name: trimmed, type, icon, color, isArchived: archived, updatedAt: ts });
        toast.success('Account updated');
      } else {
        await db.accounts.put({
          id: newId(),
          name: trimmed,
          type,
          icon,
          color,
          currencyCode: currency,
          isArchived: false,
          createdAt: ts,
          updatedAt: ts,
        });
        toast.success('Account added');
      }
      onClose();
    } catch (err) {
      toast.error('Could not save this account');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!account) return;
    const used = await db.transactions.where('accountId').equals(account.id).count();
    if (used > 0) {
      toast.error('This account has transactions. Archive it instead.');
      return;
    }
    askConfirm({
      title: `Delete “${account.name}”?`,
      description: 'This account has no transactions and will be removed.',
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: async () => {
        await db.accounts.delete(account.id);
        onClose();
        toast.success('Account deleted');
      },
    });
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={account ? 'Edit account' : 'New account'}
      subtitle="A local place to keep your money"
      footer={
        <div className="space-y-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="h-12 w-full rounded-2xl bg-primary text-[15px] font-semibold text-primary-foreground disabled:opacity-40"
          >
            {saving ? 'Saving…' : account ? 'Save changes' : 'Add account'}
          </button>
          {account ? (
            <button type="button" onClick={handleDelete} className="h-10 w-full text-[13px] font-semibold text-expense">
              Delete account
            </button>
          ) : null}
        </div>
      }
    >
      <div className="flex items-center gap-3">
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
          style={{ backgroundColor: `${color}22`, color }}
        >
          <CategoryIcon name={ACCOUNT_TYPES.find((t) => t.value === type)?.icon} size={20} />
        </span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Account name"
          aria-label="Account name"
          maxLength={30}
          className="field"
        />
      </div>

      <p className="mt-5 text-[12px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Type</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {ACCOUNT_TYPES.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setType(option.value)}
            className={cn('chip', type === option.value && 'chip-active')}
          >
            <CategoryIcon name={option.icon} size={13} />
            {option.label}
          </button>
        ))}
      </div>

      <p className="mt-5 text-[12px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Color</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {CATEGORY_COLORS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setColor(option)}
            aria-label={`Color ${option}`}
            className={cn(
              'h-8 w-8 rounded-full border-2 transition-transform',
              color === option ? 'scale-110 border-foreground' : 'border-transparent',
            )}
            style={{ backgroundColor: option }}
          />
        ))}
      </div>

      {account ? (
        <label className="mt-5 flex items-center justify-between rounded-2xl border border-border bg-secondary/40 px-4 py-3">
          <span className="text-[13px] font-medium">Archive this account</span>
          <input
            type="checkbox"
            checked={archived}
            onChange={(e) => setArchived(e.target.checked)}
            className="h-5 w-5 accent-[hsl(var(--primary))]"
          />
        </label>
      ) : null}
    </BottomSheet>
  );
}
