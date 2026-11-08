import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowRight, ArrowUpRight, Coins, ShieldCheck, Smartphone, WifiOff } from 'lucide-react';
import { toast } from 'sonner';
import { db, ensureSeeded, seedAccountsForCurrency, SETTINGS_ID, updateSettings } from '@/lib/db';
import { setProfileCurrency } from '@/lib/profiles';
import { applyThemeClass } from '@/lib/theme';
import type { TxType } from '@/lib/db';
import { useAppStore } from '@/store/useAppStore';
import CurrencyPicker from '@/components/CurrencyPicker';
import { cn } from '@/lib/utils';

const STEPS = ['Welcome', 'Currency', 'Ready'];

export default function Onboarding() {
  const navigate = useNavigate();
  const openTxSheet = useAppStore((s) => s.openTxSheet);
  const setSettings = useAppStore((s) => s.setSettings);
  const existing = useLiveQuery(() => db.settings.get(SETTINGS_ID), []);

  const [step, setStep] = useState(0);
  const [currency, setCurrency] = useState('USD');
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    ensureSeeded();
  }, []);

  useEffect(() => {
    return applyThemeClass(existing?.theme);
  }, [existing?.theme]);

  useEffect(() => {
    if (existing?.activeCurrencyCode) setCurrency(existing.activeCurrencyCode);
  }, [existing?.activeCurrencyCode]);

  const finish = async (quickType: TxType | null) => {
    if (finishing) return;
    setFinishing(true);
    try {
      const updated = await updateSettings({ activeCurrencyCode: currency, onboarded: true });
      await seedAccountsForCurrency(currency);
      if (updated) setSettings(updated);
      const profileId = useAppStore.getState().activeProfileId;
      if (profileId) await setProfileCurrency(profileId, currency);
      if (quickType) openTxSheet(null, quickType);
      navigate('/', { replace: true });
    } catch {
      toast.error('Could not finish setup');
      setFinishing(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[520px] -translate-x-1/2 rounded-full bg-primary/10 blur-[110px]"
      />

      <div className="relative mx-auto flex w-full max-w-lg flex-1 flex-col px-6 pb-8 pt-8">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Coins size={15} strokeWidth={2.2} />
          </span>
          <span className="text-[12px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Coinary</span>
          <div className="ml-auto flex items-center gap-1.5">
            {STEPS.map((label, i) => (
              <span
                key={label}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-300',
                  i === step ? 'w-6 bg-primary' : 'w-1.5 bg-border',
                )}
              />
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {step === 0 ? (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-1 flex-col"
            >
              <div className="mt-14">
                <h1 className="text-[38px] font-extrabold leading-[1.05] tracking-tight">
                  Know where
                  <br />
                  your money goes.
                </h1>
                <p className="mt-4 max-w-[34ch] text-[14px] leading-relaxed text-muted-foreground">
                  A calm, private expense tracker. Every coin you record stays on this device — no accounts, no cloud,
                  no tracking.
                </p>
              </div>

              <div className="mt-10 space-y-2.5">
                {[
                  { icon: ShieldCheck, title: 'Private by design', text: 'Your ledger never leaves this device.' },
                  { icon: WifiOff, title: 'Works offline', text: 'No internet needed. Ever.' },
                  { icon: Smartphone, title: 'Fast to use', text: 'Log a transaction in seconds.' },
                ].map(({ icon: Icon, title, text }, i) => (
                  <motion.div
                    key={title}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.07, duration: 0.35 }}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon size={17} strokeWidth={1.9} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[13.5px] font-semibold leading-tight">{title}</p>
                      <p className="mt-0.5 text-[12px] text-muted-foreground">{text}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="mt-auto pt-10">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex h-13 min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-primary text-[15px] font-semibold text-primary-foreground transition-transform active:scale-[0.99]"
                >
                  Get started <ArrowRight size={17} />
                </button>
                <p className="mt-3 text-center text-[11px] text-muted-foreground">
                  Open source · MIT licensed · No data collection
                </p>
              </div>
            </motion.div>
          ) : null}

          {step === 1 ? (
            <motion.div
              key="currency"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-1 flex-col"
            >
              <div className="mt-9">
                <h2 className="text-[26px] font-bold leading-tight">Choose your currency</h2>
                <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                  Coinary labels your money in this currency. It never converts between currencies.
                </p>
              </div>

              <CurrencyPicker value={currency} onChange={setCurrency} />

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep(0)}
                  className="h-12 flex-1 rounded-2xl border border-border text-[14px] font-semibold text-muted-foreground"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex h-12 flex-[2] items-center justify-center gap-2 rounded-2xl bg-primary text-[15px] font-semibold text-primary-foreground"
                >
                  Continue <ArrowRight size={17} />
                </button>
              </div>
            </motion.div>
          ) : null}

          {step === 2 ? (
            <motion.div
              key="ready"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-1 flex-col"
            >
              <div className="mt-10">
                <h2 className="text-[26px] font-bold leading-tight">You're all set</h2>
                <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                  Start with a first entry, or jump straight into your ledger — you can add anything later.
                </p>
              </div>

              <div className="mt-8 space-y-2.5">
                <button
                  type="button"
                  disabled={finishing}
                  onClick={() => finish('expense')}
                  className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-4 py-4 text-left transition-colors hover:border-expense/40 disabled:opacity-50"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-expense/12 text-expense">
                    <ArrowUpRight size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-semibold">Add a first expense</span>
                    <span className="text-[12px] text-muted-foreground">Coffee, rent, anything you spent</span>
                  </span>
                  <ArrowRight size={16} className="text-muted-foreground" />
                </button>

                <button
                  type="button"
                  disabled={finishing}
                  onClick={() => finish('income')}
                  className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-4 py-4 text-left transition-colors hover:border-income/40 disabled:opacity-50"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-income/12 text-income">
                    <ArrowRight size={18} className="-rotate-45" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-semibold">Add a first income</span>
                    <span className="text-[12px] text-muted-foreground">Salary, freelance, a refund</span>
                  </span>
                  <ArrowRight size={16} className="text-muted-foreground" />
                </button>
              </div>

              <div className="mt-auto space-y-3 pt-10">
                <button
                  type="button"
                  disabled={finishing}
                  onClick={() => finish(null)}
                  className="h-12 w-full rounded-2xl bg-primary text-[15px] font-semibold text-primary-foreground disabled:opacity-50"
                >
                  {finishing ? 'Setting up…' : 'Go to my ledger'}
                </button>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="h-10 w-full text-[13px] font-medium text-muted-foreground"
                >
                  Change currency ({currency})
                </button>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
