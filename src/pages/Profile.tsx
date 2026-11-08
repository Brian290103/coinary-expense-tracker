import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Capacitor } from '@capacitor/core';
import { BiometricAuth } from '@aparajita/capacitor-biometric-auth';
import { Check, ChevronRight, Fingerprint, Gift, KeyRound, Plus, Repeat, Settings as SettingsIcon, Tags, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { metaDb, MAX_PROFILES, getBiometricsEnabled, setBiometricsEnabled, switchProfile, type Profile } from '@/lib/profiles';
import { db, SETTINGS_ID } from '@/lib/db';
import { useAppStore } from '@/store/useAppStore';
import PageHeader from '@/components/PageHeader';
import ProfileSheet from '@/components/ProfileSheet';
import PinSetupSheet from '@/components/PinSetupSheet';
import CategoryIcon from '@/components/CategoryIcon';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-4">
      <h2 className="mb-2 px-1 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {title}
      </h2>
      <div className="surface divide-y divide-border/60 overflow-hidden px-1.5 py-1">{children}</div>
    </section>
  );
}

export default function ProfilePage() {
  const settings = useAppStore((s) => s.settings);
  const activeProfileId = useAppStore((s) => s.activeProfileId);
  const activeProfile = useAppStore((s) => s.activeProfile);
  const setActiveProfile = useAppStore((s) => s.setActiveProfile);
  const setSettings = useAppStore((s) => s.setSettings);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Profile | null>(null);
  const [switching, setSwitching] = useState(false);
  const [pinSheetOpen, setPinSheetOpen] = useState(false);
  const [biometricsOn, setBiometricsOn] = useState(false);
  const [biometryAvailable, setBiometryAvailable] = useState(false);

  const native = Capacitor.isNativePlatform();
  const profileLocked = !!(settings?.profileLockEnabled && settings?.profilePinHash);

  useEffect(() => {
    if (!native) return;
    BiometricAuth.checkBiometry()
      .then((info) => {
        setBiometryAvailable(info.isAvailable);
        return getBiometricsEnabled();
      })
      .then(setBiometricsOn)
      .catch(() => {
        setBiometryAvailable(false);
      });
  }, [native]);

  const profiles = useLiveQuery(() => metaDb.profiles.toArray(), [], []);
  const sorted = [...(profiles || [])].sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
  const atCap = sorted.length >= MAX_PROFILES;

  // Live counts for the active profile's own database.
  const txCount = useLiveQuery(() => db.transactions.filter((t) => !t.deletedAt).count(), [activeProfileId], 0);
  const accountCount = useLiveQuery(() => db.accounts.count(), [activeProfileId], 0);
  const goalCount = useLiveQuery(() => db.goals.count(), [activeProfileId], 0);

  const openNew = (): void => {
    setEditing(null);
    setSheetOpen(true);
  };

  const toggleBiometrics = async (next: boolean): Promise<void> => {
    if (next && native) {
      // Prove the user can actually authenticate before enabling the gate.
      try {
        await BiometricAuth.authenticate({
          reason: 'Enable biometric unlock for Coinary',
          cancelTitle: 'Cancel',
          allowDeviceCredential: true,
          androidTitle: 'Enable biometric unlock',
        });
      } catch {
        toast.error('Biometric setup cancelled');
        return;
      }
    }
    await setBiometricsEnabled(next);
    setBiometricsOn(next);
    toast.success(next ? 'Biometric unlock enabled' : 'Biometric unlock disabled');
  };

  const doSwitch = async (id: string): Promise<void> => {
    if (id === activeProfileId || switching) return;
    setSwitching(true);
    try {
      const profile = await switchProfile(id);
      setActiveProfile(profile);
      const next = await db.settings.get(SETTINGS_ID);
      if (next) setSettings(next);
    } catch {
      toast.error('Could not switch profile');
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Profile"
        subtitle="Who you're operating as"
        action={
          <button
            type="button"
            onClick={openNew}
            disabled={atCap}
            aria-label="New profile"
            title={atCap ? `Up to ${MAX_PROFILES} profiles` : 'New profile'}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
          >
            <Plus size={18} />
          </button>
        }
      />

      <div className="md:mx-auto md:max-w-2xl">
        <Section title={`Profiles · ${sorted.length}/${MAX_PROFILES}`}>
          {!profiles ? (
            <div className="animate-pulse space-y-2 px-2.5 py-3">
              {[0, 1].map((i) => (
                <div key={i} className="h-12 rounded-2xl bg-secondary" />
              ))}
            </div>
          ) : (
            sorted.map((p) => {
              const active = p.id === activeProfileId;
              return (
                <div key={p.id} className="flex min-h-[52px] w-full items-center gap-3 px-2.5 py-2.5">
                  <button
                    type="button"
                    onClick={() => void doSwitch(p.id)}
                    disabled={switching}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                      style={{ backgroundColor: `${p.color}22`, color: p.color }}
                    >
                      <CategoryIcon name={p.icon} size={17} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-medium">{p.name}</span>
                      <span className="text-[11px] text-muted-foreground">{p.currencyCode}</span>
                    </span>
                    {active ? <Check size={16} className="shrink-0 text-primary" /> : null}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(p);
                      setSheetOpen(true);
                    }}
                    className="shrink-0 rounded-xl px-2.5 py-1.5 text-[12px] font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground"
                  >
                    Edit
                  </button>
                </div>
              );
            })
          )}
        </Section>

        {activeProfile ? (
          <section className="surface mb-4 p-4">
            <div className="flex items-center gap-3">
              <span
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
                style={{ backgroundColor: `${activeProfile.color}22`, color: activeProfile.color }}
              >
                <CategoryIcon name={activeProfile.icon} size={22} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[16px] font-bold">{activeProfile.name}</p>
                <p className="text-[12px] text-muted-foreground">{activeProfile.currencyCode} ledger · on this device</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditing(activeProfile);
                  setSheetOpen(true);
                }}
                className="shrink-0 rounded-xl border border-border px-3.5 py-2 text-[12.5px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
              >
                Edit
              </button>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                { label: 'Entries', value: txCount || 0 },
                { label: 'Accounts', value: accountCount || 0 },
                { label: 'Goals', value: goalCount || 0 },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-2xl bg-secondary/50 px-3 py-2.5 text-center">
                  <p className="tnum text-[17px] font-bold leading-none">{value}</p>
                  <p className="mt-1.5 text-[10.5px] font-medium text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setPinSheetOpen(true)}
              className="mt-3 flex min-h-[52px] w-full items-center gap-3 rounded-2xl border border-border bg-secondary/30 px-3 py-2.5 text-left transition-colors hover:border-primary/40"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
                <KeyRound size={15} />
              </span>
              <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium">Profile lock</span>
              <span className="shrink-0 text-[12px] text-muted-foreground">
                {profileLocked ? 'On · 4-digit PIN' : 'Off'}
              </span>
              <ChevronRight size={15} className="shrink-0 text-muted-foreground" />
            </button>
          </section>
        ) : null}

        <Section title="Device security">
          <div className="px-2.5 py-3">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
                  <Fingerprint size={15} />
                </span>
                <span className="text-[13.5px] font-medium">Biometric unlock</span>
              </span>
              <input
                type="checkbox"
                checked={biometricsOn}
                disabled={!native || !biometryAvailable}
                onChange={(e) => void toggleBiometrics(e.target.checked)}
                aria-label="Biometric unlock"
                className="h-5 w-5 shrink-0 accent-[hsl(var(--primary))] disabled:opacity-40"
              />
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
              {!native
                ? 'Available in the Android/iOS app.'
                : !biometryAvailable
                  ? 'No biometrics enrolled on this device.'
                  : 'Applies to the whole app, on this device only.'}
            </p>
          </div>
        </Section>

        <Section title="Explore">
          {[
            { to: '/goals', icon: Gift, label: 'Savings goals', hint: 'Wishlist targets' },
            { to: '/recurring', icon: Repeat, label: 'Recurring', hint: 'Auto-posted rules' },
            { to: '/categories', icon: Tags, label: 'Categories', hint: 'Add, edit, archive' },
            { to: '/accounts', icon: Wallet, label: 'Accounts', hint: 'Cash, bank, cards' },
            { to: '/settings', icon: SettingsIcon, label: 'Settings', hint: 'All configuration' },
          ].map(({ to, icon: Icon, label, hint }) => (
            <Link
              key={to}
              to={to}
              className="flex min-h-[52px] w-full items-center gap-3 rounded-2xl px-2.5 py-2.5 text-left transition-colors hover:bg-secondary/40"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
                <Icon size={15} />
              </span>
              <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium">{label}</span>
              <span className="shrink-0 text-[12px] text-muted-foreground">{hint}</span>
              <ChevronRight size={15} className="shrink-0 text-muted-foreground" />
            </Link>
          ))}
        </Section>
      </div>

      <ProfileSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        profile={editing}
        onSaved={() => {
          // Registry list refreshes via live query; store sync handled by callers.
        }}
      />
      <PinSetupSheet
        open={pinSheetOpen}
        onClose={() => setPinSheetOpen(false)}
        profileName={activeProfile?.name || 'profile'}
        locked={profileLocked}
      />
    </div>
  );
}
