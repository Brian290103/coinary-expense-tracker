import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { NAV_ITEMS } from '@/lib/navigation';
import { cn } from '@/lib/utils';

export default function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 md:hidden">
      <div className="mx-auto w-full max-w-lg border-t border-border bg-card/85 px-2 pb-safe backdrop-blur-xl">
        <ul className="flex items-stretch justify-around">
          {NAV_ITEMS.filter((item) => item.bottomBar).map(({ to, short, icon: Icon }) => (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  cn(
                    'relative flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-2xl px-1 pt-2 pb-1.5 text-[10.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
                    isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive ? (
                      <motion.span
                        layoutId="nav-active"
                        className="absolute inset-x-3 top-1 h-8 rounded-xl bg-primary/12"
                        transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                      />
                    ) : null}
                    <Icon size={19} strokeWidth={isActive ? 2.2 : 1.9} className="relative" />
                    <span className="relative tracking-[0.01em]">{short}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
