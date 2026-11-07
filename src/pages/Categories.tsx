import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronRight, Plus, Tags } from 'lucide-react';
import { db, type Category, type TxType } from '@/lib/db';
import PageHeader from '@/components/PageHeader';
import CategorySheet from '@/components/CategorySheet';
import CategoryIcon from '@/components/CategoryIcon';
import EmptyState from '@/components/EmptyState';
import { cn } from '@/lib/utils';

export default function Categories() {
  const [tab, setTab] = useState<TxType>('expense');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);

  const categories = useLiveQuery(() => db.categories.toArray(), [], []);
  const transactions = useLiveQuery(() => db.transactions.filter((t) => !t.deletedAt).toArray(), [], []);

  const counts: Record<string, number> = useMemo(() => {
    const map: Record<string, number> = {};
    (transactions || []).forEach((t) => {
      map[t.categoryId] = (map[t.categoryId] || 0) + 1;
    });
    return map;
  }, [transactions]);

  const list = (categories || [])
    .filter((c) => c.type === tab)
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  return (
    <div>
      <PageHeader
        title="Categories"
        subtitle="How you group your money"
        back="/settings"
        action={
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setSheetOpen(true);
            }}
            aria-label="New category"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground"
          >
            <Plus size={18} />
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-1 rounded-2xl bg-secondary/60 p-1">
        {(['expense', 'income'] as TxType[]).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setTab(option)}
            className={cn(
              'h-10 rounded-xl text-[13px] font-semibold capitalize transition-colors',
              tab === option ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground',
            )}
          >
            {option}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={Tags}
            title={`No ${tab} categories`}
            description="Create a category to start organizing your ledger."
          />
        </div>
      ) : (
        <div className="surface mt-4 divide-y divide-border/60 px-1.5 py-1">
          {list.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => {
                setEditing(category);
                setSheetOpen(true);
              }}
              className="flex min-h-[56px] w-full items-center gap-3 rounded-2xl px-2.5 py-2.5 text-left transition-colors hover:bg-secondary/40"
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: `${category.color}22`, color: category.color }}
              >
                <CategoryIcon name={category.icon} size={16} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-medium">{category.name}</span>
                <span className="text-[11px] text-muted-foreground">
                  {counts[category.id] || 0} {(counts[category.id] || 0) === 1 ? 'transaction' : 'transactions'}
                  {category.isDefault ? ' · default' : ''}
                </span>
              </span>
              <ChevronRight size={15} className="shrink-0 text-muted-foreground" />
            </button>
          ))}
        </div>
      )}

      <CategorySheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        category={editing}
        defaultType={tab}
      />
    </div>
  );
}
