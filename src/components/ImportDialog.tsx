import { useRef, useState, type ChangeEvent } from 'react';
import { FileUp } from 'lucide-react';
import { toast } from 'sonner';
import BottomSheet from './BottomSheet';
import { formatMoney, toMinor } from '@/lib/money';
import { importCsvRows, parseCsvText, restoreBackup, validateRows, type BackupPayload, type InvalidRow, type ValidRow } from '@/lib/csv';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
  mode?: 'csv' | 'json';
}

interface ParsedState {
  valid: ValidRow[];
  invalid: InvalidRow[];
}

export default function ImportDialog({ open, onClose, mode = 'csv' }: ImportDialogProps) {
  const settings = useAppStore((s) => s.settings);
  const currency = settings?.activeCurrencyCode || 'USD';
  const locale = settings?.locale || 'en-US';
  const fileRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState('');
  const [parsed, setParsed] = useState<ParsedState | null>(null);
  const [backup, setBackup] = useState<BackupPayload | null>(null);
  const [createMissing, setCreateMissing] = useState(true);
  const [replaceAll, setReplaceAll] = useState(false);
  const [busy, setBusy] = useState(false);

  const reset = (): void => {
    setFileName('');
    setParsed(null);
    setBackup(null);
    setBusy(false);
  };

  const close = (): void => {
    reset();
    onClose();
  };

  const onPickFile = async (e: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setFileName(file.name);

    try {
      const text = await file.text();
      if (mode === 'csv') {
        const { rows, errors } = parseCsvText(text);
        const { valid, invalid } = validateRows(rows);
        if (errors.length && rows.length === 0) {
          toast.error('That CSV could not be read');
          return;
        }
        setParsed({ valid, invalid });
      } else {
        const json = JSON.parse(text) as BackupPayload;
        if (json?.format !== 'coinary-backup' || !json?.data) {
          toast.error('That file is not a Coinary backup');
          return;
        }
        setBackup(json);
      }
    } catch {
      toast.error(mode === 'csv' ? 'That CSV could not be read' : 'That file is not valid JSON');
    }
  };

  const runImport = async (): Promise<void> => {
    setBusy(true);
    try {
      if (mode === 'csv') {
        if (!parsed?.valid?.length) {
          toast.error('No valid rows to import');
          return;
        }
        const result = await importCsvRows(parsed.valid, {
          createMissingCategories: createMissing,
          activeCurrency: currency,
        });
        toast.success(
          `Imported ${result.imported} · skipped ${result.skipped} duplicate${result.skipped === 1 ? '' : 's'} · ${parsed.invalid.length} invalid`,
        );
      } else {
        if (!backup) {
          toast.error('No backup file selected');
          return;
        }
        const result = await restoreBackup(backup, { replace: replaceAll });
        toast.success(
          `Restored ${result.transactions} transactions, ${result.categories} categories and ${result.budgets} budgets`,
        );
      }
      close();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setBusy(false);
    }
  };

  const ready = mode === 'csv' ? !!parsed?.valid?.length : !!backup;

  return (
    <BottomSheet
      open={open}
      onClose={close}
      title={mode === 'csv' ? 'Import CSV' : 'Restore JSON backup'}
      subtitle={mode === 'csv' ? 'Dates, types and amounts are validated before saving' : 'Bring back everything from an export'}
      footer={
        <button
          type="button"
          onClick={runImport}
          disabled={!ready || busy}
          className="h-12 w-full rounded-2xl bg-primary text-[15px] font-semibold text-primary-foreground disabled:opacity-40"
        >
          {busy ? 'Importing…' : mode === 'csv' ? 'Import transactions' : 'Restore backup'}
        </button>
      }
    >
      <input ref={fileRef} type="file" accept={mode === 'csv' ? '.csv,text/csv' : '.json,application/json'} onChange={onPickFile} className="hidden" />

      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-secondary/30 px-4 py-7 text-center transition-colors hover:border-primary/40"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <FileUp size={18} />
        </span>
        <span className="text-[13.5px] font-semibold">{fileName || 'Choose a file'}</span>
        <span className="text-[11px] text-muted-foreground">
          {mode === 'csv' ? 'Columns: date, type, amount, currency, category, account, payment_method, note' : 'A .json file exported from Coinary'}
        </span>
      </button>

      {mode === 'csv' && parsed ? (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl border border-border p-3">
              <p className="text-[10.5px] uppercase tracking-wider text-muted-foreground">Ready</p>
              <p className="tnum mt-1 text-[18px] font-bold text-income">{parsed.valid.length}</p>
            </div>
            <div className="rounded-2xl border border-border p-3">
              <p className="text-[10.5px] uppercase tracking-wider text-muted-foreground">Invalid</p>
              <p className="tnum mt-1 text-[18px] font-bold text-expense">{parsed.invalid.length}</p>
            </div>
          </div>

          {parsed.valid.length > 0 ? (
            <div className="rounded-2xl border border-border">
              {parsed.valid.slice(0, 4).map((row) => (
                <div key={row.rowNumber} className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-2 text-[11.5px] last:border-b-0">
                  <span className="text-muted-foreground">
                    {row.date} · {row.category}
                  </span>
                  <span className={cn('tnum font-semibold', row.type === 'income' ? 'text-income' : 'text-expense')}>
                    {row.type === 'income' ? '+' : '−'}
                    {formatMoney(toMinor(row.amount, row.currency || currency), row.currency || currency, locale)}
                  </span>
                </div>
              ))}
              {parsed.valid.length > 4 ? (
                <p className="px-3 py-2 text-[10.5px] text-muted-foreground">+{parsed.valid.length - 4} more rows…</p>
              ) : null}
            </div>
          ) : null}

          {parsed.invalid.length > 0 ? (
            <div className="rounded-2xl bg-expense/8 px-3 py-2.5">
              <p className="text-[11px] font-semibold text-expense">Skipped rows</p>
              <ul className="mt-1 space-y-0.5">
                {parsed.invalid.slice(0, 3).map((row) => (
                  <li key={row.index} className="text-[10.5px] text-muted-foreground">
                    Row {row.index}: {row.reason}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <label className="flex items-center justify-between rounded-2xl border border-border bg-secondary/40 px-4 py-3">
            <span className="pr-3 text-[12.5px]">Create categories that don't exist yet</span>
            <input
              type="checkbox"
              checked={createMissing}
              onChange={(e) => setCreateMissing(e.target.checked)}
              className="h-5 w-5 shrink-0 accent-[hsl(var(--primary))]"
            />
          </label>
          <p className="text-[10.5px] leading-relaxed text-muted-foreground">
            Duplicate rows are detected and skipped. Existing transactions are never overwritten.
          </p>
        </div>
      ) : null}

      {mode === 'json' && backup ? (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ['Transactions', backup.data.transactions?.length || 0],
                ['Categories', backup.data.categories?.length || 0],
                ['Accounts', backup.data.accounts?.length || 0],
                ['Budgets', backup.data.budgets?.length || 0],
              ] as [string, number][]
            ).map(([label, count]) => (
              <div key={label} className="rounded-2xl border border-border p-3">
                <p className="text-[10.5px] uppercase tracking-wider text-muted-foreground">{label}</p>
                <p className="tnum mt-1 text-[18px] font-bold">{count}</p>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            {(
              [
                { value: false, label: 'Merge into my current data' },
                { value: true, label: 'Replace everything on this device' },
              ] as { value: boolean; label: string }[]
            ).map((option) => (
              <button
                key={String(option.value)}
                type="button"
                onClick={() => setReplaceAll(option.value)}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-2xl border px-4 py-3 text-left text-[12.5px]',
                  replaceAll === option.value ? 'border-primary/50 bg-primary/8' : 'border-border',
                )}
              >
                <span
                  className={cn(
                    'flex h-4 w-4 items-center justify-center rounded-full border',
                    replaceAll === option.value ? 'border-primary' : 'border-muted-foreground/50',
                  )}
                >
                  {replaceAll === option.value ? <span className="h-2 w-2 rounded-full bg-primary" /> : null}
                </span>
                {option.label}
              </button>
            ))}
          </div>
          <p className="text-[10.5px] leading-relaxed text-muted-foreground">
            Receipt photos are stored separately and are not part of JSON backups.
          </p>
        </div>
      ) : null}
    </BottomSheet>
  );
}
