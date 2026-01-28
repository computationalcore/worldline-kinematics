/**
 * Tests for age and duration calculations.
 */
import { describe, it, expect } from 'vitest';
import {
  computeDurationSeconds,
  breakdownDuration,
  computeAge,
  formatDuration,
} from '../src/time/age';
import { SOLAR_DAY_SECONDS, JULIAN_YEAR_SECONDS } from '../src/constants';

describe('computeDurationSeconds', () => {
  it('computes positive duration for past birth date', () => {
    const birth = new Date('2000-01-01T00:00:00Z');
    const target = new Date('2000-01-02T00:00:00Z');
    expect(computeDurationSeconds(birth, target)).toBe(SOLAR_DAY_SECONDS);
  });

  it('computes negative duration for future birth date', () => {
    const birth = new Date('2000-01-02T00:00:00Z');
    const target = new Date('2000-01-01T00:00:00Z');
    expect(computeDurationSeconds(birth, target)).toBe(-SOLAR_DAY_SECONDS);
  });

  it('accepts ISO string dates', () => {
    const result = computeDurationSeconds('2000-01-01', '2000-01-02');
    expect(result).toBeGreaterThan(0);
  });

  it('accepts date-only strings (YYYY-MM-DD)', () => {
    const result = computeDurationSeconds('2020-06-15', '2020-06-16');
    expect(result).toBeCloseTo(SOLAR_DAY_SECONDS, 0);
  });

  it('throws for invalid birth date', () => {
    expect(() => computeDurationSeconds('invalid', new Date())).toThrow(
      'Invalid birth date'
    );
  });

  it('throws for invalid target date', () => {
    expect(() => computeDurationSeconds(new Date(), 'invalid')).toThrow(
      'Invalid target date'
    );
  });

  it('returns zero for same instant', () => {
    const date = new Date('2020-01-01T12:00:00Z');
    expect(computeDurationSeconds(date, date)).toBe(0);
  });

  it('defaults target to now when not provided', () => {
    const oneYearAgo = new Date(Date.now() - JULIAN_YEAR_SECONDS * 1000);
    const result = computeDurationSeconds(oneYearAgo);
    expect(result).toBeCloseTo(JULIAN_YEAR_SECONDS, -2);
  });
});

describe('breakdownDuration', () => {
  it('breaks down one year correctly', () => {
    const result = breakdownDuration(JULIAN_YEAR_SECONDS);
    expect(result.years).toBe(1);
    expect(result.months).toBe(0);
    expect(result.days).toBe(0);
    expect(result.totalYears).toBeCloseTo(1, 5);
    expect(result.isPreBirth).toBe(false);
  });

  it('breaks down complex duration', () => {
    // 2 years, 3 months, 15 days, 6 hours, 30 minutes, 45 seconds
    const twoYears = 2 * JULIAN_YEAR_SECONDS;
    const threeMonths = 3 * (JULIAN_YEAR_SECONDS / 12);
    const fifteenDays = 15 * SOLAR_DAY_SECONDS;
    const sixHours = 6 * 3600;
    const thirtyMin = 30 * 60;
    const fortyfiveSec = 45;

    const total =
      twoYears + threeMonths + fifteenDays + sixHours + thirtyMin + fortyfiveSec;
    const result = breakdownDuration(total);

    expect(result.years).toBe(2);
    expect(result.months).toBe(3);
    expect(result.days).toBe(15);
    expect(result.hours).toBe(6);
    expect(result.minutes).toBe(30);
    expect(result.seconds).toBe(45);
  });

  it('handles zero duration', () => {
    const result = breakdownDuration(0);
    expect(result.totalSeconds).toBe(0);
    expect(result.years).toBe(0);
    expect(result.months).toBe(0);
    expect(result.days).toBe(0);
    expect(result.isPreBirth).toBe(false);
  });

  it('handles negative duration (pre-birth)', () => {
    const result = breakdownDuration(-SOLAR_DAY_SECONDS);
    expect(result.isPreBirth).toBe(true);
    expect(result.totalSeconds).toBe(0);
    expect(result.years).toBe(0);
  });

  it('computes totalDays correctly', () => {
    const result = breakdownDuration(SOLAR_DAY_SECONDS * 10);
    expect(result.totalDays).toBeCloseTo(10, 5);
  });
});

describe('computeAge', () => {
  it('returns AgeDuration object', () => {
    const birthDate = new Date(Date.now() - JULIAN_YEAR_SECONDS * 1000 * 30);
    const result = computeAge(birthDate);
    expect(result.totalYears).toBeCloseTo(30, 0);
    expect(result.isPreBirth).toBe(false);
  });

  it('handles future birth date', () => {
    const futureDate = new Date(Date.now() + SOLAR_DAY_SECONDS * 1000);
    const result = computeAge(futureDate);
    expect(result.isPreBirth).toBe(true);
  });
});

describe('formatDuration', () => {
  it('formats duration correctly', () => {
    const duration = breakdownDuration(
      JULIAN_YEAR_SECONDS + SOLAR_DAY_SECONDS * 45 + 3661
    );
    const formatted = formatDuration(duration);
    expect(formatted).toMatch(/1y.*m.*d.*h.*m.*s/);
  });

  it('pads single digits', () => {
    const duration = breakdownDuration(3661); // 1h 1m 1s
    const formatted = formatDuration(duration);
    expect(formatted).toContain('01h:01m:01s');
  });

  it('handles zero duration', () => {
    const duration = breakdownDuration(0);
    const formatted = formatDuration(duration);
    expect(formatted).toBe('0y 0m 0d | 00h:00m:00s');
  });
});
