/**
 * Unit conversion utilities.
 */

import {
  KM_PER_MILE,
  LIGHT_YEAR_KM,
  ASTRONOMICAL_UNIT_KM,
  PARSEC_KM,
  MOON_MEAN_DISTANCE_KM,
  PLUTO_MEAN_DISTANCE_KM,
} from '../constants';

// =============================================================================
// SPEED CONVERSIONS
// =============================================================================

export function kmsToKmh(kms: number): number {
  return kms * 3600;
}

export function kmsToMph(kms: number): number {
  return (kms * 3600) / KM_PER_MILE;
}

export function kmsToMs(kms: number): number {
  return kms * 1000;
}

export function msToKms(ms: number): number {
  return ms / 1000;
}

// =============================================================================
// DISTANCE CONVERSIONS
// =============================================================================

export function kmToMiles(km: number): number {
  return km / KM_PER_MILE;
}

export function kmToAU(km: number): number {
  return km / ASTRONOMICAL_UNIT_KM;
}

export function kmToLightYears(km: number): number {
  return km / LIGHT_YEAR_KM;
}

export function kmToParsecs(km: number): number {
  return km / PARSEC_KM;
}

export function lightYearsToKm(ly: number): number {
  return ly * LIGHT_YEAR_KM;
}

export function auToKm(au: number): number {
  return au * ASTRONOMICAL_UNIT_KM;
}

// =============================================================================
// COMPARATIVE DISTANCES
// =============================================================================

/**
 * Computes how many Moon round trips a distance represents.
 * One round trip = 2 × Moon mean distance.
 */
export function moonRoundTrips(distanceKm: number): number {
  return distanceKm / (2 * MOON_MEAN_DISTANCE_KM);
}

/**
 * Computes how many times you could reach Pluto (one-way).
 */
export function plutoTrips(distanceKm: number): number {
  return distanceKm / PLUTO_MEAN_DISTANCE_KM;
}

/**
 * Computes progress toward 1 light-year as a percentage.
 */
export function lightYearProgress(distanceKm: number): number {
  return (distanceKm / LIGHT_YEAR_KM) * 100;
}

// =============================================================================
// FORMATTING
// =============================================================================

/**
 * Formats a large number with compact notation.
 * Example: 1234567 → "1.23M"
 */
export function formatCompact(value: number, decimals = 2): string {
  const suffixes = ['', 'K', 'M', 'B', 'T'];
  let suffixIndex = 0;
  let scaled = Math.abs(value);

  while (scaled >= 1000 && suffixIndex < suffixes.length - 1) {
    scaled /= 1000;
    suffixIndex++;
  }

  const sign = value < 0 ? '-' : '';
  return `${sign}${scaled.toFixed(decimals)}${suffixes[suffixIndex]}`;
}

/**
 * Formats a distance with appropriate unit.
 * Automatically selects km, AU, or light-years based on magnitude.
 */
export function formatDistance(km: number): {
  value: number;
  unit: string;
  formatted: string;
} {
  const absKm = Math.abs(km);

  if (absKm < ASTRONOMICAL_UNIT_KM / 100) {
    // Less than 0.01 AU: use km
    return {
      value: km,
      unit: 'km',
      formatted: `${formatCompact(km)} km`,
    };
  }

  if (absKm < LIGHT_YEAR_KM / 100) {
    // Less than 0.01 LY: use AU
    const au = kmToAU(km);
    return {
      value: au,
      unit: 'AU',
      formatted: `${au.toFixed(2)} AU`,
    };
  }

  // Use light-years
  const ly = kmToLightYears(km);
  return {
    value: ly,
    unit: 'ly',
    formatted: `${ly.toFixed(4)} ly`,
  };
}

/**
 * Formats a speed with unit.
 */
export function formatSpeed(kms: number, unit: 'km/s' | 'km/h' | 'mph' = 'km/s'): string {
  switch (unit) {
    case 'km/h':
      return `${formatCompact(kmsToKmh(kms))} km/h`;
    case 'mph':
      return `${formatCompact(kmsToMph(kms))} mph`;
    default:
      return `${kms.toFixed(2)} km/s`;
  }
}

// =============================================================================
// UNIFIED FORMATTING (single source of truth for all UI formatting)
// =============================================================================

export type SpeedUnit = 'km/s' | 'km/h' | 'mph';
export type DistanceUnit = 'km' | 'miles' | 'au';

export interface FormatSpeedOptions {
  /** Number of decimal places for km/s (default: 2) */
  decimalsKms?: number;
  /** Whether to use locale-aware number formatting (default: true) */
  useLocale?: boolean;
}

/**
 * Formats speed with unit, using consistent conversion across all UI.
 * This is the single source of truth for speed formatting.
 *
 * Conversion factors:
 * - km/h: kms * 3600
 * - mph: (kms * 3600) / KM_PER_MILE
 */
