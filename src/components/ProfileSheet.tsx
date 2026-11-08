import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import BottomSheet from './BottomSheet';
import CategoryIcon, { ICON_OPTIONS } from './CategoryIcon';
import CurrencyPicker from './CurrencyPicker';
import { CATEGORY_COLORS } from '@/lib/defaults';
import { MAX_PROFILES, createProfile, getProfile, renameProfile, type Profile } from '@/lib/profiles';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';

interface ProfileSheetProps {
  open: boolean;
  onClose: () => void;
  profile: Profile | null;
  onSaved: (id: string) => void;
}

export default function ProfileSheet({ open, onClose, profile, onSaved }: ProfileSheetProps) {
  const setActiveProfile = useAppStore((s) => s.setActiveProfile);
  const activeProfileId = useAppStore((s) => s.activeProfileId);
  const setSettings = useAppStore((s) => s.setSettings);
  const askConfirm = useAppStore((s) => s.askConfirm);

  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('wallet');
  const [color, setColor] = useState(CATEGORY_COLORS[3]);
  const [currency, setCurrency] = useState('USD');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setName(profile?.name || '');
    setIcon(profile?.icon || 'wallet');
    setColor(profile?.color || CATEGORY_COLORS[3]);
    setCurrency(profile?.currencyCode || 'USD');
  }, [open, profile]);

  const canContinue = name.trim().length > 0 && !saving;
  const canSave = canContinue && currency.length > 0;

  const handleSave = async (): Promise<void> => {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      if (profile) {
        await renameProfile(profile.id, { name, icon, color });
        if (profile.id === activeProfileId) {
          const refreshed = await getProfile(profile.id);
          if (refreshed) setActiveProfile(refreshed);
        }
        onSaved(profile.id);
      } else {
        const created = await createProfile({ name, icon, color, currencyCode: currency });
        setActiveProfile(created);
        const { db, SETTINGS_ID } = await import('@/lib/db');
        const settings = await db.settings.get(SETTINGS_ID);
        if (settings) setSettings(settings);
        onSaved(created.id);
      }
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save this profile');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (): void => {
    if (!profile) return;
    askConfirm({
      title: `Delete “${profile.name}”?`,
      description:
        'Every transaction, budget, goal and account in this profile will be permanently erased. This cannot be undone.',
      confirmLabel: 'Delete profile',
      destructive: true,
      onConfirm: async () => {
        const { deleteProfile } = await import('@/lib/profiles');
        const { db, SETTINGS_ID } = await import('@/lib/db');
        const fallbackId = await deleteProfile(profile.id);
        if (fallbackId) {
          const fallback = await getProfile(fallbackId);
          if (fallback) setActiveProfile(fallback);
          const settings = await db.settings.get(SETTINGS_ID);
          if (settings) setSettings(settings);
          onSaved(fallbackId);
        }
        onClose();
        toast.success('Profile deleted');
      },
    });
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={profile ? 'Edit profile' : 'New profile'}
      subtitle={
        profile
          ? 'Rename or recolor this profile'
          : `Profile data stays separate. You can have up to ${MAX_PROFILES} profiles.`
      }
      footer={
        <div className="space-y-2">
          {!profile && step === 0 ? (
            <button
              type="button"
              onClick={() => canContinue && setStep(1)}
              disabled={!canContinue}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-[15px] font-semibold text-primary-foreground disabled:opacity-40"
            >
              Continue <ArrowRight size={17} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              className="h-12 w-full rounded-2xl bg-primary text-[15px] font-semibold text-primary-foreground disabled:opacity-40"
            >
              {saving ? 'Saving…' : profile ? 'Save changes' : 'Create profile'}
            </button>
          )}
          {profile ? (
            <button
              type="button"
              onClick={handleDelete}
              className="h-10 w-full text-[13px] font-semibold text-expense"
            >
              Delete profile
            </button>
          ) : null}
        </div>
      }
    >
      {(!profile && step === 1) ? (
        <>
          <button
            type="button"
            onClick={() => setStep(0)}
            className="mb-1 flex items-center gap-1 text-[12.5px] font-medium text-muted-foreground"
          >
            <ArrowLeft size={14} /> Back
          </button>
          <p className="text-[15px] font-semibold">Which currency does “{name.trim() || 'this profile'}” use?</p>
          <CurrencyPicker value={currency} onChange={setCurrency} />
        </>
      ) : (
        <>
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
              placeholder="Profile name"
              aria-label="Profile name"
              maxLength={30}
              className="field"
            />
          </div>

          <p className="mt-5 text-[12px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Icon</p>
          <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto pb-1">
            {ICON_OPTIONS.slice(0, 24).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setIcon(option)}
                aria-label={option}
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border transition-colors',
                  icon === option ? 'border-primary/50 bg-primary/10 text-primary' : 'border-border text-muted-foreground',
                )}
              >
                <CategoryIcon name={option} size={17} />
              </button>
            ))}
          </div>

          <p className="mt-4 text-[12px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Color</p>
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
        </>
      )}
    </BottomSheet>
  );
}
