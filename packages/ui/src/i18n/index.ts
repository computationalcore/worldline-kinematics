/**
 * Internationalization module for UI components.
 */

import { en } from './en';
import { pt } from './pt';
import { es } from './es';
import { ja } from './ja';
import { zh } from './zh';
import { it } from './it';
import { fr } from './fr';
import { ko } from './ko';
import { de } from './de';
import { pl } from './pl';
import { da } from './da';
import { ru } from './ru';

export type UIContent = typeof en;

const content = {
  en,
  pt,
  es,
  ja,
  zh,
  it,
  fr,
  ko,
  de,
  pl,
  da,
  ru,
} as const;

type SupportedLocale = keyof typeof content;

function isSupportedLocale(locale: string): locale is SupportedLocale {
  return locale in content;
}

export function getUIContent(locale: string = 'en'): UIContent {
  const normalizedLocale = locale.split('-')[0] ?? 'en';
  if (isSupportedLocale(normalizedLocale)) {
    return content[normalizedLocale];
  }
  return content.en;
}

export { en, pt, es, ja, zh, it, fr, ko, de, pl, da, ru };
