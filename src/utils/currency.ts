/**
 * Formats an amount in Egyptian Pounds (EGP / ج.م)
 */
export function formatEGP(amount: number | null | undefined, showDecimals: boolean = true): string {
  if (amount === null || amount === undefined || isNaN(amount) || !isFinite(amount)) {
    return '—';
  }

  const rounded = Math.round((amount + Number.EPSILON) * 100) / 100;
  const formatted = showDecimals
    ? rounded.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : rounded.toLocaleString('ar-EG', { maximumFractionDigits: 0 });

  return `${formatted} ج.م`;
}

/**
 * Standard Western Arabic numeral display for Egyptian riders who prefer standard numerals (123 vs ١٢٣).
 */
export function formatEGPStandard(amount: number | null | undefined, showDecimals: boolean = true): string {
  if (amount === null || amount === undefined || isNaN(amount) || !isFinite(amount)) {
    return '—';
  }

  const rounded = Math.round((amount + Number.EPSILON) * 100) / 100;
  const numStr = showDecimals
    ? rounded.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : rounded.toLocaleString('en-US', { maximumFractionDigits: 0 });

  return `${numStr} ج.م`;
}

export function parseSafeNumber(val: unknown, fallback: number = 0): number {
  if (typeof val === 'number') return isNaN(val) ? fallback : val;
  if (!val) return fallback;
  const cleaned = String(val).replace(/[^\d.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? fallback : parsed;
}
