import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { buildBackup, restoreBackup } from './csv';
import { nowIso, updateSettings } from './db';
import { useAppStore } from '@/store/useAppStore';

const BACKUP_DIR = 'Coinary/Backups';
const KEEP_FILES = 10;

export const isNativeBackupSupported = (): boolean => Capacitor.isNativePlatform();

export interface BackupFile {
  name: string;
  mtime: number;
}

const pad = (n: number): string => String(n).padStart(2, '0');

function fileTimestamp(d = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

export function isAutoBackupDue(
  settings: { autoBackupEnabled?: boolean; autoBackupFrequency?: 'daily' | 'weekly'; lastBackupAt?: string } | null,
  nowMs = Date.now(),
): boolean {
  if (!settings?.autoBackupEnabled) return false;
  if (!settings.lastBackupAt) return true;
  const elapsed = nowMs - new Date(settings.lastBackupAt).getTime();
  if (!Number.isFinite(elapsed) || elapsed < 0) return true;
  const interval = settings.autoBackupFrequency === 'daily' ? 24 * 3600000 : 7 * 24 * 3600000;
  return elapsed >= interval;
}

async function listBackupFilesRaw(): Promise<BackupFile[]> {
  try {
    const { files } = await Filesystem.readdir({ path: BACKUP_DIR, directory: Directory.Documents });
    return files
      .filter((f) => f.name.endsWith('.json') && f.type === 'file')
      .map((f) => ({ name: f.name, mtime: typeof f.mtime === 'number' ? f.mtime : 0 }))
      .sort((a, b) => (a.name < b.name ? 1 : -1));
  } catch {
    return [];
  }
}

async function pruneOldBackups(profileId: string): Promise<void> {
  const prefix = `coinary-backup-${profileId}-`;
  const files = await listBackupFilesRaw();
  const own = files.filter((f) => f.name.startsWith(prefix));
  for (const stale of own.slice(KEEP_FILES)) {
    try {
      await Filesystem.deleteFile({ path: `${BACKUP_DIR}/${stale.name}`, directory: Directory.Documents });
    } catch {
      // Best effort — a leftover file is harmless.
    }
  }
}

export async function runAutoBackup(profileId: string): Promise<string> {
  const payload = await buildBackup();
  const name = `coinary-backup-${profileId}-${fileTimestamp()}.json`;
  await Filesystem.writeFile({
    path: `${BACKUP_DIR}/${name}`,
    data: JSON.stringify(payload),
    directory: Directory.Documents,
    encoding: Encoding.UTF8,
    recursive: true,
  });
  const updated = await updateSettings({ lastBackupAt: nowIso() });
  if (updated) useAppStore.getState().setSettings(updated);
  await pruneOldBackups(profileId);
  return name;
}

/** Silent best-effort backup at boot. Never throws. */
export async function maybeAutoBackup(): Promise<void> {
  try {
    if (!isNativeBackupSupported()) return;
    const { settings, activeProfileId } = useAppStore.getState();
    if (!settings || !activeProfileId) return;
    if (!isAutoBackupDue(settings)) return;
    await runAutoBackup(activeProfileId);
  } catch {
    // A failed backup must never block boot or spam toasts.
  }
}

export async function listBackupFiles(): Promise<BackupFile[]> {
  if (!isNativeBackupSupported()) return [];
  return listBackupFilesRaw();
}

export async function restoreBackupFile(name: string, replace: boolean): Promise<string> {
  const { data } = await Filesystem.readFile({
    path: `${BACKUP_DIR}/${name}`,
    directory: Directory.Documents,
    encoding: Encoding.UTF8,
  });
  const payload = JSON.parse(data as string) as Parameters<typeof restoreBackup>[0];
  const result = await restoreBackup(payload, { replace });
  return `Restored ${result.transactions} transactions, ${result.budgets} budgets, ${result.goals} goals`;
}
