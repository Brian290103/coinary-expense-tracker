import { currencyMeta, decimalsFor } from './currencies';

// All amounts are stored as integer minor units (e.g. cents).
export const factorFor = (code: string): number => Math.pow(10, decimalsFor(code));

export function toMinor(decimalValue: number | string, code: string): number {
  const n = Number(decimalValue);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * factorFor(code));
}

export function fromMinor(minor: number | string, code: string): number {
  const n = Number(minor);
  if (!Number.isFinite(n)) return 0;
  return n / factorFor(code);
}

function formatterFor(code: string, locale: string, options: Intl.NumberFormatOptions): Intl.NumberFormat | null {
  const decimals = decimalsFor(code);
  const base: Intl.NumberFormatOptions = {
    style: 'currency',
    currency: code,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    ...options,
  };
  try {
    return new Intl.NumberFormat(locale, { ...base, currencyDisplay: 'narrowSymbol' });
  } catch {
    try {
      return new Intl.NumberFormat(locale, { ...base, currencyDisplay: 'symbol' });
    } catch {
      return null;
    }
  }
}

export function formatMoney(minor: number | string, code = 'USD', locale = 'en-US', options: Intl.NumberFormatOptions = {}): string {
  const value = fromMinor(minor, code);
  const fmt = formatterFor(code, locale, options);
  if (!fmt) return `${currencyMeta(code).symbol}${value.toFixed(decimalsFor(code))}`;
  return fmt.format(value);
}

export const moneySymbol = (code: string): string => currencyMeta(code).symbol;

/** Compact form for tight chart axes / small cards. */
export function formatMoneyCompact(minor: number | string, code = 'USD', locale = 'en-US'): string {
  const value = fromMinor(minor, code);
  const abs = Math.abs(value);
  if (abs >= 1000000) {
    const meta = currencyMeta(code);
    return `${meta.symbol}${(value / 1000000).toFixed(1)}M`;
  }
  if (abs >= 10000) {
    const meta = currencyMeta(code);
    return `${meta.symbol}${Math.round(value / 1000)}k`;
  }
  return formatMoney(minor, code, locale, { maximumFractionDigits: 0, minimumFractionDigits: 0 });
}

/** Sanitises raw text typed into an amount field, respecting currency decimals. */
export function sanitizeAmountInput(raw: string | number, code = 'USD'): string {
  const decimals = decimalsFor(code);
  let cleaned = String(raw).replace(/[^\d.,]/g, '').replace(/,/g, '.');
  const firstDot = cleaned.indexOf('.');
  if (firstDot !== -1) {
    const intPart = cleaned.slice(0, firstDot);
    const decPart = cleaned.slice(firstDot + 1).replace(/\./g, '');
    cleaned = decimals === 0 ? intPart : `${intPart}.${decPart.slice(0, decimals)}`;
  }
  if (cleaned.startsWith('.')) cleaned = `0${cleaned}`;
  if (cleaned.length > 1 && cleaned.startsWith('0') && cleaned[1] !== '.') {
    cleaned = cleaned.replace(/^0+/, '');
  }
  return cleaned;
}

export function amountToMinorSafe(input: string | number, code = 'USD'): number {
  const n = Number(input);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return toMinor(n, code);
}
