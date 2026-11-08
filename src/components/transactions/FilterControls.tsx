import { useState, type Dispatch, type SetStateAction } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { BookmarkPlus, Check, Pencil, X } from 'lucide-react';
import { toast } from 'sonner';
import CategoryIcon from '@/components/CategoryIcon';
import { db, newId, nowIso, type Account, type Category, type TxFilters } from '@/lib/db';
import { amountToMinorSafe, fromMinor, sanitizeAmountInput } from '@/lib/money';
import { useAppStore } from '@/store/useAppStore';
import { PAYMENT_METHODS } from '@/lib/defaults';
import { cn } from '@/lib/utils';

export type { TxFilters };

export const EMPTY_FILTERS: TxFilters = {
  categoryId: '',
  accountId: '',
  paymentMethods: [],
  from: '',
  to: '',
};

const MAX_PRESETS = 10;

interface FilterControlsProps {
  filters: TxFilters;
  setFilters: Dispatch<SetStateAction<TxFilters>>;
  categories?: Category[];
  accounts?: Account[];
}

export default function FilterControls({ filters, setFilters, categories, accounts }: FilterControlsProps) {
  const settings = useAppStore((s) => s.settings);
  const currency = settings?.activeCurrencyCode || 'USD';
  const presets = useLiveQuery(() => db.filterPresets.orderBy('createdAt').toArray(), [], []);

  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [editingPresets, setEditingPresets] = useState(false);
  const [savingPreset, setSavingPreset] = useState(false);
  const [presetName, setPresetName] = useState('');

  const set = (patch: Partial<TxFilters>): void => {
    setActivePresetId(null);
    setFilters({ ...filters, ...patch });
  };

  const toggleMethod = (method: string): void => {
    const current = filters.paymentMethods || [];
    set({
      paymentMethods: current.includes(method)
        ? current.filter((m) => m !== method)
        : [...current, method],
    });
  };

  const setRange = (which: 'minAmount' | 'maxAmount', raw: string): void => {
    const cleaned = sanitizeAmountInput(raw, currency);
    const minor = cleaned ? amountToMinorSafe(cleaned, currency) : undefined;
    let { minAmount, maxAmount } = filters;
    if (which === 'minAmount') minAmount = minor;
    else maxAmount = minor;
    // Auto-swap an inverted range instead of erroring.
    if (minAmount != null && maxAmount != null && minAmount > maxAmount) {
      [minAmount, maxAmount] = [maxAmount, minAmount];
    }
    set({ minAmount, maxAmount });
  };

  const applyPreset = (id: string): void => {
    const preset = (presets || []).find((p) => p.id === id);
    if (!preset) return;
    setActivePresetId(id);
    // Normalize: presets saved by older versions may lack newer fields.
    const f = preset.filters || ({} as TxFilters);
    setFilters({
      ...EMPTY_FILTERS,
      ...f,
      paymentMethods: Array.isArray(f.paymentMethods) ? f.paymentMethods : [],
    });
  };

  const savePreset = async (): Promise<void> => {
    const name = presetName.trim().slice(0, 30);
    if (!name) {
      toast.error('Give this preset a name');
      return;
    }
    const existing = presets || [];
    if (existing.length >= MAX_PRESETS) {
      toast.error(`You can save up to ${MAX_PRESETS} presets`);
      return;
    }
    const ts = nowIso();
    const dupe = existing.find((p) => p.name.toLowerCase() === name.toLowerCase());
    if (dupe) {
      await db.filterPresets.update(dupe.id, { filters: { ...filters }, updatedAt: ts });
      setActivePresetId(dupe.id);
      toast.success('Preset updated');
    } else {
      const id = newId();
      await db.filterPresets.put({ id, name, filters: { ...filters }, createdAt: ts, updatedAt: ts });
      setActivePresetId(id);
      toast.success('Preset saved');
    }
    setPresetName('');
    setSavingPreset(false);
  };

  const deletePreset = async (id: string): Promise<void> => {
    await db.filterPresets.delete(id);
    if (activePresetId === id) setActivePresetId(null);
    toast.success('Preset deleted');
  };

  const expenseCats = (categories || []).filter((c) => c.type === 'expense');
  const incomeCats = (categories || []).filter((c) => c.type === 'income');

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Presets</p>
        {(presets || []).length > 0 ? (
          <button
            type="button"
            onClick={() => setEditingPresets((v) => !v)}
            className="flex items-center gap-1 text-[11.5px] font-semibold text-muted-foreground"
          >
            <Pencil size={12} /> {editingPresets ? 'Done' : 'Edit'}
          </button>
        ) : null}
      </div>
      <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto pb-1">
        {(presets || []).map((preset) => (
          <span
            key={preset.id}
            className={cn(
              'chip flex shrink-0 items-center gap-1.5 pr-2',
              activePresetId === preset.id && 'chip-active',
            )}
          >
            <button type="button" onClick={() => applyPreset(preset.id)} className="flex items-center gap-1.5">
              {activePresetId === preset.id ? <Check size={13} /> : null}
              {preset.name}
            </button>
            {editingPresets ? (
              <button
                type="button"
                onClick={() => void deletePreset(preset.id)}
                aria-label={`Delete preset ${preset.name}`}
                className="flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:text-expense"
              >
                <X size={12} />
              </button>
            ) : null}
          </span>
        ))}
        {savingPreset ? (
          <span className="chip flex shrink-0 items-center gap-1.5">
            <input
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="Preset name"
              aria-label="Preset name"
              maxLength={30}
              className="w-28 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground/60"
            />
            <button
              type="button"
              onClick={() => void savePreset()}
              className="text-[12px] font-bold text-primary"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setSavingPreset(false);
                setPresetName('');
              }}
              aria-label="Cancel saving preset"
              className="text-muted-foreground"
            >
              <X size={13} />
            </button>
          </span>
        ) : (
          <button type="button" onClick={() => setSavingPreset(true)} className="chip shrink-0">
            <BookmarkPlus size={13} /> Save current
          </button>
        )}
      </div>

      <p className="mt-5 text-[12px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Category</p>
      <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => set({ categoryId: '' })}
          className={cn('chip shrink-0', !filters.categoryId && 'chip-active')}
        >
          All
        </button>
        {[...expenseCats, ...incomeCats].map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => set({ categoryId: filters.categoryId === cat.id ? '' : cat.id })}
            className={cn('chip shrink-0', filters.categoryId === cat.id && 'chip-active')}
          >
            <CategoryIcon name={cat.icon} size={13} style={{ color: cat.color }} />
            {cat.name}
          </button>
        ))}
      </div>

      <p className="mt-5 text-[12px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Account</p>
      <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => set({ accountId: '' })}
          className={cn('chip shrink-0', !filters.accountId && 'chip-active')}
        >
          All
        </button>
        {(accounts || []).map((acc) => (
          <button
            key={acc.id}
            type="button"
            onClick={() => set({ accountId: filters.accountId === acc.id ? '' : acc.id })}
            className={cn('chip shrink-0', filters.accountId === acc.id && 'chip-active')}
          >
            {acc.name}
          </button>
        ))}
      </div>

      <p className="mt-5 text-[12px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Payment method
      </p>
      <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => set({ paymentMethods: [] })}
          className={cn('chip shrink-0', (filters.paymentMethods || []).length === 0 && 'chip-active')}
        >
          All
        </button>
        {PAYMENT_METHODS.map((method) => {
          const selected = (filters.paymentMethods || []).includes(method);
          return (
            <button
              key={method}
              type="button"
              onClick={() => toggleMethod(method)}
              className={cn('chip shrink-0', selected && 'chip-active')}
            >
              {selected ? <Check size={13} /> : null}
              {method}
            </button>
          );
        })}
      </div>

      <p className="mt-5 text-[12px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Amount range</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <label className="block">
          <span className="text-[11px] text-muted-foreground">Min</span>
          <input
            type="text"
            inputMode="decimal"
            value={filters.minAmount != null ? String(fromMinor(filters.minAmount, currency)) : ''}
            onChange={(e) => setRange('minAmount', e.target.value)}
            placeholder="No min"
            aria-label="Minimum amount"
            className="field mt-1 py-2.5 text-[13px]"
          />
        </label>
        <label className="block">
          <span className="text-[11px] text-muted-foreground">Max</span>
          <input
            type="text"
            inputMode="decimal"
            value={filters.maxAmount != null ? String(fromMinor(filters.maxAmount, currency)) : ''}
            onChange={(e) => setRange('maxAmount', e.target.value)}
            placeholder="No max"
            aria-label="Maximum amount"
            className="field mt-1 py-2.5 text-[13px]"
          />
        </label>
      </div>

      <p className="mt-5 text-[12px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Date range</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <label className="block">
          <span className="text-[11px] text-muted-foreground">From</span>
          <input
            type="date"
            value={filters.from}
            onChange={(e) => set({ from: e.target.value })}
            className="field mt-1 py-2.5 text-[13px]"
          />
        </label>
        <label className="block">
          <span className="text-[11px] text-muted-foreground">To</span>
          <input
            type="date"
            value={filters.to}
            onChange={(e) => set({ to: e.target.value })}
            className="field mt-1 py-2.5 text-[13px]"
          />
        </label>
      </div>
    </>
  );
}
