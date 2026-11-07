import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Coins, Database, Info, Palette, Tags, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

const SECTIONS = [
  { key: 'currency', label: 'Currency', icon: Coins },
  { key: 'appearance', label: 'Appearance', icon: Palette },
  { key: 'categories', label: 'Categories', icon: Tags, to: '/categories' },
  { key: 'accounts', label: 'Accounts', icon: Wallet, to: '/accounts' },
  { key: 'data', label: 'Data & backup', icon: Database },
  { key: 'about', label: 'About', icon: Info },
];

const base =
  'flex min-h-[40px] w-full items-center gap-2.5 rounded-xl px-3 text-[12.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50';

export default function SettingsNav() {
  const [active, setActive] = useState('currency');

  const jump = (key: string): void => {
    setActive(key);
    document.getElementById(`settings-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <nav aria-label="Settings sections" className="hidden md:sticky md:top-24 md:block md:self-start">
      <ul className="space-y-1">
        {SECTIONS.map(({ key, label, icon: Icon, to }) => {
          const cls = cn(
            base,
            active === key
              ? 'bg-primary/12 text-primary'
              : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
          );
          return (
            <li key={key}>
              {to ? (
                <Link to={to} className={cls}>
                  <Icon size={15} className="shrink-0" />
                  <span className="truncate">{label}</span>
                </Link>
              ) : (
                <button type="button" onClick={() => jump(key)} className={cls}>
                  <Icon size={15} className="shrink-0" />
                  <span className="truncate">{label}</span>
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
