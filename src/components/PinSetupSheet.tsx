import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import BottomSheet from './BottomSheet';
import PinPad from './PinPad';
import { db, SETTINGS_ID, updateSettings } from '@/lib/db';
import { hashPin, randomSalt, verifyPin } from '@/lib/pin';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';

type Step = 'menu' | 'current' | 'new' | 'confirm';

interface PinSetupSheetProps {
  open: boolean;
  onClose: () => void;
  profileName: string;
  locked: boolean;
}

function Dots({ count }: { count: number }) {
  return (
    <div className="flex items-center justify-center gap-3" aria-label="PIN progress">
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className={cn(
            'h-3.5 w-3.5 rounded-full border transition-colors',
            count > i ? 'border-primary bg-primary' : 'border-border bg-secondary',
          )}
        />
      ))}
    </div>
  );
}

export default function PinSetupSheet({ open, onClose, profileName, locked }: PinSetupSheetProps) {
  const setSettings = useAppStore((s) => s.setSettings);
  const [step, setStep] = useState<Step>(locked ? 'menu' : 'new');
  const [pin, setPin] = useState('');
  const [first, setFirst] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [pendingAction, setPendingAction] = useState<'change' | 'disable'>('change');

  useEffect(() => {
    if (!open) return;
    setStep(locked ? 'menu' : 'new');
    setPin('');
    setFirst('');
    setError('');
    setBusy(false);
  }, [open, locked]);

  const resetEntry = (): void => {
    setPin('');
    setError('');
  };

  const addDigit = (digit: string): void => {
    setError('');
    setPin((prev) => (prev.length >= 4 ? prev : prev + digit));
  };

  useEffect(() => {
    if (!open || pin.length !== 4 || busy) return;
    let cancelled = false;
    (async () => {
      setBusy(true);
      try {
        if (step === 'current') {
          const settings = await db.settings.get(SETTINGS_ID);
          const ok = await verifyPin(pin, settings?.profilePinSalt, settings?.profilePinHash);
          if (cancelled) return;
          if (!ok) {
            setError('Wrong PIN — try again');
            setPin('');
            return;
          }
          // Branch was chosen before entering current PIN.
          setStep(pendingAction === 'disable' ? 'menu' : 'new');
          setPin('');
          if (pendingAction === 'disable') {
            const updated = await updateSettings({ profileLockEnabled: false, profilePinHash: '', profilePinSalt: '' });
            if (updated) setSettings(updated);
            toast.success('Profile lock removed');
            onClose();
          }
        } else if (step === 'new') {
          if (cancelled) return;
          setFirst(pin);
          setPin('');
          setStep('confirm');
        } else if (step === 'confirm') {
          if (cancelled) return;
          if (pin !== first) {
            setError('PINs don\u2019t match — start again');
            setFirst('');
            setPin('');
            setStep('new');
            return;
          }
          const salt = randomSalt();
          const updated = await updateSettings({
            profileLockEnabled: true,
            profilePinSalt: salt,
            profilePinHash: await hashPin(pin, salt),
          });
          if (updated) setSettings(updated);
          toast.success(locked ? 'Profile PIN changed' : 'Profile lock enabled');
          onClose();
        }
      } catch {
        if (!cancelled) {
          setError('Something went wrong — try again');
          setPin('');
        }
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pin, open, busy, step, first, pendingAction, locked, onClose, setSettings]);

  const titles: Record<Step, string> = {
    menu: 'Profile lock',
    current: 'Confirm it\u2019s you',
    new: locked ? 'Choose a new PIN' : 'Choose a 4-digit PIN',
    confirm: 'Repeat the PIN',
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={titles[step]}
      subtitle={
        step === 'menu'
          ? `Manage the lock for \u201c${profileName}\u201d`
          : step === 'current'
            ? 'Enter the current PIN first'
            : 'If you forget it, only a backup can restore this profile'
      }
    >
      {step === 'menu' ? (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => {
              setPendingAction('change');
              resetEntry();
              setStep('current');
            }}
            className="h-12 w-full rounded-2xl bg-primary text-[15px] font-semibold text-primary-foreground"
          >
            Change PIN
          </button>
          <button
            type="button"
            onClick={() => {
              setPendingAction('disable');
              resetEntry();
              setStep('current');
            }}
            className="h-11 w-full text-[13px] font-semibold text-expense"
          >
            Remove lock
          </button>
        </div>
      ) : (
        <>
          <div className="py-2">
            <Dots count={pin.length} />
            {error ? <p className="mt-3 text-center text-[12.5px] font-medium text-expense">{error}</p> : null}
          </div>
          <div className="mt-4">
            <PinPad onDigit={addDigit} onBackspace={() => setPin((p) => p.slice(0, -1))} disabled={busy} />
          </div>
        </>
      )}
    </BottomSheet>
  );
}
