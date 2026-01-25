/**
 * Tests for solar galactic orbit model.
 */

import { describe, it, expect } from 'vitest';
import { computeGalaxyVelocity, galaxyDistanceKm } from '../src/models/galaxy';
import {
  SOLAR_GALACTIC_VELOCITY_KMS,
  SOLAR_GALACTIC_VELOCITY_UNCERTAINTY_KMS,
  GALACTIC_ORBITAL_PERIOD_YEARS,
} from '../src/constants';

describe('galaxy model', () => {
  describe('computeGalaxyVelocity', () => {
    it('returns velocity of ~220 km/s', () => {
      const result = computeGalaxyVelocity();
      expect(result.velocityKms).toBe(SOLAR_GALACTIC_VELOCITY_KMS);
      expect(result.velocityKms).toBeCloseTo(220, 0);
    });

    it('includes uncertainty of ~15 km/s', () => {
      const result = computeGalaxyVelocity();
      expect(result.uncertaintyKms).toBe(SOLAR_GALACTIC_VELOCITY_UNCERTAINTY_KMS);
      expect(result.uncertaintyKms).toBeCloseTo(15, 0);
    });

    it('includes galactic center distance (~26,000 ly)', () => {
      const result = computeGalaxyVelocity();
      expect(result.distanceToGalacticCenterLy).toBeCloseTo(26000, -2);
    });

    it('includes orbital period (~225 million years)', () => {
      const result = computeGalaxyVelocity();
      expect(result.orbitalPeriodYears).toBe(GALACTIC_ORBITAL_PERIOD_YEARS);
      expect(result.orbitalPeriodYears).toBeCloseTo(225_000_000, -6);
    });
  });

  describe('galaxyDistanceKm', () => {
    it('scales linearly with time', () => {
      const d1 = galaxyDistanceKm(1000);
      const d2 = galaxyDistanceKm(2000);
      expect(d2).toBeCloseTo(d1 * 2, 6);
    });

    it('equals velocity times time', () => {
      const duration = 3600; // 1 hour
      const distance = galaxyDistanceKm(duration);
      const expected = SOLAR_GALACTIC_VELOCITY_KMS * duration;
      expect(distance).toBeCloseTo(expected, 6);
    });

    it('computes correct distance for one Earth year', () => {
      // In one year: 220 km/s × (365.25 × 24 × 3600) s
      const oneYear = 365.25 * 24 * 3600;
      const distance = galaxyDistanceKm(oneYear);
      const expected = SOLAR_GALACTIC_VELOCITY_KMS * oneYear;
      expect(distance).toBeCloseTo(expected, 0);
      // Approximately 6.9 billion km per year
      expect(distance / 1e9).toBeCloseTo(6.9, 0);
    });
  });

  describe('physical reasonableness', () => {
    it('galactic velocity is higher than orbital velocity', () => {
      // Galaxy: ~220 km/s, Orbit: ~30 km/s
      expect(SOLAR_GALACTIC_VELOCITY_KMS).toBeGreaterThan(200);
      expect(SOLAR_GALACTIC_VELOCITY_KMS).toBeLessThan(250);
    });

    it('uncertainty is significant fraction of velocity', () => {
      // ~7% uncertainty reflects astrophysical measurement challenges
      const uncertaintyFraction =
        SOLAR_GALACTIC_VELOCITY_UNCERTAINTY_KMS / SOLAR_GALACTIC_VELOCITY_KMS;
      expect(uncertaintyFraction).toBeGreaterThan(0.05);
      expect(uncertaintyFraction).toBeLessThan(0.1);
    });
  });
});
