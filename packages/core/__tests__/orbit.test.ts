/**
 * Tests for Earth orbital model.
 */

import { describe, it, expect } from 'vitest';
import { computeOrbitVelocity, orbitDistanceKm } from '../src/models/orbit';
import {
  EARTH_ORBITAL_VELOCITY_KMS,
  EARTH_ORBITAL_PERIOD_SECONDS,
  ASTRONOMICAL_UNIT_KM,
} from '../src/constants';

describe('orbit model', () => {
  describe('computeOrbitVelocity', () => {
    it('returns mean velocity of ~29.78 km/s', () => {
      const result = computeOrbitVelocity();
      expect(result.meanVelocityKms).toBe(EARTH_ORBITAL_VELOCITY_KMS);
      expect(result.meanVelocityKms).toBeCloseTo(29.78, 2);
    });

    it('includes min/max velocities due to eccentricity', () => {
      const result = computeOrbitVelocity();
      // Min at aphelion, max at perihelion
      expect(result.minVelocityKms).toBeLessThan(result.meanVelocityKms);
      expect(result.maxVelocityKms).toBeGreaterThan(result.meanVelocityKms);

      // Known values: ~29.29 km/s at aphelion, ~30.29 km/s at perihelion
      expect(result.minVelocityKms).toBeCloseTo(29.29, 1);
      expect(result.maxVelocityKms).toBeCloseTo(30.29, 1);
    });

    it('includes eccentricity value', () => {
      const result = computeOrbitVelocity();
      expect(result.eccentricity).toBeCloseTo(0.0167, 3);
    });
  });

  describe('orbitDistanceKm', () => {
    it('computes correct distance for one orbital period', () => {
      // In one year, Earth travels approximately 2π × 1 AU
      const distanceOneYear = orbitDistanceKm(EARTH_ORBITAL_PERIOD_SECONDS);
      const expectedCircumference = 2 * Math.PI * ASTRONOMICAL_UNIT_KM;

      // Due to using mean velocity, this is approximate
      // v × T ≈ 2πr for circular orbit
      expect(distanceOneYear).toBeCloseTo(expectedCircumference, -7); // Within 10M km
    });

    it('scales linearly with time', () => {
      const d1 = orbitDistanceKm(1000);
      const d2 = orbitDistanceKm(2000);
      expect(d2).toBeCloseTo(d1 * 2, 6);
    });

    it('equals velocity times time', () => {
      const duration = 3600; // 1 hour
      const distance = orbitDistanceKm(duration);
      const expected = EARTH_ORBITAL_VELOCITY_KMS * duration;
      expect(distance).toBeCloseTo(expected, 6);
    });
  });

  describe('physical consistency', () => {
    it('orbital velocity satisfies v = 2πr/T approximately', () => {
      // For circular orbit: v = 2π × AU / T
      const expectedV =
        (2 * Math.PI * ASTRONOMICAL_UNIT_KM) / EARTH_ORBITAL_PERIOD_SECONDS;
      // Mean velocity should be close (within 1%)
      expect(EARTH_ORBITAL_VELOCITY_KMS).toBeCloseTo(expectedV, 0);
    });
  });
});
