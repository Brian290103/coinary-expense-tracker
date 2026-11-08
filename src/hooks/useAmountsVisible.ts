import { useAppStore } from '@/store/useAppStore';

/** Global amount-privacy flag, persisted in AppSettings. Defaults to visible. */
export function useAmountsVisible(): boolean {
  return useAppStore((s) => s.settings?.amountsVisible ?? true);
}
