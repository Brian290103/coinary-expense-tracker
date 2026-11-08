import { useCallback, useEffect, useState } from 'react';
import { DatabaseBackup, HardDriveDownload, History } from 'lucide-react';
import { toast } from 'sonner';
import { db, SETTINGS_ID, updateSettings } from '@/lib/db';
import {
  isNativeBackupSupported,
  listBackupFiles,
  restoreBackupFile,
  runAutoBackup,
  type BackupFile,
} from '@/lib/autoBackup';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';

export default function AutoBackupControls() {
  const settings = useAppStore((s) => s.settings);
  const activeProfileId = useAppStore((s) => s.activeProfileId);
  const setSettings = useAppStore((s) => s.setSettings);
  const askConfirm = useAppStore((s) => s.askConfirm);

  const native = isNativeBackupSupported();
  const enabled = !!settings?.autoBackupEnabled;
  const frequency = settings?.autoBackupFrequency || 'weekly';
  const locale = settings?.locale || 'en-US';

  const [busy, setBusy] = useState(false);
  const [files, setFiles] = useState<BackupFile[]>([]);
  const [mode, setMode] = useState<'merge' | 'replace'>('merge');

  const refresh = useCallback(async (): Promise<void> => {
    if (!native) return;
    setFiles(await listBackupFiles());
  }, [native]);

  useEffect(() => {
    void refresh();
  }, [refresh, activeProfileId]);

  const backUpNow = async (): Promise<void> => {
    if (!activeProfileId || busy) return;
    setBusy(true);
    try {
      const name = await runAutoBackup(activeProfileId);
      await refresh();
      toast.success(`Backup saved (${name})`);
    } catch {
      toast.error('Could not write the backup file');
    } finally {
      setBusy(false);
    }
  };

  const restore = (file: BackupFile): void => {
    askConfirm({
      title: `Restore ${file.name}?`,
      description:
        mode === 'replace'
          ? 'The current profile will be replaced entirely by this backup. This cannot be undone.'
          : 'This backup will be merged into the current profile. Existing entries are kept.',
      confirmLabel: mode === 'replace' ? 'Replace everything' : 'Merge backup',
      destructive: mode === 'replace',
      onConfirm: async () => {
        try {
          const message = await restoreBackupFile(file.name, mode === 'replace');
          const next = await db.settings.get(SETTINGS_ID);
          if (next) setSettings(next);
          toast.success(message);
        } catch {
          toast.error('That file is not a valid Coinary backup');
        }
      },
    });
  };

  if (!native) {
    return (
      <p className="px-2.5 py-2 text-[11px] leading-relaxed text-muted-foreground">
        Automatic backups are available in the Android/iOS app. On web, use Export JSON above.
      </p>
    );
  }

  return (
    <div className="px-2.5 py-3">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
            <DatabaseBackup size={15} />
          </span>
          <span className="text-[13.5px] font-medium">Automatic backup</span>
        </span>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => void updateSettings({ autoBackupEnabled: e.target.checked })}
          aria-label="Automatic backup"
          className="h-5 w-5 shrink-0 accent-[hsl(var(--primary))]"
        />
      </div>

      {enabled ? (
        <>
          <div className="mt-2 grid grid-cols-2 gap-1 rounded-xl bg-secondary/60 p-1">
            {(['daily', 'weekly'] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => void updateSettings({ autoBackupFrequency: option })}
                className={cn(
                  'h-9 rounded-lg text-[12.5px] font-semibold capitalize transition-colors',
                  frequency === option
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground',
                )}
              >
                {option}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            {settings?.lastBackupAt
              ? `Last backup: ${new Date(settings.lastBackupAt).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })}`
              : 'No automatic backup yet.'}{' '}
            Saved to Documents/Coinary/Backups.
          </p>
          <button
            type="button"
            onClick={() => void backUpNow()}
            disabled={busy}
            className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-border text-[13.5px] font-semibold disabled:opacity-40"
          >
            <HardDriveDownload size={15} /> {busy ? 'Saving…' : 'Back up now'}
          </button>

          {files.length > 0 ? (
            <div className="mt-3">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  <History size={12} /> Saved backups
                </p>
                <div className="flex gap-1 rounded-lg bg-secondary/60 p-0.5">
                  {(['merge', 'replace'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMode(m)}
                      className={cn(
                        'rounded-md px-2 py-1 text-[10.5px] font-semibold capitalize',
                        mode === m ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground',
                      )}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-2 divide-y divide-border/60 rounded-2xl border border-border">
                {files.map((file) => (
                  <div key={file.name} className="flex items-center gap-2 px-3 py-2.5">
                    <span className="tnum min-w-0 flex-1 truncate text-[12px]">{file.name}</span>
                    <span className="shrink-0 text-[10.5px] text-muted-foreground">
                      {file.mtime
                        ? new Date(file.mtime).toLocaleDateString(locale, { dateStyle: 'medium' })
                        : ''}
                    </span>
                    <button
                      type="button"
                      onClick={() => restore(file)}
                      className="shrink-0 rounded-lg px-2 py-1 text-[12px] font-bold text-primary"
                    >
                      Restore
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
