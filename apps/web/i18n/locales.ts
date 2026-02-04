/**
 * Locale type definitions and constants.
 * This is the single source of truth for locale configuration.
 */

/**
 * Supported locales for the application.
 * Order matters: first locale is used for fallback language detection.
 */
export const LOCALES = [
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

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

/**
 * Native language names for display in UI (e.g., language switcher).
 */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: 'English',
  pt: 'Portugues',
  es: 'Espanol',
  ja: '日本語',
  zh: '中文',
  it: 'Italiano',
  fr: 'Francais',
  ko: '한국어',
  de: 'Deutsch',
  pl: 'Polski',
  da: 'Dansk',
  ru: 'Русский',
};

/**
 * Checks if a string is a valid locale.
 */
export function isValidLocale(value: string): value is Locale {
  return LOCALES.includes(value as Locale);
}

/**
 * Normalizes a locale string to a supported locale.
 * Handles language codes with regions (e.g., "en-US" -> "en").
 */
export function normalizeLocale(value: string): Locale {
  const base = value.split('-')[0]?.toLowerCase() ?? '';
  return isValidLocale(base) ? base : DEFAULT_LOCALE;
}
