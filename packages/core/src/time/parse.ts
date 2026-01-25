/**
 * Date parsing utilities with UTC/local semantics.
 */

/**
 * Parses a date input with well-defined semantics.
 *
 * - Date objects are returned as-is
 * - Date-only strings (YYYY-MM-DD) are interpreted as LOCAL NOON
 * - ISO timestamps and other formats use standard parsing
 *
 * @param d Date object or string
 * @returns Parsed Date object
 */
export function parseDateInput(d: Date | string): Date {
  if (d instanceof Date) return d;

  const s = d.trim();

  // Date-only string from HTML date input (YYYY-MM-DD)
  // Anchor at local noon to avoid timezone/DST issues
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const parts = s.split('-').map(Number);
    const yy = parts[0]!;
    const mm = parts[1]!;
    const dd = parts[2]!;
    // Local noon is robust across DST transitions
    return new Date(yy, mm - 1, dd, 12, 0, 0, 0);
  }

  // ISO timestamps and other formats use standard parsing
  return new Date(s);
}

/**
 * Formats a Date as a YYYY-MM-DD string for HTML date inputs.
 * Uses local date components to match the local noon parsing convention.
 *
 * @param d Date object
 * @returns Date string in YYYY-MM-DD format
 */
export function formatDateInput(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
