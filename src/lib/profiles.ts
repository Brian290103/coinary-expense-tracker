import Dexie, { type Table } from 'dexie';
import {
  db,
  newId,
  nowIso,
  openProfileDatabase,
  profileDbName,
  ensureSeeded,
  seedAccountsForCurrency,
  updateSettings,
} from './db';

export const MAX_PROFILES = 5;
const ACTIVE_KEY = 'activeProfileId';
const BIOMETRICS_KEY = 'biometricsEnabled';
const LEGACY_PROFILE_ID = 'personal';

export interface Profile {
  id: string;
  name: string;
  icon: string;
  color: string;
  currencyCode: string;
  createdAt: string;
}

interface KvEntry {
  key: string;
  value: string;
}

class MetaDB extends Dexie {
  profiles!: Table<Profile, string>;
  kv!: Table<KvEntry, string>;

  constructor() {
    super('coinary-meta');
    this.version(1).stores({
      profiles: 'id, createdAt',
      kv: 'key',
    });
  }
}

export const metaDb = new MetaDB();

async function readKv(key: string): Promise<string | undefined> {
  return (await metaDb.kv.get(key))?.value;
}

async function writeKv(key: string, value: string): Promise<void> {
  await metaDb.kv.put({ key, value });
}

export async function listProfiles(): Promise<Profile[]> {
  const all = await metaDb.profiles.toArray();
  return all.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
}

export async function getActiveProfileId(): Promise<string | undefined> {
  return readKv(ACTIVE_KEY);
}

/** Device-wide biometric gate (all profiles). Stored in meta, not per-profile. */
export async function getBiometricsEnabled(): Promise<boolean> {
  try {
    return (await readKv(BIOMETRICS_KEY)) === '1';
  } catch {
    return false;
  }
}

export async function setBiometricsEnabled(enabled: boolean): Promise<void> {
  await writeKv(BIOMETRICS_KEY, enabled ? '1' : '0');
}

export async function getProfile(id: string): Promise<Profile | undefined> {
  return metaDb.profiles.get(id);
}

/**
 * First-run migration + active profile resolution.
 * Existing installs keep their `coinary-ledger` database untouched as the
 * "Personal" profile — no data is copied.
 */
export async function bootProfiles(): Promise<string> {
  const existing = await metaDb.profiles.toArray();
  if (existing.length > 0) {
    const activeId = await readKv(ACTIVE_KEY);
    if (activeId && existing.some((p) => p.id === activeId)) return activeId;
    const fallback = [...existing].sort((a, b) =>
      String(a.createdAt).localeCompare(String(b.createdAt)),
    )[0];
    await writeKv(ACTIVE_KEY, fallback.id);
    return fallback.id;
  }

  // Fresh registry — adopt the legacy database as "Personal" if it has data,
  // otherwise a brand-new install still starts with a Personal profile shell.
  let currencyCode = 'USD';
  try {
    const legacySettings = await db.settings.get('app-settings');
    if (legacySettings?.activeCurrencyCode) currencyCode = legacySettings.activeCurrencyCode;
  } catch {
    // Legacy DB may not exist yet — defaults apply.
  }

  const ts = nowIso();
  await metaDb.profiles.put({
    id: LEGACY_PROFILE_ID,
    name: 'Personal',
    icon: 'wallet',
    color: '#34D399',
    currencyCode,
    createdAt: ts,
  });
  await writeKv(ACTIVE_KEY, LEGACY_PROFILE_ID);
  return LEGACY_PROFILE_ID;
}

export interface NewProfileInput {
  name: string;
  icon: string;
  color: string;
  currencyCode: string;
}

export async function createProfile(input: NewProfileInput): Promise<Profile> {
  const count = await metaDb.profiles.count();
  if (count >= MAX_PROFILES) {
    throw new Error(`You can have up to ${MAX_PROFILES} profiles`);
  }
  const profile: Profile = {
    id: `prof-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    name: input.name.trim().slice(0, 30) || 'Profile',
    icon: input.icon || 'wallet',
    color: input.color || '#34D399',
    currencyCode: input.currencyCode || 'USD',
    createdAt: nowIso(),
  };
  await metaDb.profiles.put(profile);

  // Seed the new profile's own database (onboarded immediately — the full
  // wizard only runs once, on first app launch).
  openProfileDatabase(profile.id);
  await ensureSeeded(profile.currencyCode);
  await updateSettings({ activeCurrencyCode: profile.currencyCode, onboarded: true });
  await seedAccountsForCurrency(profile.currencyCode);
  return profile;
}

export async function renameProfile(id: string, patch: Partial<Pick<Profile, 'name' | 'icon' | 'color'>>): Promise<void> {
  const clean: Partial<Profile> = {};
  if (patch.name !== undefined) clean.name = patch.name.trim().slice(0, 30) || 'Profile';
  if (patch.icon !== undefined) clean.icon = patch.icon;
  if (patch.color !== undefined) clean.color = patch.color;
  if (Object.keys(clean).length > 0) await metaDb.profiles.update(id, clean);
}

export async function setProfileCurrency(id: string, currencyCode: string): Promise<void> {
  await metaDb.profiles.update(id, { currencyCode });
}

/**
 * Deletes a profile and its entire database. Returns the id that should
 * become active afterwards (null when nothing changed).
 */
export async function deleteProfile(id: string): Promise<string | null> {
  const all = await listProfiles();
  if (all.length <= 1) throw new Error('You need at least one profile');
  if (!all.some((p) => p.id === id)) return null;

  const profile = all.find((p) => p.id === id);
  const activeId = await readKv(ACTIVE_KEY);
  const wasActive = activeId === id;

  openProfileDatabase(id);
  try {
    db.close();
  } catch {
    // Already closed — safe to proceed with deletion.
  }
  await Dexie.delete(profileDbName(id));
  await metaDb.profiles.delete(id);

  if (!wasActive) {
    if (profile) {
      // `db` currently points at the deleted database — restore the active one.
      const restoreId = activeId || all.find((p) => p.id !== id)?.id;
      if (restoreId) openProfileDatabase(restoreId);
    }
    return null;
  }
  const fallback = all.find((p) => p.id !== id);
  if (!fallback) return null;
  await writeKv(ACTIVE_KEY, fallback.id);
  openProfileDatabase(fallback.id);
  return fallback.id;
}

export async function switchProfile(id: string): Promise<Profile> {
  const profile = await metaDb.profiles.get(id);
  if (!profile) throw new Error('Profile not found');
  openProfileDatabase(id);
  await writeKv(ACTIVE_KEY, id);
  return profile;
}

export { newId };
