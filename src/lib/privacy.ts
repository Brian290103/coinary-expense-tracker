import { formatMoney } from './money';

/** Placeholder shown wherever an amount is hidden by the privacy toggle. */
export const MASKED_AMOUNT = '••••';

export function formatMasked(
  minor: number | string,
  code = 'USD',
  locale = 'en-US',
  visible = true,
  options: Intl.NumberFormatOptions = {},
): string {
  if (!visible) return MASKED_AMOUNT;
  return formatMoney(minor, code, locale, options);
}
