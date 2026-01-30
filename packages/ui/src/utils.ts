/**
 * UI utility functions.
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes with clsx.
 * Handles conflicts and deduplication.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ---------------------------------------------------------------------------
// Formatting Utilities
// ---------------------------------------------------------------------------

/**
 * Light-seconds per AU (astronomical unit).
 * Source: IAU definition of AU and speed of light in vacuum.
 */
const LIGHT_SECONDS_PER_AU = 499.004784;

/**
 * Formats a distance in AU as light travel time.
 *
 * @param distanceAU Distance in astronomical units
 * @returns Formatted string like "8m 20s" or "4h 10m"
 *
 * @example
 * ```ts
 * formatLightTime(1.0);  // "8m 19s" (Earth to Sun)
 * formatLightTime(5.2);  // "43m" (Jupiter to Sun, approximate)
 * ```
 */
export function formatLightTime(distanceAU: number): string {
  const totalSeconds = distanceAU * LIGHT_SECONDS_PER_AU;

  if (totalSeconds < 60) {
    return `${totalSeconds.toFixed(0)}s`;
  } else if (totalSeconds < 3600) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.round(totalSeconds % 60);
    return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
  } else {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.round((totalSeconds % 3600) / 60);
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
}

/**
 * Formats a Date object for display.
 *
 * @param date The date to format
 * @returns Formatted string like "Jan 29, 2024 14:30"
 */
export function formatDateTime(date: Date): string {
  return (
    date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }) +
    ' ' +
    date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  );
}

/**
 * Formats a number with optional units and precision.
 *
 * @param value The number to format
 * @param unit Optional unit suffix (e.g., "km/s", "AU")
 * @param precision Decimal places (default: 2)
 * @returns Formatted string like "29.78 km/s"
 */
export function formatNumber(value: number, unit?: string, precision = 2): string {
  const formatted = value.toFixed(precision);
  return unit ? `${formatted} ${unit}` : formatted;
}

/**
 * Formats a large number with SI prefixes (K, M, B, T).
 *
 * @param value The number to format
 * @param precision Decimal places (default: 1)
 * @returns Formatted string like "1.5M" or "3.2K"
 */
export function formatCompactNumber(value: number, precision = 1): string {
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (absValue >= 1e12) {
    return `${sign}${(absValue / 1e12).toFixed(precision)}T`;
  } else if (absValue >= 1e9) {
    return `${sign}${(absValue / 1e9).toFixed(precision)}B`;
  } else if (absValue >= 1e6) {
    return `${sign}${(absValue / 1e6).toFixed(precision)}M`;
  } else if (absValue >= 1e3) {
    return `${sign}${(absValue / 1e3).toFixed(precision)}K`;
  }
  return `${sign}${absValue.toFixed(precision)}`;
}
