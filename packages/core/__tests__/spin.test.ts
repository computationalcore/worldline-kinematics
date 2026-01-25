/**
 * Golden value tests for Earth rotation (spin) model.
 *
 * These tests verify that computed spin velocities match expected values
 * derived from WGS84 ellipsoid parameters and sidereal day duration.
 */

import { describe, it, expect } from 'vitest';
import {
  spinVelocityKms,
  spinVelocityMs,
  spinDistanceKm,
  computeSpinVelocity,
  EARTH_ANGULAR_VELOCITY_RAD_S,
} from '../src/models/spin';
import { SIDEREAL_DAY_SECONDS, WGS84_SEMI_MAJOR_AXIS_M } from '../src/constants';

describe('spin model', () => {
  describe('angular velocity', () => {
    it('computes correct angular velocity from sidereal day', () => {
      // Expected: 2π / 86164.0905 ≈ 7.2921150e-5 rad/s
      const expected = (2 * Math.PI) / SIDEREAL_DAY_SECONDS;
      expect(EARTH_ANGULAR_VELOCITY_RAD_S).toBeCloseTo(expected, 10);
      expect(EARTH_ANGULAR_VELOCITY_RAD_S).toBeCloseTo(7.292115e-5, 9);
    });
  });

  describe('spinVelocityKms', () => {
    it('returns ~0.4651 km/s at equator (golden value)', () => {
      // At equator (lat=0), parallel radius = WGS84 semi-major axis
      // v = ω × a = 7.2921150e-5 × 6378137 ≈ 465.1 m/s ≈ 0.4651 km/s
      const velocity = spinVelocityKms(0);
      expect(velocity).toBeCloseTo(0.4651, 3);
    });

    it('returns 0 at north pole', () => {
      // At poles, cos(90°) = 0, so parallel radius = 0
      const velocity = spinVelocityKms(90);
      expect(velocity).toBeCloseTo(0, 6);
    });

    it('returns 0 at south pole', () => {
      const velocity = spinVelocityKms(-90);
      expect(velocity).toBeCloseTo(0, 6);
    });

    it('returns same velocity for north and south at same absolute latitude', () => {
      // Spin velocity depends on |cos(lat)|, symmetric about equator
      const north45 = spinVelocityKms(45);
      const south45 = spinVelocityKms(-45);
      expect(north45).toBeCloseTo(south45, 10);
    });

    it('decreases with increasing latitude', () => {
      // v(lat) ∝ cos(lat) approximately
      const v0 = spinVelocityKms(0);
      const v30 = spinVelocityKms(30);
      const v60 = spinVelocityKms(60);
      const v90 = spinVelocityKms(90);

      expect(v0).toBeGreaterThan(v30);
      expect(v30).toBeGreaterThan(v60);
      expect(v60).toBeGreaterThan(v90);
    });

    it('is approximately proportional to cos(lat)', () => {
      // Due to ellipsoid effects, it's not exactly proportional
      // but should be close (within ~0.5%)
      const v0 = spinVelocityKms(0);
      const v60 = spinVelocityKms(60);

      // Expected ratio: cos(60°) = 0.5
      const actualRatio = v60 / v0;
      expect(actualRatio).toBeCloseTo(0.5, 2);
    });
  });

  describe('spinVelocityMs', () => {
    it('returns ~465 m/s at equator', () => {
      const velocity = spinVelocityMs(0);
      expect(velocity).toBeCloseTo(465.1, 0);
    });

    it('is 1000x spinVelocityKms', () => {
      const latitudes = [0, 30, 45, 60, 89];
      for (const lat of latitudes) {
        expect(spinVelocityMs(lat)).toBeCloseTo(spinVelocityKms(lat) * 1000, 6);
      }
    });
  });

  describe('spinDistanceKm', () => {
    it('computes correct distance for one sidereal day at equator', () => {
      // In one sidereal day, a point at equator travels the equatorial circumference
      // C = 2π × a = 2π × 6378.137 km ≈ 40075 km
      const distanceOneDay = spinDistanceKm(0, SIDEREAL_DAY_SECONDS);
      const expectedCircumference = 2 * Math.PI * (WGS84_SEMI_MAJOR_AXIS_M / 1000);
      expect(distanceOneDay).toBeCloseTo(expectedCircumference, 0);
      expect(distanceOneDay).toBeCloseTo(40075, -1); // Within 10 km
    });

    it('returns 0 at poles regardless of duration', () => {
      const oneYear = 365.25 * 24 * 60 * 60;
      expect(spinDistanceKm(90, oneYear)).toBeCloseTo(0, 6);
      expect(spinDistanceKm(-90, oneYear)).toBeCloseTo(0, 6);
    });

    it('scales linearly with time', () => {
      const v = spinVelocityKms(45);
      const d1 = spinDistanceKm(45, 1000);
      const d2 = spinDistanceKm(45, 2000);
      expect(d2).toBeCloseTo(d1 * 2, 6);
      expect(d1).toBeCloseTo(v * 1000, 6);
    });
  });

  describe('computeSpinVelocity', () => {
    it('returns consistent results with individual functions', () => {
      const result = computeSpinVelocity(45);
      expect(result.velocityKms).toBeCloseTo(spinVelocityKms(45), 10);
      expect(result.velocityMs).toBeCloseTo(spinVelocityMs(45), 10);
      expect(result.latitudeDeg).toBe(45);
    });

    it('includes parallel radius in km', () => {
      const result = computeSpinVelocity(0);
      // At equator, parallel radius = semi-major axis
      expect(result.parallelRadiusKm).toBeCloseTo(WGS84_SEMI_MAJOR_AXIS_M / 1000, 1);
    });
  });

  describe('edge cases', () => {
    it('handles near-pole latitudes without division by zero', () => {
      // Very close to poles but not exactly 90
      expect(() => spinVelocityKms(89.999)).not.toThrow();
      expect(() => spinVelocityKms(-89.999)).not.toThrow();

      const v = spinVelocityKms(89.999);
      expect(v).toBeGreaterThan(0);
      expect(v).toBeLessThan(0.001);
    });
  });
});
