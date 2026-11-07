import { toast } from 'sonner';
import { db } from '@/lib/db';
import { buildBackup, buildCsv, downloadFile } from '@/lib/csv';
import { isoDate } from '@/lib/date';

export async function exportTransactionsCsv(currencyCode = 'USD'): Promise<void> {
  const [transactions, categories, accounts] = await Promise.all([
    db.transactions.filter((t) => !t.deletedAt).toArray(),
    db.categories.toArray(),
    db.accounts.toArray(),
  ]);
  if (transactions.length === 0) {
    toast.error('There is nothing to export yet');
    return;
  }
  downloadFile(
    `coinary-transactions-${isoDate()}.csv`,
    buildCsv(transactions, categories, accounts, currencyCode),
  );
  toast.success(`Exported ${transactions.length} transactions`);
}

export async function exportBackupJson(): Promise<void> {
  const payload = await buildBackup();
  downloadFile(
    `coinary-backup-${isoDate()}.json`,
    JSON.stringify(payload, null, 2),
    'application/json;charset=utf-8',
  );
  toast.success('Backup downloaded');
}
