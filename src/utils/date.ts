/**
 * Get current date in YYYY-MM-DD local format.
 */
export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format ISO date string into readable Arabic time. e.g. "04:30 م"
 */
export function formatArabicTime(isoString: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';

  return date.toLocaleTimeString('ar-EG', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format ISO date string into readable Arabic date and time.
 */
export function formatArabicDateTime(isoString: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';

  return date.toLocaleDateString('ar-EG', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format date for reports/headers. e.g. "الثلاثاء، 27 أكتوبر 2026"
 */
export function formatArabicDateOnly(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr.length === 10 ? `${dateStr}T12:00:00` : dateStr);
  if (isNaN(date.getTime())) return dateStr;

  return date.toLocaleDateString('ar-EG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Checks if a given ISO timestamp or YYYY-MM-DD is today.
 */
export function isToday(dateOrIso: string): boolean {
  const todayStr = getLocalDateString();
  if (dateOrIso.length === 10) {
    return dateOrIso === todayStr;
  }
  return getLocalDateString(new Date(dateOrIso)) === todayStr;
}

/**
 * Checks if a date falls within a given range [startStr, endStr] in YYYY-MM-DD.
 */
export function isDateInRange(dateStr: string, startStr: string, endStr: string): boolean {
  const target = dateStr.slice(0, 10);
  return target >= startStr && target <= endStr;
}
