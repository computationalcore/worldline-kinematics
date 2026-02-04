/**
 * Tests for locale utilities.
 */

import { describe, it, expect } from 'vitest';
import {
  LOCALES,
  DEFAULT_LOCALE,
  LOCALE_NAMES,
  isValidLocale,
  normalizeLocale,
} from './locales';

describe('LOCALES constant', () => {
  it('contains expected locales', () => {
    expect(LOCALES).toContain('en');
    expect(LOCALES).toContain('pt');
    expect(LOCALES).toContain('es');
    expect(LOCALES).toContain('ja');
    expect(LOCALES).toContain('zh');
    expect(LOCALES).toContain('it');
    expect(LOCALES).toContain('fr');
    expect(LOCALES).toContain('ko');
    expect(LOCALES).toContain('de');
    expect(LOCALES).toContain('pl');
    expect(LOCALES).toContain('da');
    expect(LOCALES).toContain('ru');
  });

  it('has exactly 12 locales', () => {
    expect(LOCALES).toHaveLength(12);
  });

  it('has English as first locale (default fallback)', () => {
    expect(LOCALES[0]).toBe('en');
  });
});

describe('DEFAULT_LOCALE', () => {
  it('is English', () => {
    expect(DEFAULT_LOCALE).toBe('en');
  });

  it('is included in LOCALES', () => {
    expect(LOCALES).toContain(DEFAULT_LOCALE);
  });
});

describe('LOCALE_NAMES', () => {
  it('has a name for every locale', () => {
    for (const locale of LOCALES) {
      expect(LOCALE_NAMES[locale]).toBeDefined();
      expect(LOCALE_NAMES[locale].length).toBeGreaterThan(0);
    }
  });

  it('has expected English name', () => {
    expect(LOCALE_NAMES.en).toBe('English');
  });

  it('has native language names (not English names)', () => {
    // Japanese should be in Japanese
    expect(LOCALE_NAMES.ja).toBe('日本語');
    // Chinese should be in Chinese
    expect(LOCALE_NAMES.zh).toBe('中文');
    // Korean should be in Korean
    expect(LOCALE_NAMES.ko).toBe('한국어');
    // Russian should be in Russian
    expect(LOCALE_NAMES.ru).toBe('Русский');
  });
});

describe('isValidLocale', () => {
  it('returns true for valid locales', () => {
    expect(isValidLocale('en')).toBe(true);
    expect(isValidLocale('pt')).toBe(true);
    expect(isValidLocale('es')).toBe(true);
    expect(isValidLocale('ja')).toBe(true);
  });

  it('returns false for invalid locales', () => {
    expect(isValidLocale('invalid')).toBe(false);
    expect(isValidLocale('EN')).toBe(false); // Case sensitive
    expect(isValidLocale('english')).toBe(false);
    expect(isValidLocale('')).toBe(false);
  });

  it('returns false for region codes', () => {
    expect(isValidLocale('en-US')).toBe(false);
    expect(isValidLocale('pt-BR')).toBe(false);
    expect(isValidLocale('zh-CN')).toBe(false);
  });
});

describe('normalizeLocale', () => {
  it('returns same locale for valid locales', () => {
    expect(normalizeLocale('en')).toBe('en');
    expect(normalizeLocale('pt')).toBe('pt');
    expect(normalizeLocale('ja')).toBe('ja');
  });

  it('extracts base language from region codes', () => {
    expect(normalizeLocale('en-US')).toBe('en');
    expect(normalizeLocale('en-GB')).toBe('en');
    expect(normalizeLocale('pt-BR')).toBe('pt');
    expect(normalizeLocale('pt-PT')).toBe('pt');
    expect(normalizeLocale('zh-CN')).toBe('zh');
    expect(normalizeLocale('zh-TW')).toBe('zh');
  });

  it('returns default locale for unsupported languages', () => {
    expect(normalizeLocale('ar')).toBe(DEFAULT_LOCALE);
    expect(normalizeLocale('hi')).toBe(DEFAULT_LOCALE);
    expect(normalizeLocale('tr')).toBe(DEFAULT_LOCALE);
  });

  it('returns default locale for invalid input', () => {
    expect(normalizeLocale('')).toBe(DEFAULT_LOCALE);
    expect(normalizeLocale('invalid')).toBe(DEFAULT_LOCALE);
  });

  it('handles lowercase conversion', () => {
    expect(normalizeLocale('EN-US')).toBe('en');
    expect(normalizeLocale('PT-BR')).toBe('pt');
  });

  it('handles complex locale strings', () => {
    expect(normalizeLocale('en-US-u-ca-buddhist')).toBe('en');
    expect(normalizeLocale('pt-BR-latn')).toBe('pt');
  });
});
