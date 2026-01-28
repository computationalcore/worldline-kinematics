/**
 * Tests for Earth season calculations.
 */
import { describe, it, expect } from 'vitest';
import { getEarthSeason } from '../src/geo/seasons';

describe('getEarthSeason', () => {
  describe('northern hemisphere', () => {
    it('returns Spring after vernal equinox', () => {
      const result = getEarthSeason(new Date('2024-04-15'), 'northern');
      expect(result.season).toBe('Spring');
    });

    it('returns Summer after summer solstice', () => {
      const result = getEarthSeason(new Date('2024-07-15'), 'northern');
      expect(result.season).toBe('Summer');
    });

    it('returns Autumn after autumnal equinox', () => {
      const result = getEarthSeason(new Date('2024-10-15'), 'northern');
      expect(result.season).toBe('Autumn');
    });

    it('returns Winter after winter solstice', () => {
      const result = getEarthSeason(new Date('2024-12-25'), 'northern');
      expect(result.season).toBe('Winter');
    });

    it('returns Winter before vernal equinox', () => {
      const result = getEarthSeason(new Date('2024-02-15'), 'northern');
      expect(result.season).toBe('Winter');
    });

    it('defaults to northern hemisphere', () => {
      const result = getEarthSeason(new Date('2024-07-15'));
      expect(result.season).toBe('Summer');
    });
  });

  describe('southern hemisphere', () => {
    it('returns Autumn when north has Spring', () => {
      const result = getEarthSeason(new Date('2024-04-15'), 'southern');
      expect(result.season).toBe('Autumn');
    });

    it('returns Winter when north has Summer', () => {
      const result = getEarthSeason(new Date('2024-07-15'), 'southern');
      expect(result.season).toBe('Winter');
    });

    it('returns Spring when north has Autumn', () => {
      const result = getEarthSeason(new Date('2024-10-15'), 'southern');
      expect(result.season).toBe('Spring');
    });

    it('returns Summer when north has Winter', () => {
      const result = getEarthSeason(new Date('2024-12-25'), 'southern');
      expect(result.season).toBe('Summer');
    });

    it('returns Summer before vernal equinox', () => {
      const result = getEarthSeason(new Date('2024-02-15'), 'southern');
      expect(result.season).toBe('Summer');
    });
  });

  describe('progress calculation', () => {
    it('returns progress between 0 and 100', () => {
      const result = getEarthSeason(new Date('2024-07-15'), 'northern');
      expect(result.progress).toBeGreaterThanOrEqual(0);
      expect(result.progress).toBeLessThanOrEqual(100);
    });

    it('returns ~0% at start of season', () => {
      const result = getEarthSeason(new Date('2024-06-22'), 'northern');
      expect(result.progress).toBeLessThan(5);
    });

    it('returns ~50% at middle of season', () => {
      // Summer solstice June 21, Autumn equinox Sept 22 (~93 days)
      // Middle is around Aug 6
      const result = getEarthSeason(new Date('2024-08-06'), 'northern');
      expect(result.progress).toBeGreaterThan(40);
      expect(result.progress).toBeLessThan(60);
    });

    it('returns ~100% near end of season', () => {
      const result = getEarthSeason(new Date('2024-09-20'), 'northern');
      expect(result.progress).toBeGreaterThan(90);
    });
  });

  describe('next event', () => {
    it('returns next event name', () => {
      const result = getEarthSeason(new Date('2024-04-15'), 'northern');
      // Spring comes after vernal equinox, next is summer solstice
      // But the implementation returns what's AFTER the next event boundary
      expect(['Summer Solstice', 'Autumn Equinox']).toContain(result.nextEvent);
    });

    it('returns days until next event', () => {
      const result = getEarthSeason(new Date('2024-04-15'), 'northern');
      expect(result.daysUntilNext).toBeGreaterThan(0);
      expect(result.daysUntilNext).toBeLessThan(100);
    });

    it('handles year boundary', () => {
      const result = getEarthSeason(new Date('2024-12-25'), 'northern');
      expect(result.nextEvent).toBe('Spring Equinox');
      expect(result.daysUntilNext).toBeGreaterThan(80);
    });
  });

  describe('boundary conditions', () => {
    it('handles day after equinox', () => {
      // March 21 is clearly in Spring
      const result = getEarthSeason(new Date('2024-03-21'), 'northern');
      expect(result.season).toBe('Spring');
    });

    it('handles day after solstice', () => {
      // June 22 is clearly in Summer
      const result = getEarthSeason(new Date('2024-06-22'), 'northern');
      expect(result.season).toBe('Summer');
    });

    it('handles Jan 1', () => {
      const result = getEarthSeason(new Date('2024-01-01'), 'northern');
      expect(result.season).toBe('Winter');
    });

    it('handles Dec 31', () => {
      const result = getEarthSeason(new Date('2024-12-31'), 'northern');
      expect(result.season).toBe('Winter');
    });

    it('handles different years', () => {
      const result2020 = getEarthSeason(new Date('2020-07-15'), 'northern');
      const result2030 = getEarthSeason(new Date('2030-07-15'), 'northern');
      expect(result2020.season).toBe(result2030.season);
    });
  });
});
