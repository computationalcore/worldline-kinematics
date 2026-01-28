/**
 * Tests for date parsing utilities.
 */
import { describe, it, expect } from 'vitest';
import { parseDateInput, formatDateInput } from '../src/time/parse';

describe('parseDateInput', () => {
  it('returns Date objects unchanged', () => {
    const date = new Date('2020-06-15T14:30:00Z');
    expect(parseDateInput(date)).toBe(date);
  });

  it('parses date-only strings as local noon', () => {
    const result = parseDateInput('2020-06-15');
    expect(result.getFullYear()).toBe(2020);
    expect(result.getMonth()).toBe(5); // June (0-indexed)
    expect(result.getDate()).toBe(15);
    expect(result.getHours()).toBe(12); // Local noon
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
  });

  it('handles ISO timestamps with time', () => {
    const result = parseDateInput('2020-06-15T14:30:00Z');
    expect(result.getTime()).toBe(new Date('2020-06-15T14:30:00Z').getTime());
  });

  it('handles ISO timestamps without Z', () => {
    const result = parseDateInput('2020-06-15T14:30:00');
    expect(result).toBeInstanceOf(Date);
    expect(result.getFullYear()).toBe(2020);
  });

  it('trims whitespace from strings', () => {
    const result = parseDateInput('  2020-06-15  ');
    expect(result.getFullYear()).toBe(2020);
    expect(result.getHours()).toBe(12);
  });

  it('handles leap years', () => {
    const result = parseDateInput('2020-02-29');
    expect(result.getMonth()).toBe(1);
    expect(result.getDate()).toBe(29);
  });

  it('handles year boundaries', () => {
    const result = parseDateInput('2020-12-31');
    expect(result.getFullYear()).toBe(2020);
    expect(result.getMonth()).toBe(11);
    expect(result.getDate()).toBe(31);
  });

  it('handles early dates', () => {
    const result = parseDateInput('1900-01-01');
    expect(result.getFullYear()).toBe(1900);
  });
});

describe('formatDateInput', () => {
  it('formats date as YYYY-MM-DD', () => {
    const date = new Date(2020, 5, 15, 12, 0, 0); // June 15, 2020
    expect(formatDateInput(date)).toBe('2020-06-15');
  });

  it('pads single-digit months', () => {
    const date = new Date(2020, 0, 15); // January
    expect(formatDateInput(date)).toBe('2020-01-15');
  });

  it('pads single-digit days', () => {
    const date = new Date(2020, 5, 5); // June 5
    expect(formatDateInput(date)).toBe('2020-06-05');
  });

  it('handles year boundaries', () => {
    const date = new Date(2020, 11, 31); // December 31
    expect(formatDateInput(date)).toBe('2020-12-31');
  });

  it('handles leap day', () => {
    const date = new Date(2020, 1, 29); // February 29
    expect(formatDateInput(date)).toBe('2020-02-29');
  });

  it('round-trips with parseDateInput', () => {
    const original = '2020-06-15';
    const parsed = parseDateInput(original);
    const formatted = formatDateInput(parsed);
    expect(formatted).toBe(original);
  });
});
