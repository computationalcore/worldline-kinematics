/**
 * Tests for UI utility functions.
 */
import { describe, it, expect } from 'vitest';
import {
  cn,
  formatLightTime,
  formatDateTime,
  formatNumber,
  formatCompactNumber,
} from '../src/utils';

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles conditional classes', () => {
    const isActive = true;
    const isDisabled = false;
    expect(cn('base', isActive && 'active', isDisabled && 'disabled')).toBe(
      'base active'
    );
  });

  it('deduplicates Tailwind classes', () => {
    expect(cn('p-4', 'p-2')).toBe('p-2');
  });
});

describe('formatLightTime', () => {
  it('formats seconds for small distances', () => {
    expect(formatLightTime(0.05)).toBe('25s');
  });

  it('formats minutes and seconds', () => {
    expect(formatLightTime(1.0)).toMatch(/8m/);
  });

  it('formats hours and minutes for large distances', () => {
    const result = formatLightTime(10);
    expect(result).toMatch(/1h/);
  });

  it('handles zero distance', () => {
    expect(formatLightTime(0)).toBe('0s');
  });
});

describe('formatDateTime', () => {
  it('formats date in expected format', () => {
    const date = new Date('2024-01-15T14:30:00Z');
    const result = formatDateTime(date);
    expect(result).toContain('Jan');
    expect(result).toContain('15');
    expect(result).toContain('2024');
  });
});

describe('formatNumber', () => {
  it('formats number with default precision', () => {
    expect(formatNumber(29.78)).toBe('29.78');
  });

  it('formats number with unit', () => {
    expect(formatNumber(29.78, 'km/s')).toBe('29.78 km/s');
  });

  it('respects custom precision', () => {
    expect(formatNumber(29.78123, 'AU', 4)).toBe('29.7812 AU');
  });
});

describe('formatCompactNumber', () => {
  it('formats thousands', () => {
    expect(formatCompactNumber(1500)).toBe('1.5K');
  });

  it('formats millions', () => {
    expect(formatCompactNumber(2500000)).toBe('2.5M');
  });

  it('formats billions', () => {
    expect(formatCompactNumber(3200000000)).toBe('3.2B');
  });

  it('formats trillions', () => {
    expect(formatCompactNumber(1500000000000)).toBe('1.5T');
  });

  it('handles negative numbers', () => {
    expect(formatCompactNumber(-1500)).toBe('-1.5K');
  });

  it('handles small numbers without suffix', () => {
    expect(formatCompactNumber(999)).toBe('999.0');
  });
});
