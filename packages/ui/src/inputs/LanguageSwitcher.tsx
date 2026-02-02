'use client';

/**
 * Language switcher component that detects browser locale and allows switching.
 */

import { useState, useEffect } from 'react';

/**
 * Supported locales for the UI.
 */
export const SUPPORTED_LOCALES = [
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

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = 'en';

/**
 * Native language names for display.
 */
export const LOCALE_NAMES: Record<SupportedLocale, string> = {
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

/**
 * Modal title translations.
 */
const MODAL_TITLES: Record<SupportedLocale, { title: string; description: string }> = {
  en: { title: 'Select Language', description: 'Choose your preferred language' },
  pt: { title: 'Selecionar Idioma', description: 'Escolha seu idioma preferido' },
  es: { title: 'Seleccionar idioma', description: 'Elige tu idioma preferido' },
  ja: { title: '言語を選択', description: 'お好みの言語を選択してください' },
  zh: { title: '选择语言', description: '选择您的首选语言' },
  it: { title: 'Seleziona lingua', description: 'Scegli la tua lingua preferita' },
  fr: { title: 'Choisir la langue', description: 'Choisissez votre langue preferee' },
  ko: { title: '언어 선택', description: '원하시는 언어를 선택하세요' },
  de: { title: 'Sprache wahlen', description: 'Wahlen Sie Ihre bevorzugte Sprache' },
  pl: { title: 'Wybierz jezyk', description: 'Wybierz preferowany jezyk' },
  da: { title: 'Vaelg sprog', description: 'Vaelg dit foretrukne sprog' },
  ru: { title: 'Выбрать язык', description: 'Выберите предпочтительный язык' },
};

/**
 * Detect browser locale.
 */
function detectBrowserLocale(): SupportedLocale {
  if (typeof navigator === 'undefined') {
    return DEFAULT_LOCALE;
  }

  const languages = navigator.languages || [navigator.language];

  for (const lang of languages) {
    const normalized = lang.split('-')[0]?.toLowerCase();
    if (normalized && SUPPORTED_LOCALES.includes(normalized as SupportedLocale)) {
      return normalized as SupportedLocale;
    }
  }

  return DEFAULT_LOCALE;
}

/**
 * Get stored locale preference from localStorage.
 */
function getStoredLocale(): SupportedLocale | null {
  if (typeof localStorage === 'undefined') {
    return null;
  }

  try {
    const stored = localStorage.getItem('preferred-locale');
    if (stored && SUPPORTED_LOCALES.includes(stored as SupportedLocale)) {
      return stored as SupportedLocale;
    }
  } catch {
    // localStorage not available
  }

  return null;
}

/**
 * Store locale preference in localStorage.
 */
function storeLocale(locale: SupportedLocale): void {
  if (typeof localStorage === 'undefined') {
    return;
  }

  try {
    localStorage.setItem('preferred-locale', locale);
  } catch {
    // localStorage not available
  }
}

interface LanguageSwitcherProps {
  /** Current locale (controlled) */
  locale?: SupportedLocale;
  /** Callback when locale changes */
  onLocaleChange?: (locale: SupportedLocale) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Language switcher with modal dialog.
 */
export function LanguageSwitcher({
  locale: controlledLocale,
  onLocaleChange,
  className = '',
}: LanguageSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [detectedLocale, setDetectedLocale] = useState<SupportedLocale>(DEFAULT_LOCALE);

  // Detect locale from browser on mount
  useEffect(() => {
    const stored = getStoredLocale();
    if (stored) {
      setDetectedLocale(stored);
      return;
    }
    setDetectedLocale(detectBrowserLocale());
  }, []);

  const activeLocale = controlledLocale ?? detectedLocale;
  const defaultModalContent = {
    title: 'Select Language',
    description: 'Choose your preferred language',
  };
  const modalContent = MODAL_TITLES[activeLocale] ?? defaultModalContent;

  const handleSelectLanguage = (newLocale: SupportedLocale) => {
    if (newLocale === activeLocale) {
      setIsOpen(false);
      return;
    }

    storeLocale(newLocale);
    setDetectedLocale(newLocale);
    onLocaleChange?.(newLocale);
    setIsOpen(false);
  };

  const currentLabel = LOCALE_NAMES[activeLocale] || 'Language';

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 text-sm font-medium text-white/80 hover:bg-black/70 hover:border-white/40 transition-colors cursor-pointer ${className}`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
          />
        </svg>
        {currentLabel}
      </button>

      {/* Modal overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => setIsOpen(false)}
        >
          {/* Modal content */}
          <div
            className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0">
              <div>
                <h2 className="text-xl font-bold text-white">{modalContent.title}</h2>
                <p className="text-sm text-white/50 mt-0.5">{modalContent.description}</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-2 hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <svg
                  className="w-5 h-5 text-white/60"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Content - Scrollable */}
            <div
              className="overflow-y-auto flex-1 px-6 py-5"
              style={{ scrollbarGutter: 'stable' }}
            >
              <div className="grid grid-cols-2 gap-2">
                {SUPPORTED_LOCALES.map((loc) => {
                  const isCurrent = loc === activeLocale;
                  return (
                    <button
                      key={loc}
                      onClick={() => handleSelectLanguage(loc)}
                      className={`
                        group relative flex items-center justify-between gap-3 w-full px-4 py-3 rounded-lg text-left transition-all
                        ${
                          isCurrent
                            ? 'bg-blue-500 text-white shadow-sm'
                            : 'bg-white/5 hover:bg-white/10 border border-white/10 hover:border-blue-400/50 cursor-pointer text-white'
                        }
                      `}
                    >
                      <span className="text-sm font-medium">{LOCALE_NAMES[loc]}</span>
                      {isCurrent && (
                        <svg
                          className="w-4 h-4 text-white flex-shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Hook that returns the detected or stored browser locale.
 */
export function useLocale(): SupportedLocale {
  const [locale, setLocale] = useState<SupportedLocale>(DEFAULT_LOCALE);

  useEffect(() => {
    const stored = getStoredLocale();
    if (stored) {
      setLocale(stored);
      return;
    }
    setLocale(detectBrowserLocale());
  }, []);

  return locale;
}

/**
 * Hook that provides locale state and a setter that persists the choice.
 */
export function useLocaleWithSetter(): [
  SupportedLocale,
  (locale: SupportedLocale) => void,
] {
  const [locale, setLocaleState] = useState<SupportedLocale>(DEFAULT_LOCALE);

  useEffect(() => {
    const stored = getStoredLocale();
    if (stored) {
      setLocaleState(stored);
      return;
    }
    setLocaleState(detectBrowserLocale());
  }, []);

  const setLocale = (newLocale: SupportedLocale) => {
    storeLocale(newLocale);
    setLocaleState(newLocale);
  };

  return [locale, setLocale];
}
