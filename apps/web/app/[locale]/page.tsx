/**
 * Main application page with scene and overlays.
 */

'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  computeWorldlineState,
  breakdownDuration,
  type ReferenceFrame,
} from '@worldline-kinematics/core';
import { JourneyModal } from '@worldline-kinematics/ui';
import Scene, { type SceneHandle } from '../../components/Scene';
import { LoadingScreen } from '../../components/LoadingScreen';
import { SpacetimeTitle } from '../../components/SpacetimeTitle';
import {
  SceneShell,
  OverlayTopCenter,
  OverlayBottomLeft,
  FullscreenButton,
} from '../../components/SceneShell';
import { useGeolocation, useCinematicMode } from '@worldline-kinematics/ui';
import { birthTimeToUtc } from '../../utils/timezone';
import { STORAGE_KEYS, APP_URL, APP_NAME } from '../../config';
import { getAppContent, type Locale, DEFAULT_LOCALE } from '../../i18n';
import { locales, localeNames, type Locale as ConfigLocale } from '../../i18n/config';
import { LocaleProvider, useLocaleContext } from '../../contexts/LocaleContext';

// Geocoding result type
interface GeocodingResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  importance: number;
}

function formatDateForDisplay(date: Date, monthNames: string[]): string {
  return `${monthNames[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

/**
 * Language switcher without page refresh.
 */
function LanguageSwitcher() {
  const { locale: currentLocale, setLocale } = useLocaleContext();
  const [isOpen, setIsOpen] = useState(false);

  const handleLocaleChange = (newLocale: string) => {
    // Update locale via context (no page refresh)
    setLocale(newLocale as ConfigLocale);
    setIsOpen(false);
  };

  const currentLabel = localeNames[currentLocale as ConfigLocale] || 'Language';

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 text-sm font-medium text-white/80 hover:bg-black/70 hover:border-white/40 transition-colors cursor-pointer"
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

      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0">
              <h2 className="text-xl font-bold text-white">Select Language</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-2 hover:bg-white/10 transition-colors cursor-pointer"
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
            <div className="overflow-y-auto flex-1 px-6 py-5">
              <div className="grid grid-cols-2 gap-2">
                {locales.map((loc) => {
                  const isCurrent = loc === currentLocale;
                  return (
                    <button
                      key={loc}
                      onClick={() => handleLocaleChange(loc)}
                      className={`
                        group relative flex items-center justify-between gap-3 w-full px-4 py-3 rounded-lg text-left transition-all
                        ${
                          isCurrent
                            ? 'bg-blue-500 text-white shadow-sm'
                            : 'bg-white/5 hover:bg-white/10 border border-white/10 hover:border-blue-400/50 cursor-pointer text-white'
                        }
                      `}
                    >
                      <span className="text-sm font-medium">{localeNames[loc]}</span>
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
    </div>
  );
}

/**
 * Date picker with separate Month, Day, Year fields.
 */
function DatePickerInput({
  value,
  onChange,
  maxDate,
  locale = DEFAULT_LOCALE,
}: {
  value: Date | null;
  onChange: (date: Date | null) => void;
  maxDate?: Date;
  locale?: Locale;
}) {
  const content = getAppContent(locale);
  const monthNames = content.onboarding.months;

  const today = new Date();
  const max = maxDate || today;
  const maxYear = max.getFullYear();

  const [month, setMonth] = useState<number | ''>(value ? value.getMonth() : '');
  const [day, setDay] = useState<string>(value ? String(value.getDate()) : '');
  const [year, setYear] = useState<string>(value ? String(value.getFullYear()) : '');

  useEffect(() => {
    if (value) {
      setMonth(value.getMonth());
      setDay(String(value.getDate()));
      setYear(String(value.getFullYear()));
    }
  }, [value]);

  const tryUpdateDate = (m: number | '', d: string, y: string) => {
    if (m === '' || !d || !y) return;

    const dayNum = parseInt(d, 10);
    const yearNum = parseInt(y, 10);

    if (isNaN(dayNum) || isNaN(yearNum)) return;
    if (yearNum < 1900 || yearNum > maxYear) return;
    if (dayNum < 1 || dayNum > 31) return;

    const newDate = new Date(yearNum, m, dayNum, 12, 0, 0);

    if (newDate.getMonth() !== m || newDate.getDate() !== dayNum) return;
    if (newDate > max) return;

    onChange(newDate);
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const m = val === '' ? '' : parseInt(val, 10);
    setMonth(m);
    tryUpdateDate(m, day, year);
  };

  const handleDayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 2);
    setDay(val);
    tryUpdateDate(month, val, year);
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
    setYear(val);
    tryUpdateDate(month, day, val);
  };

  const daysInMonth =
    month !== '' && year
      ? new Date(parseInt(year, 10) || 2000, month + 1, 0).getDate()
      : 31;

  const isComplete = value !== null;

  return (
    <div className="w-full">
      <div
        className={`flex gap-2 p-1 rounded-xl border transition-all ${
          isComplete
            ? 'border-emerald-500/50 bg-emerald-500/5'
            : 'border-white/20 bg-white/5'
        }`}
      >
        <select
          value={month === '' ? '' : month}
          onChange={handleMonthChange}
          className="flex-1 bg-transparent text-white text-base px-3 py-3 rounded-lg focus:outline-none focus:bg-white/5 transition-colors appearance-none cursor-pointer"
          style={{ minWidth: '110px' }}
        >
          <option value="" disabled className="bg-neutral-900 text-neutral-400">
            {content.onboarding.month}
          </option>
          {monthNames.map((name, idx) => (
            <option key={idx} value={idx} className="bg-neutral-900 text-white">
              {name}
            </option>
          ))}
        </select>

        <input
          type="text"
          inputMode="numeric"
          placeholder={content.onboarding.day}
          value={day}
          onChange={handleDayChange}
          maxLength={2}
          className="w-16 bg-transparent text-white text-base px-3 py-3 rounded-lg text-center focus:outline-none focus:bg-white/5 transition-colors placeholder-neutral-500"
        />

        <input
          type="text"
          inputMode="numeric"
          placeholder={content.onboarding.year}
          value={year}
          onChange={handleYearChange}
          maxLength={4}
          className="w-20 bg-transparent text-white text-base px-3 py-3 rounded-lg text-center focus:outline-none focus:bg-white/5 transition-colors placeholder-neutral-500"
        />

        {isComplete && (
          <div className="flex items-center px-2">
            <svg
              className="w-5 h-5 text-emerald-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>

      {year && parseInt(year, 10) > maxYear && (
        <p className="mt-1.5 text-xs text-red-400">
          {content.onboarding.validation.yearFuture}
        </p>
      )}
      {year && parseInt(year, 10) < 1900 && year.length === 4 && (
        <p className="mt-1.5 text-xs text-red-400">
          {content.onboarding.validation.yearPast}
        </p>
      )}
      {day && parseInt(day, 10) > daysInMonth && (
        <p className="mt-1.5 text-xs text-red-400">
          {content.onboarding.validation.invalidDay}
        </p>
      )}
    </div>
  );
}

/**
 * Time picker with hour and minute inputs.
 */
function TimePicker({
  hour,
  minute,
  onHourChange,
  onMinuteChange,
  locale = DEFAULT_LOCALE,
}: {
  hour: number;
  minute: number;
  onHourChange: (h: number) => void;
  onMinuteChange: (m: number) => void;
  locale?: Locale;
}) {
  const content = getAppContent(locale);
  return (
    <div className="flex items-center justify-center gap-3">
      <div className="flex flex-col items-center gap-1">
        <button
          onClick={() => onHourChange((hour + 1) % 24)}
          className="p-1.5 hover:bg-white/10 rounded text-white/60 hover:text-white transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M5 15l7-7 7 7" />
          </svg>
        </button>
        <div className="w-14 h-12 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center">
          <span className="text-2xl font-bold text-white tabular-nums">
            {String(hour).padStart(2, '0')}
          </span>
        </div>
        <button
          onClick={() => onHourChange((hour - 1 + 24) % 24)}
          className="p-1.5 hover:bg-white/10 rounded text-white/60 hover:text-white transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <span className="text-[10px] text-neutral-500">{content.onboarding.hour}</span>
      </div>

      <span className="text-2xl font-bold text-white/40 mb-8">:</span>

      <div className="flex flex-col items-center gap-1">
        <button
          onClick={() => onMinuteChange((minute + 1) % 60)}
          className="p-1.5 hover:bg-white/10 rounded text-white/60 hover:text-white transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M5 15l7-7 7 7" />
          </svg>
        </button>
        <div className="w-14 h-12 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center">
          <span className="text-2xl font-bold text-white tabular-nums">
            {String(minute).padStart(2, '0')}
          </span>
        </div>
        <button
          onClick={() => onMinuteChange((minute - 1 + 60) % 60)}
          className="p-1.5 hover:bg-white/10 rounded text-white/60 hover:text-white transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <span className="text-[10px] text-neutral-500">{content.onboarding.minute}</span>
      </div>
    </div>
  );
}

/**
 * Place search with autocomplete using Nominatim.
 */
function PlaceSearchInput({
  value,
  onChange,
  onUseCurrentLocation,
  hasGeolocation,
  locale = DEFAULT_LOCALE,
}: {
  value: { name: string; lat: number; lon: number } | null;
  onChange: (place: { name: string; lat: number; lon: number } | null) => void;
  onUseCurrentLocation?: () => void;
  hasGeolocation?: boolean;
  locale?: Locale;
}) {
  const content = getAppContent(locale);
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState(value?.name || '');
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (value) setQuery(value.name);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchPlaces = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=5`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data: GeocodingResult[] = await response.json();
      setResults(data);
      setSelectedIndex(-1);
    } catch {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    setShowDropdown(true);
    if (value && newQuery !== value.name) onChange(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchPlaces(newQuery), 300);
  };

  const handleSelectPlace = (result: GeocodingResult) => {
    const parts = result.display_name.split(', ');
    const shortName =
      parts.length > 2
        ? `${parts[0]}, ${parts[parts.length - 2]}, ${parts[parts.length - 1]}`
        : result.display_name;
    onChange({
      name: shortName,
      lat: parseFloat(result.lat),
      lon: parseFloat(result.lon),
    });
    setQuery(shortName);
    setShowDropdown(false);
    setResults([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      handleSelectPlace(results[selectedIndex]);
    } else if (e.key === 'Escape') setShowDropdown(false);
  };

  const handleClear = () => {
    setQuery('');
    onChange(null);
    setResults([]);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setShowDropdown(true)}
          onKeyDown={handleKeyDown}
          placeholder={content.onboarding.searchPlace}
          className="w-full bg-white/10 border border-white/10 rounded-lg px-4 py-3 pr-10 text-white focus:outline-none focus:border-blue-500/50 placeholder-neutral-500"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {isLoading ? (
            <svg
              className="w-5 h-5 text-neutral-500 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          ) : query ? (
            <button
              onClick={handleClear}
              className="text-neutral-500 hover:text-white transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          ) : (
            <svg
              className="w-5 h-5 text-neutral-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          )}
        </div>
      </div>

      {showDropdown && (results.length > 0 || query.length >= 2) && (
        <div className="absolute z-50 w-full mt-1 bg-neutral-900 border border-white/10 rounded-lg shadow-xl overflow-hidden">
          {results.length > 0 ? (
            <ul className="max-h-60 overflow-y-auto">
              {results.map((result, idx) => {
                const parts = result.display_name.split(', ');
                return (
                  <li key={result.place_id}>
                    <button
                      onClick={() => handleSelectPlace(result)}
                      className={`w-full px-4 py-3 text-left hover:bg-white/10 transition-colors flex items-start gap-3 ${idx === selectedIndex ? 'bg-white/10' : ''}`}
                    >
                      <svg
                        className="w-5 h-5 text-neutral-500 mt-0.5 flex-shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-medium truncate">{parts[0]}</div>
                        <div className="text-xs text-neutral-500 truncate">
                          {parts.slice(1).join(', ')}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : !isLoading && query.length >= 2 ? (
            <div className="px-4 py-3 text-neutral-500 text-sm">
              {content.scene.noPlacesFound}
            </div>
          ) : null}
        </div>
      )}

      {hasGeolocation && onUseCurrentLocation && (
        <button
          onClick={() => {
            onUseCurrentLocation();
            setShowDropdown(false);
          }}
          className="mt-2 text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
        >
          <svg
            className="w-3 h-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
          </svg>
          {content.onboarding.useCurrentLocation}
        </button>
      )}

      {value && (
        <div className="mt-2 flex items-center gap-2 text-xs text-emerald-400">
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M5 13l4 4L19 7" />
          </svg>
          {content.onboarding.locationSet}
        </div>
      )}
    </div>
  );
}

function LocalePageContent() {
  const { locale } = useLocaleContext();
  const content = useMemo(() => getAppContent(locale), [locale]);

  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [birthLatitude, setBirthLatitude] = useState<number>(45);
  const [birthLongitude, setBirthLongitude] = useState<number>(0);
  const [birthPlaceName, setBirthPlaceName] = useState<string | null>(null);
  const [hasBirthLocation, setHasBirthLocation] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [isLoadingFromStorage, setIsLoadingFromStorage] = useState(true);
  const [isSceneReady, setIsSceneReady] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showTimeInput, setShowTimeInput] = useState(false);
  const [timeHour, setTimeHour] = useState(12);
  const [timeMinute, setTimeMinute] = useState(0);
  const [showLocationInput, setShowLocationInput] = useState(false);
  const [canvasRef, setCanvasRef] = useState<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<SceneHandle | null>(null);

  const geo = useGeolocation();

  const [showJourneyModal, setShowJourneyModal] = useState(false);
  const [speedUnit, setSpeedUnit] = useState<'km/s' | 'km/h' | 'mph'>('km/s');

  const { isUIHidden } = useCinematicMode({
    onToggleDrawer: () => setShowJourneyModal((prev) => !prev),
  });

  useEffect(() => {
    try {
      const storedDate = localStorage.getItem(STORAGE_KEYS.BIRTH_DATE);
      const storedLat = localStorage.getItem(STORAGE_KEYS.BIRTH_LAT);
      const storedLon = localStorage.getItem(STORAGE_KEYS.BIRTH_LON);
      const storedPlace = localStorage.getItem(STORAGE_KEYS.BIRTH_PLACE);

      if (storedDate) {
        const date = new Date(storedDate);
        if (!isNaN(date.getTime())) {
          setBirthDate(date);
          setSelectedDate(date);
          if (date.getHours() !== 12 || date.getMinutes() !== 0) {
            setShowTimeInput(true);
            setTimeHour(date.getHours());
            setTimeMinute(date.getMinutes());
          }
          setShowOnboarding(false);
        }
      }

      if (storedLat && storedLon) {
        const lat = parseFloat(storedLat);
        const lon = parseFloat(storedLon);
        if (!isNaN(lat) && !isNaN(lon)) {
          setBirthLatitude(lat);
          setBirthLongitude(lon);
          setBirthPlaceName(storedPlace);
          setHasBirthLocation(true);
          setShowLocationInput(true);
        }
      }
    } catch {
      /* localStorage not available */
    }
    setIsLoadingFromStorage(false);
  }, []);

  const saveToStorage = useCallback(
    (date: Date, lat: number, lon: number, placeName: string | null, hasLoc: boolean) => {
      try {
        localStorage.setItem(STORAGE_KEYS.BIRTH_DATE, date.toISOString());
        if (hasLoc) {
          localStorage.setItem(STORAGE_KEYS.BIRTH_LAT, lat.toString());
          localStorage.setItem(STORAGE_KEYS.BIRTH_LON, lon.toString());
          if (placeName) localStorage.setItem(STORAGE_KEYS.BIRTH_PLACE, placeName);
          else localStorage.removeItem(STORAGE_KEYS.BIRTH_PLACE);
        } else {
          localStorage.removeItem(STORAGE_KEYS.BIRTH_LAT);
          localStorage.removeItem(STORAGE_KEYS.BIRTH_LON);
          localStorage.removeItem(STORAGE_KEYS.BIRTH_PLACE);
        }
      } catch {
        /* localStorage not available */
      }
    },
    []
  );

  const handlePlaceSelect = useCallback(
    (place: { name: string; lat: number; lon: number } | null) => {
      if (place) {
        setBirthLatitude(place.lat);
        setBirthLongitude(place.lon);
        setBirthPlaceName(place.name);
      } else {
        setBirthPlaceName(null);
      }
    },
    []
  );

  const useCurrentLocation = useCallback(() => {
    if (geo.latitude !== null && geo.longitude !== null) {
      setBirthLatitude(geo.latitude);
      setBirthLongitude(geo.longitude);
      setBirthPlaceName('Current Location');
    }
  }, [geo.latitude, geo.longitude]);

  const mode: ReferenceFrame = 'orbit';

  const worldline = useMemo(() => {
    if (!birthDate) return null;
    return computeWorldlineState(birthDate, birthLatitude);
  }, [birthDate, birthLatitude]);

  const age = useMemo(() => {
    if (!worldline) return null;
    return breakdownDuration(worldline.durationSeconds);
  }, [worldline]);

  const handleOnboardingComplete = useCallback(() => {
    if (!selectedDate) return;

    const hasLoc = showLocationInput && birthPlaceName !== null;
    const finalLat = hasLoc ? birthLatitude : 45;
    const finalLon = hasLoc ? birthLongitude : 0;

    let finalDate: Date;
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth() + 1;
    const day = selectedDate.getDate();

    if (showTimeInput && hasLoc) {
      const { utcDate } = birthTimeToUtc(
        finalLat,
        finalLon,
        year,
        month,
        day,
        timeHour,
        timeMinute
      );
      finalDate = utcDate;
    } else if (showTimeInput) {
      finalDate = new Date(selectedDate);
      finalDate.setHours(timeHour, timeMinute, 0, 0);
    } else {
      if (hasLoc) {
        const { utcDate } = birthTimeToUtc(finalLat, finalLon, year, month, day, 12, 0);
        finalDate = utcDate;
      } else {
        finalDate = new Date(selectedDate);
        finalDate.setHours(12, 0, 0, 0);
      }
    }

    setBirthDate(finalDate);
    setBirthLatitude(finalLat);
    setBirthLongitude(finalLon);
    setHasBirthLocation(hasLoc);
    saveToStorage(finalDate, finalLat, finalLon, birthPlaceName, hasLoc);
    setShowJourneyModal(true);
    setShowOnboarding(false);
  }, [
    selectedDate,
    showTimeInput,
    timeHour,
    timeMinute,
    showLocationInput,
    birthPlaceName,
    birthLatitude,
    birthLongitude,
    saveToStorage,
  ]);

  const handleSkip = useCallback(() => setShowOnboarding(false), []);
  const handleChangeBirthDate = useCallback(() => {
    setShowJourneyModal(false);
    setShowOnboarding(true);
  }, []);

  const handlePrepareShare = useCallback(async (): Promise<boolean> => {
    if (sceneRef.current) {
      return sceneRef.current.prepareForShare();
    }
    return false;
  }, []);

  const clearSavedData = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEYS.BIRTH_DATE);
      localStorage.removeItem(STORAGE_KEYS.BIRTH_LAT);
      localStorage.removeItem(STORAGE_KEYS.BIRTH_LON);
      localStorage.removeItem(STORAGE_KEYS.BIRTH_PLACE);
    } catch {
      /* localStorage not available */
    }
    setBirthDate(null);
    setSelectedDate(null);
    setShowTimeInput(false);
    setTimeHour(12);
    setTimeMinute(0);
    setShowLocationInput(false);
    setBirthPlaceName(null);
    setHasBirthLocation(false);
  }, []);

  const showLoadingOverlay = isLoadingFromStorage || !isSceneReady;
  const isDateComplete = selectedDate !== null;
  const isLocationValid = !showLocationInput || birthPlaceName !== null;

  return (
    <main className="h-screen w-screen overflow-hidden">
      {showLoadingOverlay && (
        <div className="fixed inset-0 z-[300]">
          <LoadingScreen />
        </div>
      )}

      {/* Language switcher - top left (desktop only, mobile uses MobileSettingsSheet) */}
      <div className="fixed top-4 left-4 z-[150] hidden sm:block">
        <LanguageSwitcher />
      </div>

      <SceneShell
        className="h-full w-full"
        overlay={
          <>
            {!isUIHidden && (
              <OverlayTopCenter className="hidden sm:flex">
                <SpacetimeTitle size="md" withBox />
              </OverlayTopCenter>
            )}

            {!isUIHidden && (
              <OverlayBottomLeft className="flex items-center gap-2">
                <FullscreenButton />
                {!showOnboarding && (
                  <button
                    onClick={() =>
                      birthDate ? setShowJourneyModal(true) : setShowOnboarding(true)
                    }
                    className="sm:hidden bg-gradient-to-r from-blue-600/80 to-purple-600/80 backdrop-blur-sm px-3 py-2 rounded-lg border border-white/30 text-white hover:from-blue-500/90 hover:to-purple-500/90 transition-all flex items-center gap-1.5 text-xs shadow-lg shadow-blue-500/20"
                    title={content.journey.tooltip}
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    {content.journey.buttonMobile}
                  </button>
                )}
              </OverlayBottomLeft>
            )}

            {!showOnboarding && !isUIHidden && (
              <div className="hidden sm:block pointer-events-auto absolute bottom-4 left-1/2 -translate-x-1/2">
                <button
                  onClick={() =>
                    birthDate ? setShowJourneyModal(true) : setShowOnboarding(true)
                  }
                  className="bg-gradient-to-r from-blue-600/80 to-purple-600/80 backdrop-blur-sm px-5 py-2 rounded-full border border-white/30 text-white hover:from-blue-500/90 hover:to-purple-500/90 hover:border-white/40 transition-all flex items-center gap-2 text-sm shadow-lg shadow-blue-500/20"
                  title={content.journey.tooltip}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  {content.journey.button}
                </button>
              </div>
            )}
          </>
        }
      >
        <Scene
          mode={mode}
          latitude={birthLatitude}
          longitude={birthLongitude}
          birthDate={birthDate}
          showBirthMarker={hasBirthLocation}
          onEditBirthData={handleChangeBirthDate}
          birthPlaceName={birthPlaceName}
          onReady={() => setIsSceneReady(true)}
          onCanvasReady={setCanvasRef}
          sceneRef={sceneRef}
        />
      </SceneShell>

      <JourneyModal
        isOpen={showJourneyModal}
        onClose={() => setShowJourneyModal(false)}
        worldline={worldline}
        age={age}
        speedUnit={speedUnit}
        onSpeedUnitChange={setSpeedUnit}
        onChangeBirthDate={handleChangeBirthDate}
        locale={locale}
        canvasRef={canvasRef}
        appUrl={APP_URL}
        appName={APP_NAME}
        onPrepareShare={handlePrepareShare}
        birthDate={birthDate}
      />

      {showOnboarding && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-md p-4 overflow-y-auto">
          <div
            className="w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-2xl"
            style={{
              background:
                'linear-gradient(180deg, rgba(15,15,25,0.98) 0%, rgba(5,5,15,0.99) 100%)',
              boxShadow:
                '0 0 80px rgba(59,130,246,0.1), 0 0 40px rgba(139,92,246,0.08), inset 0 1px 0 rgba(255,255,255,0.1)',
            }}
          >
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-60 rounded-t-3xl" />

            <div className="text-center mb-6">
              <div
                className="w-24 h-24 mx-auto mb-4"
                style={{ perspective: '400px', perspectiveOrigin: '50% 50%' }}
              >
                <div
                  className="w-full h-full"
                  style={{ transform: 'rotateX(60deg)', transformStyle: 'preserve-3d' }}
                >
                  <svg
                    viewBox="0 0 200 200"
                    className="w-full h-full"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <defs>
                      <radialGradient id="onboardingGlow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                      </radialGradient>
                      <linearGradient
                        id="onboardingOrbit1"
                        x1="0%"
                        y1="0%"
                        x2="100%"
                        y2="100%"
                      >
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
                        <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.6" />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.2" />
                      </linearGradient>
                      <linearGradient
                        id="onboardingOrbit2"
                        x1="100%"
                        y1="0%"
                        x2="0%"
                        y2="100%"
                      >
                        <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.7" />
                        <stop offset="50%" stopColor="#ef4444" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.2" />
                      </linearGradient>
                      <linearGradient
                        id="onboardingOrbit3"
                        x1="0%"
                        y1="100%"
                        x2="100%"
                        y2="0%"
                      >
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.6" />
                        <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.1" />
                      </linearGradient>
                    </defs>
                    <circle cx="100" cy="100" r="80" fill="url(#onboardingGlow)" />
                    <ellipse
                      cx="100"
                      cy="100"
                      rx="75"
                      ry="75"
                      stroke="url(#onboardingOrbit1)"
                      strokeWidth="1.5"
                      strokeDasharray="4 2"
                      fill="none"
                    />
                    <ellipse
                      cx="100"
                      cy="100"
                      rx="52"
                      ry="52"
                      stroke="url(#onboardingOrbit2)"
                      strokeWidth="1.5"
                      strokeDasharray="3 3"
                      fill="none"
                    />
                    <ellipse
                      cx="100"
                      cy="100"
                      rx="30"
                      ry="30"
                      stroke="url(#onboardingOrbit3)"
                      strokeWidth="1"
                      strokeDasharray="2 4"
                      fill="none"
                    />
                    <circle
                      cx="175"
                      cy="100"
                      r="6"
                      fill="#3b82f6"
                      className="animate-[orbitOuterSlow_8s_linear_infinite]"
                      style={{ transformOrigin: '100px 100px' }}
                    />
                    <circle
                      cx="152"
                      cy="100"
                      r="5"
                      fill="#f59e0b"
                      className="animate-[orbitMiddleSlow_5s_linear_infinite]"
                      style={{ transformOrigin: '100px 100px' }}
                    />
                    <circle
                      cx="130"
                      cy="100"
                      r="3.5"
                      fill="#10b981"
                      className="animate-[orbitInnerSlow_2s_linear_infinite]"
                      style={{ transformOrigin: '100px 100px' }}
                    />
                    <circle
                      cx="100"
                      cy="100"
                      r="14"
                      fill="#fbbf24"
                      className="animate-pulse"
                    />
                    <circle cx="100" cy="100" r="9" fill="#fef3c7" />
                  </svg>
                </div>
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                {content.onboarding.title}
              </h1>
              <p className="text-sm text-neutral-400 max-w-sm mx-auto">
                {content.onboarding.description}
              </p>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  {content.onboarding.birthDate}
                </label>
                <DatePickerInput
                  value={selectedDate}
                  onChange={setSelectedDate}
                  maxDate={new Date()}
                  locale={locale as Locale}
                />
              </div>

              {selectedDate && (
                <div
                  className="p-4 rounded-xl text-center"
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(59,130,246,0.15) 100%)',
                  }}
                >
                  <div className="text-xs text-neutral-400 mb-1">
                    {content.onboarding.journeyBegan}
                  </div>
                  <div className="text-xl font-bold text-white">
                    {formatDateForDisplay(selectedDate, content.onboarding.months)}
                    {showTimeInput && (
                      <span className="text-lg text-neutral-400 ml-2">
                        at {String(timeHour).padStart(2, '0')}:
                        {String(timeMinute).padStart(2, '0')}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {selectedDate && (
                <div>
                  {!showTimeInput ? (
                    <button
                      onClick={() => setShowTimeInput(true)}
                      className="text-sm text-neutral-400 hover:text-blue-400 transition-colors flex items-center gap-1.5"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      {content.onboarding.addTime}
                    </button>
                  ) : (
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm text-neutral-300">
                          {content.onboarding.birthTime}
                        </span>
                        <button
                          onClick={() => {
                            setShowTimeInput(false);
                            setTimeHour(12);
                            setTimeMinute(0);
                          }}
                          className="text-xs text-neutral-500 hover:text-neutral-300"
                        >
                          {content.onboarding.removeTime}
                        </button>
                      </div>
                      <TimePicker
                        hour={timeHour}
                        minute={timeMinute}
                        onHourChange={setTimeHour}
                        onMinuteChange={setTimeMinute}
                        locale={locale as Locale}
                      />
                    </div>
                  )}
                </div>
              )}

              {selectedDate && (
                <div>
                  {!showLocationInput ? (
                    <button
                      onClick={() => setShowLocationInput(true)}
                      className="text-sm text-neutral-400 hover:text-blue-400 transition-colors flex items-center gap-1.5"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {content.onboarding.addLocation}
                    </button>
                  ) : (
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-neutral-300">
                          {content.onboarding.birthLocation}
                        </span>
                        <button
                          onClick={() => {
                            setShowLocationInput(false);
                            setBirthPlaceName(null);
                          }}
                          className="text-xs text-neutral-500 hover:text-neutral-300"
                        >
                          {content.onboarding.removeLocation}
                        </button>
                      </div>
                      <PlaceSearchInput
                        value={
                          birthPlaceName
                            ? {
                                name: birthPlaceName,
                                lat: birthLatitude,
                                lon: birthLongitude,
                              }
                            : null
                        }
                        onChange={handlePlaceSelect}
                        onUseCurrentLocation={useCurrentLocation}
                        hasGeolocation={geo.latitude !== null}
                        locale={locale as Locale}
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSkip}
                  className="flex-1 px-4 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white transition-all text-sm flex items-center justify-center gap-2"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                  <span className="hidden sm:inline">{content.onboarding.skip}</span>
                  <span className="sm:hidden">{content.onboarding.skipMobile}</span>
                </button>
                <button
                  onClick={handleOnboardingComplete}
                  disabled={!isDateComplete || !isLocationValid}
                  className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-medium transition-all text-sm disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-blue-500/25"
                >
                  {content.onboarding.beginJourney}
                </button>
              </div>

              {birthDate && (
                <button
                  onClick={clearSavedData}
                  className="w-full text-center text-xs text-neutral-500 hover:text-neutral-400 transition-colors"
                >
                  {content.onboarding.clearData}
                </button>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-white/5">
              <p className="text-xs text-neutral-500 text-center flex items-center justify-center gap-2">
                <svg
                  className="w-4 h-4 text-emerald-500/70"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                {content.onboarding.privacy}
              </p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

/**
 * Main page component wrapped with LocaleProvider for client-side language switching.
 */
export default function LocalePage() {
  return (
    <LocaleProvider>
      <LocalePageContent />
    </LocaleProvider>
  );
}
