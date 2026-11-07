import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { toast } from 'sonner';
import BottomSheet from './BottomSheet';
import CategoryIcon, { ICON_OPTIONS } from './CategoryIcon';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { db, newId, nowIso, reassignTransactions, type Category, type TxType } from '@/lib/db';
import { CATEGORY_COLORS } from '@/lib/defaults';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';

interface CategorySheetProps {
  open: boolean;
  onClose: () => void;
  category: Category | null;
  defaultType?: TxType;
}

export default function CategorySheet({ open, onClose, category, defaultType = 'expense' }: CategorySheetProps) {
  const askConfirm = useAppStore((s) => s.askConfirm);
  const categories = useLiveQuery(() => db.categories.toArray(), [], []);
  const [name, setName] = useState('');
  const [type, setType] = useState<TxType>(defaultType);
  const [icon, setIcon] = useState('tag');
  const [color, setColor] = useState(CATEGORY_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [reassignOpen, setReassignOpen] = useState(false);
  const [target, setTarget] = useState('');

  useEffect(() => {
    if (!open) return;
    setName(category?.name || '');
    setType(category?.type || defaultType);
    setIcon(category?.icon || 'tag');
    setColor(category?.color || CATEGORY_COLORS[0]);
    setTarget('');
  }, [open, category, defaultType]);

  const alternatives = (categories || []).filter(
    (c) => c.type === type && c.id !== category?.id,
  );

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error('Give this category a name');
      return;
    }
    setSaving(true);
    try {
      const ts = nowIso();
      if (category) {
        await db.categories.update(category.id, { name: trimmed, icon, color, updatedAt: ts });
        toast.success('Category updated');
      } else {
        const maxSort = Math.max(0, ...(categories || []).filter((c) => c.type === type).map((c) => c.sortOrder || 0));
        await db.categories.put({
          id: newId(),
          name: trimmed,
          type,
          icon,
          color,
          isDefault: false,
          isArchived: false,
          sortOrder: maxSort + 10,
          createdAt: ts,
          updatedAt: ts,
        });
        toast.success('Category created');
      }
      onClose();
    } catch (err) {
      toast.error('Could not save this category');
    } finally {
      setSaving(false);
    }
  };

  const performDelete = async (reassignTo: string | null): Promise<void> => {
    if (!category) return;
    if (reassignTo) await reassignTransactions(category.id, reassignTo);
    else if (reassignTo === '') await reassignTransactions(category.id, '');
    await db.categories.delete(category.id);
    setReassignOpen(false);
    onClose();
    toast.success('Category deleted');
  };

  const handleDelete = async () => {
    if (!category || !categories) return;
    const used = await db.transactions.where('categoryId').equals(category.id).count();
    if (used === 0) {
      askConfirm({
        title: `Delete “${category.name}”?`,
        description: 'This category is not used by any transaction.',
        confirmLabel: 'Delete',
        destructive: true,
        onConfirm: () => performDelete(null),
      });
      return;
    }
    setTarget(alternatives[0]?.id || '');
    setReassignOpen(true);
  };

  return (
    <>
      <BottomSheet
        open={open}
        onClose={onClose}
        title={category ? 'Edit category' : 'New category'}
        subtitle={category ? 'Rename, recolor or change the icon' : 'Group similar spending together'}
        footer={
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="h-12 w-full rounded-2xl bg-primary text-[15px] font-semibold text-primary-foreground disabled:opacity-40"
            >
              {saving ? 'Saving…' : category ? 'Save changes' : 'Create category'}
            </button>
            {category ? (
              <button type="button" onClick={handleDelete} className="h-10 w-full text-[13px] font-semibold text-expense">
                Delete category
              </button>
            ) : null}
          </div>
        }
      >
        {!category ? (
          <div className="mb-4 grid grid-cols-2 gap-1 rounded-2xl bg-secondary/60 p-1">
            {(['expense', 'income'] as TxType[]).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setType(opt)}
                className={cn(
                  'h-10 rounded-xl text-[13px] font-semibold capitalize transition-colors',
                  type === opt ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground',
                )}
              >
                {opt}
              </button>
            ))}
          </div>
        ) : null}

        <div className="flex items-center gap-3">
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
            style={{ backgroundColor: `${color}22`, color }}
          >
            <CategoryIcon name={icon} size={20} />
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Category name"
            aria-label="Category name"
            maxLength={30}
            className="field"
          />
        </div>

        <p className="mt-5 text-[12px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Icon</p>
        <div className="mt-2 grid grid-cols-8 gap-1.5">
          {ICON_OPTIONS.slice(0, 40).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setIcon(option)}
              aria-label={option}
              className={cn(
                'flex h-9 items-center justify-center rounded-xl border transition-colors',
                icon === option ? 'border-primary/50 bg-primary/10 text-primary' : 'border-border text-muted-foreground',
              )}
            >
              <CategoryIcon name={option} size={15} />
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
      </BottomSheet>

      <Dialog open={reassignOpen} onOpenChange={setReassignOpen}>
        <DialogContent className="max-w-sm rounded-[26px] border-border bg-card p-5">
          <DialogHeader>
            <DialogTitle className="font-heading text-[16px]">
              “{category?.name}” is used by transactions
            </DialogTitle>
            <DialogDescription className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">
              Choose what happens to those entries before the category is removed.
            </DialogDescription>
          </DialogHeader>
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="field mt-4"
            aria-label="Reassign transactions to"
          >
            <option value="">Keep transactions uncategorized</option>
            {alternatives.map((alt) => (
              <option key={alt.id} value={alt.id}>
                Move to {alt.name}
              </option>
            ))}
          </select>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => setReassignOpen(false)}
              className="h-11 flex-1 rounded-xl border border-border text-[13.5px] font-semibold text-muted-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => performDelete(target)}
              className="h-11 flex-1 rounded-xl bg-destructive text-[13.5px] font-semibold text-destructive-foreground"
            >
              Delete
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
