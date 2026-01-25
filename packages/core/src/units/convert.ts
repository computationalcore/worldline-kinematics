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
