/**
 * Age and duration calculations.
 */

import { SOLAR_DAY_SECONDS, JULIAN_YEAR_SECONDS } from '../constants';
import { parseDateInput } from './parse';

/**
 * Represents a parsed age/duration with human-readable components.
 */
export interface AgeDuration {
  totalSeconds: number;
  totalDays: number;
  totalYears: number;
  years: number;
  months: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  /** True when the birth date is in the future (negative duration). */
  isPreBirth: boolean;
}

/**
 * Computes the duration between a birth date and a target date in seconds.
 * Returns negative values when birth date is in the future (pre-birth state).
 *
 * Date-only strings (YYYY-MM-DD) are interpreted as LOCAL NOON to avoid
 * timezone issues where the date could shift backward for users west of UTC.
 *
 * @param birthDate Birth date (Date object or ISO string)
 * @param targetDate Target date (default: now)
 * @returns Duration in seconds (negative if birth is in the future)
 */
export function computeDurationSeconds(
  birthDate: Date | string,
  targetDate: Date | string = new Date()
): number {
  const birth = parseDateInput(birthDate);
  const target = parseDateInput(targetDate);

  if (isNaN(birth.getTime())) {
    throw new Error('Invalid birth date');
  }
  if (isNaN(target.getTime())) {
    throw new Error('Invalid target date');
  }

  return (target.getTime() - birth.getTime()) / 1000;
}

/**
 * Breaks down a duration in seconds into human-readable components.
 * Handles negative durations gracefully (pre-birth state).
 *
 * Note: Uses average month length (30.4375 days = 365.25/12) for display.
 * This is an approximation; actual calendar months vary.
 *
 * @param totalSeconds Duration in seconds (can be negative)
 * @returns AgeDuration object with isPreBirth flag
 */
export function breakdownDuration(totalSeconds: number): AgeDuration {
  const isPreBirth = totalSeconds < 0;

  // Clamp to zero for pre-birth state
  const effectiveSeconds = Math.max(0, totalSeconds);

  const totalDays = effectiveSeconds / SOLAR_DAY_SECONDS;
  const totalYears = effectiveSeconds / JULIAN_YEAR_SECONDS;

  const years = Math.floor(totalYears);
  const remainingAfterYears = effectiveSeconds - years * JULIAN_YEAR_SECONDS;

  const avgMonthSeconds = JULIAN_YEAR_SECONDS / 12;
  const months = Math.floor(remainingAfterYears / avgMonthSeconds);
  const remainingAfterMonths = remainingAfterYears - months * avgMonthSeconds;

  const days = Math.floor(remainingAfterMonths / SOLAR_DAY_SECONDS);
  const remainingAfterDays = remainingAfterMonths - days * SOLAR_DAY_SECONDS;

  const hours = Math.floor(remainingAfterDays / 3600);
  const remainingAfterHours = remainingAfterDays - hours * 3600;

  const minutes = Math.floor(remainingAfterHours / 60);
  const seconds = Math.floor(remainingAfterHours - minutes * 60);

  return {
    totalSeconds: effectiveSeconds,
    totalDays,
    totalYears,
    years,
    months,
    days,
    hours,
    minutes,
    seconds,
    isPreBirth,
  };
}

/**
 * Computes age duration from birth date to now.
 *
 * @param birthDate Birth date
 * @returns AgeDuration object
 */
export function computeAge(birthDate: Date | string): AgeDuration {
  const seconds = computeDurationSeconds(birthDate);
  return breakdownDuration(seconds);
}

/**
 * Formats a duration for display.
 * Example: "41y 3m 21d | 00h:07m:45s"
 *
 * @param duration AgeDuration object
 * @returns Formatted string
 */
export function formatDuration(duration: AgeDuration): string {
  const { years, months, days, hours, minutes, seconds } = duration;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${years}y ${months}m ${days}d | ${pad(hours)}h:${pad(minutes)}m:${pad(seconds)}s`;
}
