import type { ThemeName } from './db';

export function resolveDark(
  theme: ThemeName | undefined,
  mq: Pick<MediaQueryList, 'matches'> = window.matchMedia('(prefers-color-scheme: dark)'),
): boolean {
  const t = theme || 'system';
  return t === 'dark' || (t === 'system' && mq.matches);
}

/** Applies the theme class to <html> and keeps `system` in sync. Returns cleanup. */
export function applyThemeClass(theme: ThemeName | undefined): () => void {
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const apply = (): void => {
    document.documentElement.classList.toggle('dark', resolveDark(theme, mq));
  };
  apply();
  mq.addEventListener('change', apply);
  return () => mq.removeEventListener('change', apply);
}
