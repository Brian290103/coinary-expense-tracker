import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { CalendarClock, ChevronRight } from 'lucide-react';
import { db } from '@/lib/db';
import { useAppStore } from '@/store/useAppStore';
import { getDueSoon } from '@/lib/recurring';
import { fullDate } from '@/lib/date';
import CategoryIcon from '@/components/CategoryIcon';

/** Compact strip on Home for rules running in the next few days. */
export default function DueStrip() {
  const activeProfileId = useAppStore((s) => s.activeProfileId);
  const due = useLiveQuery(() => getDueSoon(3), [activeProfileId], []);
  const categories = useLiveQuery(() => db.categories.toArray(), [activeProfileId], []);

  if (!due || due.length === 0) return null;
  const first = due[0];
  const cat = (categories || []).find((c) => c.id === first.categoryId);

  return (
    <Link to="/recurring" className="surface flex items-center gap-3 border-primary/25 bg-primary/5 p-3.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <CalendarClock size={16} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-semibold">
          {cat?.name || first.note || 'Recurring'} · {fullDate(first.nextRunDate)}
        </span>
        <span className="text-[11.5px] text-muted-foreground">
          Due soon{due.length > 1 ? ` (+${due.length - 1} more)` : ''} — tap to review
        </span>
      </span>
      {cat ? (
        <CategoryIcon name={cat.icon} size={15} style={{ color: cat.color }} />
      ) : (
        <ChevronRight size={15} className="shrink-0 text-muted-foreground" />
      )}
    </Link>
  );
}
