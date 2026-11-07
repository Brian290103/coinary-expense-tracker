import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'framer-motion';
import { ensureSeeded, db, SETTINGS_ID } from '@/lib/db';
import { useAppStore } from '@/store/useAppStore';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import Fab from './Fab';
import TransactionSheet from './TransactionSheet';
import ConfirmHost from './ConfirmHost';

const ShellSkeleton = () => (
  <div className="mx-auto w-full max-w-lg animate-pulse px-4 pt-8">
    <div className="h-3 w-20 rounded bg-secondary" />
    <div className="mt-4 h-8 w-48 rounded bg-secondary" />
    <div className="mt-6 h-40 rounded-[28px] bg-secondary" />
    <div className="mt-4 h-32 rounded-3xl bg-secondary" />
  </div>
);

export default function AppShell() {
  const location = useLocation();
  const settings = useLiveQuery(() => db.settings.get(SETTINGS_ID), []);
  const setSettings = useAppStore((s) => s.setSettings);

  useEffect(() => {
    ensureSeeded();
  }, []);

  useEffect(() => {
    if (settings) setSettings(settings);
  }, [settings, setSettings]);

  useEffect(() => {
    if (!settings) return undefined;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const theme = settings.theme || 'dark';
      const isDark = theme === 'dark' || (theme === 'system' && mq.matches);
      document.documentElement.classList.toggle('dark', isDark);
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [settings]);

  if (settings === undefined) return <ShellSkeleton />;
  if (settings && !settings.onboarded) return <Navigate to="/onboarding" replace />;

  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="min-w-0 flex-1">
          <motion.main
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto w-full max-w-lg px-4 pb-32 md:max-w-none md:px-6 md:pb-12 lg:px-8 xl:max-w-[1320px] 2xl:max-w-[1440px]"
          >
            <Outlet />
          </motion.main>
        </div>
      </div>
      <Fab />
      <BottomNav />
      <TransactionSheet />
      <ConfirmHost />
    </div>
  );
}
