import { useCallback, useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Fingerprint, KeyRound, Loader2 } from 'lucide-react';
import { BiometricAuth, BiometryError, BiometryErrorType } from '@aparajita/capacitor-biometric-auth';
import { Capacitor } from '@capacitor/core';
import { db, SETTINGS_ID } from '@/lib/db';
import { verifyPin } from '@/lib/pin';
import { useAppStore } from '@/store/useAppStore';
import CategoryIcon from './CategoryIcon';
import PinPad from './PinPad';
import { cn } from '@/lib/utils';

export type LockMode = 'checking' | 'pin' | 'biometric';

interface LockScreenProps {
  mode: Exclude<LockMode, 'checking'>;
  profileName: string | null;
  profileIcon?: string;
  profileColor?: string;
  allowPinFallback: boolean;
  onUnlock: () => void;
  onUsePin: () => void;
}

export default function LockScreen({
  mode,
  profileName,
  profileIcon = 'wallet',
  profileColor = '#34D399',
  allowPinFallback,
  onUnlock,
  onUsePin,
}: LockScreenProps) {
  const activeProfileId = useAppStore((s) => s.activeProfileId);
  const settings = useLiveQuery(() => db.settings.get(SETTINGS_ID), [activeProfileId]);

  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(0);
  const attempted = useRef(false);

  const failPin = useCallback((): void => {
    setError('Wrong PIN — try again');
    setShake((n) => n + 1);
    setPin('');
  }, []);

  useEffect(() => {
    if (pin.length !== 4 || busy) return;
    let cancelled = false;
    (async () => {
      setBusy(true);
      try {
        const ok = await verifyPin(pin, settings?.profilePinSalt, settings?.profilePinHash);
        if (cancelled) return;
        if (ok) {
          setError('');
          onUnlock();
        } else {
          failPin();
        }
      } catch {
        if (!cancelled) failPin();
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pin, busy, settings, onUnlock, failPin]);

  const attemptBiometric = useCallback(async (): Promise<void> => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await BiometricAuth.authenticate({
        reason: 'Unlock Coinary',
        cancelTitle: 'Cancel',
        allowDeviceCredential: true,
        androidTitle: 'Unlock Coinary',
        androidSubtitle: 'Verify it\u2019s you to open your ledgers',
        iosFallbackTitle: 'Use passcode',
      });
      onUnlock();
    } catch (err) {
      if (err instanceof BiometryError && err.code === BiometryErrorType.userCancel) {
        setError('');
      } else {
        setError('Authentication failed — try again');
      }
    } finally {
      setBusy(false);
    }
  }, [busy, onUnlock]);

  useEffect(() => {
    attempted.current = false;
  }, [mode]);

  useEffect(() => {
    if (mode === 'biometric' && Capacitor.isNativePlatform() && !attempted.current) {
      attempted.current = true;
      void attemptBiometric();
    }
  }, [mode, attemptBiometric]);

  const addDigit = (digit: string): void => {
    setError('');
    setPin((prev) => (prev.length >= 4 ? prev : prev + digit));
  };

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background px-6">
      <div className="w-full max-w-xs">
        <div className="flex flex-col items-center text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-primary/12 text-primary">
            {mode === 'pin' ? (
              <span
                className="flex h-16 w-16 items-center justify-center rounded-[22px]"
                style={{ backgroundColor: `${profileColor}22`, color: profileColor }}
              >
                <CategoryIcon name={profileIcon} size={30} />
              </span>
            ) : (
              <Fingerprint size={30} />
            )}
          </span>
          <h1 className="mt-5 text-[22px] font-bold tracking-tight">
            {mode === 'pin' ? (profileName ? `Unlock ${profileName}` : 'Enter PIN') : 'Unlock Coinary'}
          </h1>
          <p className="mt-1.5 text-[13px] text-muted-foreground">
            {mode === 'pin'
              ? 'Enter your 4-digit profile PIN'
              : 'Verify it\u2019s you to open your ledgers'}
          </p>
        </div>

        {mode === 'pin' ? (
          <div key={shake} className={cn('mt-8', shake > 0 && 'animate-[shake_0.3s_ease]')}>
            <div className="flex items-center justify-center gap-3" aria-label="PIN progress">
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className={cn(
                    'h-3.5 w-3.5 rounded-full border transition-colors',
                    pin.length > i ? 'border-primary bg-primary' : 'border-border bg-secondary',
                  )}
                />
              ))}
            </div>
            {error ? <p className="mt-3 text-center text-[12.5px] font-medium text-expense">{error}</p> : null}
            <div className="mt-6">
              <PinPad onDigit={addDigit} onBackspace={() => setPin((p) => p.slice(0, -1))} disabled={busy} />
            </div>
          </div>
        ) : (
          <div className="mt-8 flex flex-col items-center gap-3">
            {busy ? (
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                <Loader2 size={22} className="animate-spin" />
              </span>
            ) : (
              <button
                type="button"
                onClick={() => void attemptBiometric()}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform active:scale-95"
                aria-label="Authenticate"
              >
                <Fingerprint size={24} />
              </button>
            )}
            {error ? <p className="text-center text-[12.5px] font-medium text-expense">{error}</p> : null}
            {allowPinFallback ? (
              <button
                type="button"
                onClick={onUsePin}
                className="mt-1 flex items-center gap-1.5 text-[13px] font-semibold text-muted-foreground"
              >
                <KeyRound size={14} /> Use profile PIN instead
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
