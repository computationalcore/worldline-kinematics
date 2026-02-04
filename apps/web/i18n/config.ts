/**
 * Internationalization configuration.
 */

export const locales = [
  'en',
  'pt',
  'es',
  'ja',
  'zh',
  'it',
  'fr',
  'ko',
  'de',
  'pl',
  'da',
  'ru',
] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

/** Cookie key for storing the user's locale preference. */
export const LOCALE_COOKIE_KEY = 'preferred-locale';

/**
 * Check if a string is a valid locale.
 */
export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}

/**
 * Language names in their native form for display.
 */
export const localeNames: Record<Locale, string> = {
  en: 'English',
  pt: 'Português',
  es: 'Español',
  ja: '日本語',
  zh: '中文',
  it: 'Italiano',
  fr: 'Français',
  ko: '한국어',
  de: 'Deutsch',
  pl: 'Polski',
  da: 'Dansk',
  ru: 'Русский',
};
