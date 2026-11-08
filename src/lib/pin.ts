// 4-digit profile PIN: salted SHA-256, device-local only.
// This is a casual-privacy gate, not encryption — anyone with raw DB access
// already owns the data. There is no recovery: forget the PIN, restore from backup.
export function randomSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function hashPin(pin: string, salt: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}:${pin}`));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPin(pin: string, salt: string | undefined, hash: string | undefined): Promise<boolean> {
  if (!salt || !hash || pin.length !== 4) return false;
  return (await hashPin(pin, salt)) === hash;
}
