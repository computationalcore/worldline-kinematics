/**
 * Timezone utilities for birth location time conversion.
 */

import tzLookup from 'tz-lookup';
import { fromZonedTime } from 'date-fns-tz';

/**
 * Get IANA timezone identifier from latitude/longitude.
 *
 * Uses tz-lookup for fast offline timezone boundary lookup.
 *
 * @param lat Latitude in degrees (-90 to 90)
 * @param lon Longitude in degrees (-180 to 180)
 * @returns IANA timezone string (e.g., "America/Sao_Paulo")
 */
export function getTimezoneFromCoords(lat: number, lon: number): string {
  try {
    return tzLookup(lat, lon);
  } catch {
    // Fallback to UTC if lookup fails (e.g., coordinates in ocean)
    return 'UTC';
  }
}

/**
 * Convert a local date/time in a specific timezone to UTC.
 *
 * This is the key function for fixing the "noon becomes night" bug:
 * it interprets the entered clock time in the birth location's timezone,
 * not the browser's timezone.
 *
 * @param year Year (e.g., 1984)
 * @param month Month (1-12)
 * @param day Day of month (1-31)
 * @param hour Hour (0-23)
 * @param minute Minute (0-59)
 * @param timezone IANA timezone string (e.g., "America/New_York")
 * @returns Date object representing the UTC instant
 */
export function localTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timezone: string
): Date {
  // Create a Date object representing the local time in the specified timezone.
  // fromZonedTime interprets the date components as if they were in the given timezone
  // and returns the equivalent UTC instant.
  const localDate = new Date(year, month - 1, day, hour, minute, 0, 0);
  return fromZonedTime(localDate, timezone);
}

/**
 * Convert coordinates and local time components to a UTC Date.
 *
 * Convenience function that combines timezone lookup and conversion.
 * Use this when you have the birth location coordinates and want to
 * convert a local clock time to the exact UTC instant.
 *
 * @param lat Birth latitude in degrees
 * @param lon Birth longitude in degrees
 * @param year Year (e.g., 1984)
 * @param month Month (1-12)
 * @param day Day of month (1-31)
 * @param hour Hour (0-23)
 * @param minute Minute (0-59)
 * @returns Object with UTC Date and the IANA timezone used
 *
 * @example
 * ```ts
 * // Birth in Sao Paulo at 12:00 local time
 * const { utcDate, timezone } = birthTimeToUtc(-23.55, -46.64, 1984, 10, 3, 12, 0);
 * // utcDate is 1984-10-03T15:00:00.000Z (UTC)
 * // timezone is "America/Sao_Paulo"
 * ```
 */
export function birthTimeToUtc(
  lat: number,
  lon: number,
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number
): { utcDate: Date; timezone: string } {
  const timezone = getTimezoneFromCoords(lat, lon);
  const utcDate = localTimeToUtc(year, month, day, hour, minute, timezone);
  return { utcDate, timezone };
}