export function formatSpeedWithUnit(
  kms: number,
  unit: SpeedUnit,
  options: FormatSpeedOptions = {}
): string {
  const { decimalsKms = 2, useLocale = true } = options;

  switch (unit) {
    case 'km/h': {
      const kmh = kms * 3600;
      const formatted = useLocale
        ? kmh.toLocaleString(undefined, { maximumFractionDigits: 0 })
        : Math.round(kmh).toString();
      return `${formatted} km/h`;
    }
    case 'mph': {
      // Standardized: (kms * 3600) / KM_PER_MILE
      // KM_PER_MILE = 1.609344, so divisor is the same
      const mph = (kms * 3600) / KM_PER_MILE;
      const formatted = useLocale
        ? mph.toLocaleString(undefined, { maximumFractionDigits: 0 })
        : Math.round(mph).toString();
      return `${formatted} mph`;
    }
    default: {
      return `${kms.toFixed(decimalsKms)} km/s`;
    }
  }
}

export interface TranslatedSuffixes {
  trillion?: string;
  billion?: string;
  million?: string;
  thousand?: string;
}

export interface DistanceFullResult {
  value: string;
  suffix: string;
}

/**
 * Formats distance with full word suffix (e.g., "2.50 Billion km").
 * Use for hero displays where readability is important.
 *
 * @param km Distance in kilometers
 * @param unit Target unit (km, miles, or au)
 * @param translations Optional translated suffixes
 */
export function formatDistanceFullWords(
  km: number,
  unit: DistanceUnit,
  translations?: TranslatedSuffixes
): DistanceFullResult {
  // Convert to AU first if requested
  if (unit === 'au') {
    const au = km / ASTRONOMICAL_UNIT_KM;
    if (au >= 1000) {
      return {
        value: au.toLocaleString(undefined, { maximumFractionDigits: 0 }),
        suffix: 'AU',
      };
    }
    return { value: au.toFixed(2), suffix: 'AU' };
  }

  // Convert to target unit
  let value = km;
  const unitLabel = unit === 'miles' ? 'miles' : 'km';

  if (unit === 'miles') {
    value = km / KM_PER_MILE;
  }

  // Get translated suffixes or defaults
  const trillion = translations?.trillion ?? 'Trillion';
  const billion = translations?.billion ?? 'Billion';
  const million = translations?.million ?? 'Million';
  const thousand = translations?.thousand ?? 'Thousand';

  if (value >= 1e12) {
    return { value: (value / 1e12).toFixed(2), suffix: `${trillion} ${unitLabel}` };
  }
  if (value >= 1e9) {
    return { value: (value / 1e9).toFixed(2), suffix: `${billion} ${unitLabel}` };
  }
  if (value >= 1e6) {
    return { value: (value / 1e6).toFixed(2), suffix: `${million} ${unitLabel}` };
  }
  if (value >= 1e3) {
    return { value: (value / 1e3).toFixed(0), suffix: `${thousand} ${unitLabel}` };
  }
  return { value: value.toFixed(0), suffix: unitLabel };
}

/**
 * Formats distance compactly with abbreviated suffix (e.g., "2.5B km").
 * Use for breakdown rows and secondary displays.
 *
 * @param km Distance in kilometers
 * @param unit Target unit (km, miles, or au)
 */
export function formatDistanceCompactUnified(km: number, unit: DistanceUnit): string {
  // Handle AU separately
  if (unit === 'au') {
    const au = km / ASTRONOMICAL_UNIT_KM;
    if (au >= 0.01) {
      return `${au.toFixed(2)} AU`;
    }
    return `${(au * 1000).toFixed(2)} mAU`;
  }

  // Convert to target unit
  let value = km;
  let unitLabel = 'km';

  if (unit === 'miles') {
    value = km / KM_PER_MILE;
    unitLabel = 'mi';
  }

  if (value >= 1e12) return `${(value / 1e12).toFixed(2)}T ${unitLabel}`;
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B ${unitLabel}`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M ${unitLabel}`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(0)}K ${unitLabel}`;
  return `${value.toFixed(0)} ${unitLabel}`;
}

/**
 * Formats a number with appropriate K/M/B suffix for display.
 * Use for statistics like "moon trips" or "Earth circumferences".
 *
 * @param n Number to format
 * @param decimals Decimal places (default: 1)
 */
export function formatNumberCompact(n: number, decimals = 1): string {
  const abs = Math.abs(n);

  if (abs >= 1e9) {
    return `${(n / 1e9).toFixed(decimals)}B`;
  }
  if (abs >= 1e6) {
    return `${(n / 1e6).toFixed(decimals)}M`;
  }
  if (abs >= 1e3) {
    return `${(n / 1e3).toFixed(decimals)}K`;
  }
  if (abs >= 100) {
    return Math.floor(n).toLocaleString();
  }
  if (abs >= 1) {
    return n.toFixed(decimals);
  }
  return n.toFixed(3);
}

/**
 * Formats a statistic value with automatic precision selection.
 * Use for milestone statistics that can range from small to huge numbers.
 */
export function formatStatistic(value: number): string {
  if (value >= 1e6) {
    return `${(value / 1e6).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  if (value >= 100) {
    return value.toFixed(0);
  }
  if (value >= 10) {
    return value.toFixed(1);
  }
  if (value >= 1) {
    return value.toFixed(1);
  }
  return value.toFixed(2);
}
