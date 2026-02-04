/**
 * Shared locale utilities for cookie storage and path parsing.
 */

import { type Locale, isValidLocale, LOCALE_COOKIE_KEY } from '../i18n/config';

/**
 * Get locale from URL path (e.g., /pt/page -> "pt").
 */
export function getLocaleFromPath(pathname: string): Locale | null {
  const segments = pathname.split('/').filter(Boolean);
  const firstSegment = segments[0];
  if (firstSegment && isValidLocale(firstSegment)) {
    return firstSegment;
  }
  return null;
}

/**
 * Store locale preference in cookie (for middleware/SSR).
 */
export function storeLocaleCookie(locale: Locale): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${LOCALE_COOKIE_KEY}=${locale};path=/;max-age=31536000`;
}
