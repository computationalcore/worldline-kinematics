/**
 * Golden value tests for WGS84 ellipsoid geometry.
 */

import { describe, it, expect } from 'vitest';
import {
  degreesToRadians,
  radiansToDegrees,
  primeVerticalRadius,
  parallelRadius,
  parallelRadiusFromDegrees,
  latitudeCircumference,
} from '../src/geo/wgs84';
import { WGS84_SEMI_MAJOR_AXIS_M, WGS84_SEMI_MINOR_AXIS_M } from '../src/constants';

describe('WGS84 ellipsoid', () => {
  describe('angle conversions', () => {
    it('converts degrees to radians correctly', () => {
      expect(degreesToRadians(0)).toBe(0);
      expect(degreesToRadians(90)).toBeCloseTo(Math.PI / 2, 10);
      expect(degreesToRadians(180)).toBeCloseTo(Math.PI, 10);
      expect(degreesToRadians(360)).toBeCloseTo(2 * Math.PI, 10);
      expect(degreesToRadians(-45)).toBeCloseTo(-Math.PI / 4, 10);
    });

    it('converts radians to degrees correctly', () => {
      expect(radiansToDegrees(0)).toBe(0);
      expect(radiansToDegrees(Math.PI / 2)).toBeCloseTo(90, 10);
      expect(radiansToDegrees(Math.PI)).toBeCloseTo(180, 10);
      expect(radiansToDegrees(2 * Math.PI)).toBeCloseTo(360, 10);
    });

    it('round-trips correctly', () => {
      const angles = [0, 30, 45, 60, 90, -45, 123.456];
      for (const deg of angles) {
        expect(radiansToDegrees(degreesToRadians(deg))).toBeCloseTo(deg, 10);
      }
    });
  });

  describe('primeVerticalRadius', () => {
    it('equals semi-major axis at equator', () => {
      // At equator (lat=0), sin(0)=0, so N(0) = a
      const N = primeVerticalRadius(0);
      expect(N).toBeCloseTo(WGS84_SEMI_MAJOR_AXIS_M, 1);
    });

    it('is larger at poles due to flattening', () => {
      // At poles, N(90°) = a / √(1 - e²) > a
      const N_equator = primeVerticalRadius(0);
      const N_pole = primeVerticalRadius(Math.PI / 2);
      expect(N_pole).toBeGreaterThan(N_equator);
    });

    it('is symmetric about equator', () => {
      const lat = Math.PI / 4; // 45°
      expect(primeVerticalRadius(lat)).toBeCloseTo(primeVerticalRadius(-lat), 1);
    });
  });

  describe('parallelRadius', () => {
    it('equals semi-major axis at equator', () => {
      // r(0) = N(0) × cos(0) = a × 1 = a
      const r = parallelRadius(0);
      expect(r).toBeCloseTo(WGS84_SEMI_MAJOR_AXIS_M, 1);
    });

    it('equals 0 at poles', () => {
      // r(90°) = N(90°) × cos(90°) = N × 0 = 0
      expect(parallelRadius(Math.PI / 2)).toBeCloseTo(0, 6);
      expect(parallelRadius(-Math.PI / 2)).toBeCloseTo(0, 6);
    });

    it('decreases from equator to poles', () => {
      const r0 = parallelRadius(0);
      const r30 = parallelRadius(degreesToRadians(30));
      const r60 = parallelRadius(degreesToRadians(60));
      const r90 = parallelRadius(Math.PI / 2);

      expect(r0).toBeGreaterThan(r30);
      expect(r30).toBeGreaterThan(r60);
      expect(r60).toBeGreaterThan(r90);
    });

    it('is approximately r × cos(lat) for spherical Earth', () => {
      // Due to ellipsoidal effects, actual ratio differs slightly from cos(lat)
      const r0 = parallelRadius(0);
      const r45 = parallelRadius(degreesToRadians(45));
      const ratio = r45 / r0;
      // Expected: cos(45°) ≈ 0.7071, actual slightly different
      expect(ratio).toBeCloseTo(Math.cos(degreesToRadians(45)), 2);
    });
  });

  describe('parallelRadiusFromDegrees', () => {
    it('matches parallelRadius with conversion', () => {
      const latitudes = [0, 15, 30, 45, 60, 75, 89];
      for (const lat of latitudes) {
        const fromDegrees = parallelRadiusFromDegrees(lat);
        const fromRadians = parallelRadius(degreesToRadians(lat));
        expect(fromDegrees).toBeCloseTo(fromRadians, 1);
      }
    });

    it('throws for invalid latitudes', () => {
      expect(() => parallelRadiusFromDegrees(91)).toThrow(/Invalid latitude/);
      expect(() => parallelRadiusFromDegrees(-91)).toThrow(/Invalid latitude/);
      expect(() => parallelRadiusFromDegrees(180)).toThrow(/Invalid latitude/);
    });

    it('accepts boundary values', () => {
      expect(() => parallelRadiusFromDegrees(90)).not.toThrow();
      expect(() => parallelRadiusFromDegrees(-90)).not.toThrow();
    });
  });

  describe('latitudeCircumference', () => {
    it('equals Earth equatorial circumference at lat=0', () => {
      // C = 2π × a ≈ 40,075 km
      const circumference = latitudeCircumference(0);
      const expected = 2 * Math.PI * WGS84_SEMI_MAJOR_AXIS_M;
      expect(circumference).toBeCloseTo(expected, 0);
      expect(circumference / 1000).toBeCloseTo(40075, -1); // km, within 10 km
    });

    it('equals 0 at poles', () => {
      expect(latitudeCircumference(90)).toBeCloseTo(0, 3);
      expect(latitudeCircumference(-90)).toBeCloseTo(0, 3);
    });

    it('is approximately 2π × r(lat)', () => {
      const lat = 45;
      const circumference = latitudeCircumference(lat);
      const expected = 2 * Math.PI * parallelRadiusFromDegrees(lat);
      expect(circumference).toBeCloseTo(expected, 1);
    });
  });

  describe('WGS84 constants consistency', () => {
    it('semi-minor axis is less than semi-major axis', () => {
      expect(WGS84_SEMI_MINOR_AXIS_M).toBeLessThan(WGS84_SEMI_MAJOR_AXIS_M);
    });

    it('flattening is approximately 1/298.257', () => {
      const flatteningRatio =
        (WGS84_SEMI_MAJOR_AXIS_M - WGS84_SEMI_MINOR_AXIS_M) / WGS84_SEMI_MAJOR_AXIS_M;
      expect(flatteningRatio).toBeCloseTo(1 / 298.257, 5);
    });
  });
});
