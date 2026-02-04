/**
 * Internationalization (i18n) module.
 * Provides localized strings for the application.
 */

import enApp from '../locales/en/app.json';
import ptApp from '../locales/pt/app.json';
import esApp from '../locales/es/app.json';
import jaApp from '../locales/ja/app.json';
import zhApp from '../locales/zh/app.json';
import itApp from '../locales/it/app.json';
import frApp from '../locales/fr/app.json';
import koApp from '../locales/ko/app.json';
import deApp from '../locales/de/app.json';
import plApp from '../locales/pl/app.json';
import daApp from '../locales/da/app.json';
import ruApp from '../locales/ru/app.json';

// Re-export locale types from single source of truth
export {
  LOCALES,
  DEFAULT_LOCALE,
  LOCALE_NAMES,
  isValidLocale,
  normalizeLocale,
} from './locales';
export type { Locale } from './locales';
import { DEFAULT_LOCALE, type Locale } from './locales';

// Translation content type (inferred from English as base)
export type AppContent = typeof enApp;

// Content registry by locale
const appContent: Record<Locale, AppContent> = {
  en: enApp,
  pt: ptApp,
  es: esApp,
  ja: jaApp,
  zh: zhApp,
  it: itApp,
  fr: frApp,
  ko: koApp,
  de: deApp,
  pl: plApp,
  da: daApp,
  ru: ruApp,
};

/**
 * Get app content for a given locale.
 * Falls back to English if locale is not found.
 */
export function getAppContent(locale: string = DEFAULT_LOCALE): AppContent {
  const normalizedLocale = locale.split('-')[0] as Locale;
  return appContent[normalizedLocale] ?? appContent[DEFAULT_LOCALE] ?? enApp;
}

/**
 * Get a nested translation value using dot notation.
 * Example: t('onboarding.title') returns the onboarding title.
 */
export function t(key: string, locale: string = DEFAULT_LOCALE): string {
  const content = getAppContent(locale);
  const keys = key.split('.');
  let value: unknown = content;

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = (value as Record<string, unknown>)[k];
    } else {
      // Key not found, return the key itself as fallback
      return key;
    }
  }

  return typeof value === 'string' ? value : key;
}

/**
 * Hook-friendly translations object.
 * Returns the full content object for a locale.
 */
export function useTranslations(locale: string = DEFAULT_LOCALE) {
  const content = getAppContent(locale);

  return {
    content,
    t: (key: string) => t(key, locale),
  };
}

// Re-export content for direct import
export {
  enApp,
  ptApp,
  esApp,
  jaApp,
  zhApp,
  itApp,
  frApp,
  koApp,
  deApp,
  plApp,
  daApp,
  ruApp,
};
