/**
 * Hook to detect and manage the user's locale from URL path.
 *
 * @deprecated Prefer using useLocaleContext from '@/contexts/LocaleContext' for
 * locale switching without page refresh. This hook uses router.push() which
 * causes a full navigation, while LocaleContext uses history.replaceState()
 * for smoother UX.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import { type Locale, LOCALES, DEFAULT_LOCALE } from '../i18n';
import { getLocaleFromPath, storeLocaleCookie } from '../utils/locale';

/**
 * Hook that returns the locale from the URL path.
 * This is the primary source of truth for path-based i18n.
 */
export function useLocale(): Locale {
  const params = useParams();
  const pathname = usePathname();

  // Extract locale param as stable string to avoid dependency array size changes
  const paramLocale = typeof params.locale === 'string' ? params.locale : '';

  const [locale, setLocale] = useState<Locale>(() => {
    // Initialize with URL locale if available
    if (paramLocale && LOCALES.includes(paramLocale as Locale)) {
      return paramLocale as Locale;
    }
    const pathLocale = getLocaleFromPath(pathname);
    return pathLocale ?? DEFAULT_LOCALE;
  });

  useEffect(() => {
    // First try params (for [locale] route)
    if (paramLocale && LOCALES.includes(paramLocale as Locale)) {
      setLocale(paramLocale as Locale);
      return;
    }

    // Fall back to pathname parsing
    const pathLocale = getLocaleFromPath(pathname);
    if (pathLocale) {
      setLocale(pathLocale);
    }
  }, [paramLocale, pathname]);

  return locale;
}

/**
 * Hook that provides locale from URL and a setter that navigates to new locale.
 */
export function useLocaleWithSetter(): [Locale, (locale: Locale) => void] {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();

  // Extract locale param as stable string to avoid dependency array size changes
  const paramLocale = typeof params.locale === 'string' ? params.locale : '';

  const [locale, setLocaleState] = useState<Locale>(() => {
    // Initialize with URL locale if available
    if (paramLocale && LOCALES.includes(paramLocale as Locale)) {
      return paramLocale as Locale;
    }
    const pathLocale = getLocaleFromPath(pathname);
    return pathLocale ?? DEFAULT_LOCALE;
  });

  useEffect(() => {
    // First try params (for [locale] route)
    if (paramLocale && LOCALES.includes(paramLocale as Locale)) {
      setLocaleState(paramLocale as Locale);
      return;
    }

    // Fall back to pathname parsing
    const pathLocale = getLocaleFromPath(pathname);
    if (pathLocale) {
      setLocaleState(pathLocale);
    }
  }, [paramLocale, pathname]);

  const setLocale = useCallback(
    (newLocale: Locale) => {
      // Store in cookie for middleware
      storeLocaleCookie(newLocale);
      // Navigate to new locale path
      router.push(`/${newLocale}`);
    },
    [router]
  );

  return [locale, setLocale];
}
