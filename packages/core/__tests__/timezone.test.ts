/**
 * Tests for timezone utilities.
 */
import { describe, it, expect } from 'vitest';
import {
  getTimezoneFromCoords,
  localTimeToUtc,
  birthTimeToUtc,
} from '../src/time/timezone';

describe('getTimezoneFromCoords', () => {
  it('returns timezone for New York', () => {
    const tz = getTimezoneFromCoords(40.7128, -74.006);
    expect(tz).toBe('America/New_York');
  });

  it('returns timezone for London', () => {
    const tz = getTimezoneFromCoords(51.5074, -0.1278);
    expect(tz).toBe('Europe/London');
  });

  it('returns timezone for Tokyo', () => {
    const tz = getTimezoneFromCoords(35.6762, 139.6503);
    expect(tz).toBe('Asia/Tokyo');
  });

  it('returns timezone for Sao Paulo', () => {
    const tz = getTimezoneFromCoords(-23.5505, -46.6333);
    expect(tz).toBe('America/Sao_Paulo');
  });

  it('returns timezone for Sydney', () => {
    const tz = getTimezoneFromCoords(-33.8688, 151.2093);
    expect(tz).toBe('Australia/Sydney');
  });

  it('handles edge coordinates', () => {
    // North pole area
    const arctic = getTimezoneFromCoords(89, 0);
    expect(arctic).toBeTruthy();
  });

  it('returns UTC for ocean coordinates', () => {
    // Middle of Atlantic Ocean (may fall back to UTC)
    const tz = getTimezoneFromCoords(30, -40);
    expect(tz).toBeTruthy();
  });
});

describe('localTimeToUtc', () => {
  it('converts New York noon to UTC', () => {
    // New York is UTC-5 (EST) or UTC-4 (EDT)
    const utc = localTimeToUtc(2024, 1, 15, 12, 0, 'America/New_York');
    // In January, NY is EST (UTC-5), so noon local = 17:00 UTC
    expect(utc.getUTCHours()).toBe(17);
    expect(utc.getUTCDate()).toBe(15);
  });

  it('converts London noon to UTC', () => {
    // In January, London is UTC+0
    const utc = localTimeToUtc(2024, 1, 15, 12, 0, 'Europe/London');
    expect(utc.getUTCHours()).toBe(12);
  });

  it('converts Tokyo noon to UTC', () => {
    // Tokyo is always UTC+9
    const utc = localTimeToUtc(2024, 1, 15, 12, 0, 'Asia/Tokyo');
    // Noon in Tokyo = 03:00 UTC
    expect(utc.getUTCHours()).toBe(3);
    expect(utc.getUTCDate()).toBe(15);
  });

  it('handles DST transition', () => {
    // July in New York is EDT (UTC-4)
    const utc = localTimeToUtc(2024, 7, 15, 12, 0, 'America/New_York');
    expect(utc.getUTCHours()).toBe(16);
  });

  it('handles date rollover', () => {
    // 2 AM in Tokyo on Jan 15 = 5 PM UTC on Jan 14
    const utc = localTimeToUtc(2024, 1, 15, 2, 0, 'Asia/Tokyo');
    expect(utc.getUTCDate()).toBe(14);
    expect(utc.getUTCHours()).toBe(17);
  });

  it('handles midnight', () => {
    const utc = localTimeToUtc(2024, 6, 15, 0, 0, 'America/New_York');
    expect(utc).toBeInstanceOf(Date);
  });

  it('handles 23:59', () => {
    const utc = localTimeToUtc(2024, 6, 15, 23, 59, 'America/New_York');
    expect(utc).toBeInstanceOf(Date);
  });
});

describe('birthTimeToUtc', () => {
  it('returns UTC date and timezone', () => {
    const result = birthTimeToUtc(-23.5505, -46.6333, 1984, 10, 3, 12, 0);
    expect(result).toHaveProperty('utcDate');
    expect(result).toHaveProperty('timezone');
    expect(result.utcDate).toBeInstanceOf(Date);
    expect(result.timezone).toBe('America/Sao_Paulo');
  });

  it('converts Sao Paulo birth time correctly', () => {
    // Sao Paulo in October 1984 was UTC-3 (no DST at that time)
    const result = birthTimeToUtc(-23.5505, -46.6333, 1984, 10, 3, 12, 0);
    // 12:00 local = 15:00 UTC (UTC-3)
    expect(result.utcDate.getUTCHours()).toBe(15);
  });

  it('handles New York birth', () => {
    const result = birthTimeToUtc(40.7128, -74.006, 1990, 7, 4, 14, 30);
    expect(result.timezone).toBe('America/New_York');
    // July is EDT (UTC-4), so 14:30 local = 18:30 UTC
    expect(result.utcDate.getUTCHours()).toBe(18);
    expect(result.utcDate.getUTCMinutes()).toBe(30);
  });

  it('handles Tokyo birth', () => {
    const result = birthTimeToUtc(35.6762, 139.6503, 2000, 1, 1, 0, 0);
    expect(result.timezone).toBe('Asia/Tokyo');
    // Midnight in Tokyo on Jan 1 = 15:00 UTC on Dec 31
    expect(result.utcDate.getUTCMonth()).toBe(11); // December
    expect(result.utcDate.getUTCDate()).toBe(31);
  });

  it('handles Sydney birth', () => {
    const result = birthTimeToUtc(-33.8688, 151.2093, 2024, 1, 15, 12, 0);
    expect(result.timezone).toBe('Australia/Sydney');
    // Sydney in January is AEDT (UTC+11)
    // 12:00 local = 01:00 UTC
    expect(result.utcDate.getUTCHours()).toBe(1);
  });
});
