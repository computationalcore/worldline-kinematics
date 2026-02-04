/**
 * Locale context for client-side language switching without page refresh.
 * This is the preferred way to manage locale in the application.
 */

'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import { useParams, usePathname } from 'next/navigation';
import { type Locale, DEFAULT_LOCALE, isValidLocale } from '../i18n';
import { getLocaleFromPath, storeLocaleCookie } from '../utils/locale';

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

/**
 * Update URL without triggering navigation.
 */
function updateUrlWithoutNavigation(locale: Locale, pathname: string): void {
  if (typeof window === 'undefined') return;

  // Extract current locale from path
  const segments = pathname.split('/').filter(Boolean);
  const currentLocale = segments[0] && isValidLocale(segments[0]) ? segments[0] : null;

  let newPath: string;
  if (currentLocale) {
    // Replace existing locale
    segments[0] = locale;
    newPath = '/' + segments.join('/');
  } else {
    // Add locale prefix
    newPath = '/' + locale + pathname;
  }

  // Update URL without navigation using replaceState
  window.history.replaceState({ ...window.history.state, locale }, '', newPath);
}

interface LocaleProviderProps {
  children: ReactNode;
  initialLocale?: Locale;
}

export function LocaleProvider({ children, initialLocale }: LocaleProviderProps) {
  const params = useParams();
  const pathname = usePathname();

  // Extract locale param as stable string
  const paramLocale = typeof params.locale === 'string' ? params.locale : '';

  const [locale, setLocaleState] = useState<Locale>(() => {
    // Priority: explicit initial > URL param > path > default
    if (initialLocale && isValidLocale(initialLocale)) {
      return initialLocale;
    }
    if (paramLocale && isValidLocale(paramLocale)) {
      return paramLocale;
    }
    const pathLocale = getLocaleFromPath(pathname);
    return pathLocale ?? DEFAULT_LOCALE;
  });

  // Sync with URL on mount and when URL changes externally
  useEffect(() => {
    if (paramLocale && isValidLocale(paramLocale)) {
      setLocaleState(paramLocale);
      return;
    }
    const pathLocale = getLocaleFromPath(pathname);
    if (pathLocale) {
      setLocaleState(pathLocale);
    }
  }, [paramLocale, pathname]);

  const setLocale = useCallback(
    (newLocale: Locale) => {
      if (!isValidLocale(newLocale)) return;

      // Update React state (triggers re-render with new translations)
      setLocaleState(newLocale);

      // Store in cookie for persistence
      storeLocaleCookie(newLocale);

      // Update URL without navigation (keeps URL in sync)
      updateUrlWithoutNavigation(newLocale, pathname);
    },
    [pathname]
  );

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      {children}
    </LocaleContext.Provider>
  );
}

/**
 * Hook to access locale and setter without page refresh.
 */
export function useLocaleContext(): LocaleContextValue {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocaleContext must be used within a LocaleProvider');
  }
  return context;
}

/**
 * Hook that returns just the locale value.
 */
export function useLocaleValue(): Locale {
  const { locale } = useLocaleContext();
  return locale;
}
