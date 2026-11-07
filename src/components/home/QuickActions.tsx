import { Link } from 'react-router-dom';
import { ArrowDownLeft, ArrowUpRight, PieChart } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

const base =
  'flex min-h-[44px] w-full items-center gap-2.5 rounded-2xl border border-border bg-secondary/30 px-3.5 text-[13px] font-medium text-foreground transition-colors hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50';

export default function QuickActions() {
  const openTxSheet = useAppStore((s) => s.openTxSheet);

  return (
    <section className="surface p-4">
      <h2 className="text-[14.5px] font-semibold">Quick actions</h2>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <button type="button" onClick={() => openTxSheet(null, 'expense')} className={base}>
          <ArrowUpRight size={15} className="shrink-0 text-expense" />
          Add expense
        </button>
        <button type="button" onClick={() => openTxSheet(null, 'income')} className={base}>
          <ArrowDownLeft size={15} className="shrink-0 text-income" />
          Add income
        </button>
        <Link to="/insights" className={base}>
          <PieChart size={15} className="shrink-0 text-primary" />
          View insights
        </Link>
      </div>
    </section>
  );
}
