/**
 * Tests for body orientation computation.
 */

import { describe, it, expect } from 'vitest';
import { AstronomyEngineProvider } from '../src/ephemeris/provider';
import type { BodyId } from '../src/types';

describe('getBodyOrientation', () => {
  const provider = new AstronomyEngineProvider();

  describe('interface contract', () => {
    it('returns all required fields for each body', () => {
      const bodies: BodyId[] = [
        'Sun',
        'Mercury',
        'Venus',
        'Earth',
        'Moon',
        'Mars',
        'Jupiter',
        'Saturn',
        'Uranus',
        'Neptune',
      ];
      const epoch = new Date('2024-01-01T12:00:00Z');

      for (const bodyId of bodies) {
        const orientation = provider.getBodyOrientation(bodyId, epoch);

        // Check structure
        expect(orientation).toHaveProperty('northPole');
        expect(orientation).toHaveProperty('rotationAngleDeg');
        expect(orientation).toHaveProperty('siderealPeriodHours');

        // Check types
        expect(typeof orientation.northPole.x).toBe('number');
        expect(typeof orientation.northPole.y).toBe('number');
        expect(typeof orientation.northPole.z).toBe('number');
        expect(typeof orientation.rotationAngleDeg).toBe('number');
        expect(typeof orientation.siderealPeriodHours).toBe('number');
      }
    });

    it('north pole is a unit vector', () => {
      const bodies: BodyId[] = ['Earth', 'Mars', 'Jupiter', 'Saturn'];
      const epoch = new Date('2024-06-15T00:00:00Z');

      for (const bodyId of bodies) {
        const orientation = provider.getBodyOrientation(bodyId, epoch);
        const { x, y, z } = orientation.northPole;
        const magnitude = Math.sqrt(x * x + y * y + z * z);

        expect(magnitude).toBeCloseTo(1.0, 6);
      }
    });
  });

  describe('determinism', () => {
    it('same epoch produces same orientation', () => {
      const epoch = new Date('2024-03-20T12:00:00Z');
      const bodyId: BodyId = 'Earth';

      const orientation1 = provider.getBodyOrientation(bodyId, epoch);
      const orientation2 = provider.getBodyOrientation(bodyId, epoch);

      expect(orientation1.northPole.x).toBe(orientation2.northPole.x);
      expect(orientation1.northPole.y).toBe(orientation2.northPole.y);
      expect(orientation1.northPole.z).toBe(orientation2.northPole.z);
      expect(orientation1.rotationAngleDeg).toBe(orientation2.rotationAngleDeg);
      expect(orientation1.siderealPeriodHours).toBe(orientation2.siderealPeriodHours);
    });

    it('different epochs produce different rotation angles', () => {
      const epoch1 = new Date('2024-01-01T00:00:00Z');
      const epoch2 = new Date('2024-01-02T00:00:00Z'); // 1 day later

      const orientation1 = provider.getBodyOrientation('Earth', epoch1);
      const orientation2 = provider.getBodyOrientation('Earth', epoch2);

      // Earth rotates ~360 degrees per day, so angles should differ
      expect(orientation1.rotationAngleDeg).not.toBe(orientation2.rotationAngleDeg);
    });
  });

  describe('physical correctness', () => {
    it('Earth sidereal period is ~23.93 hours', () => {
      const epoch = new Date('2024-01-01T12:00:00Z');
      const orientation = provider.getBodyOrientation('Earth', epoch);

      // Earth's sidereal day is ~23h 56m 4s = ~23.934 hours
      expect(orientation.siderealPeriodHours).toBeCloseTo(23.934, 1);
    });

    it('Venus has retrograde rotation (negative period)', () => {
      const epoch = new Date('2024-01-01T12:00:00Z');
      const orientation = provider.getBodyOrientation('Venus', epoch);

      // Venus rotates retrograde, so period should be negative
      expect(orientation.siderealPeriodHours).toBeLessThan(0);
      // Venus period is ~-5832.5 hours (~243 days)
      expect(Math.abs(orientation.siderealPeriodHours)).toBeGreaterThan(5000);
    });

    it('Uranus has retrograde rotation (negative period)', () => {
      const epoch = new Date('2024-01-01T12:00:00Z');
      const orientation = provider.getBodyOrientation('Uranus', epoch);

      // Uranus rotates retrograde
      expect(orientation.siderealPeriodHours).toBeLessThan(0);
      // Uranus period is ~-17.24 hours
      expect(Math.abs(orientation.siderealPeriodHours)).toBeCloseTo(17.24, 1);
    });

    it('rotation angle is in [0, 360) range', () => {
      const bodies: BodyId[] = ['Earth', 'Mars', 'Jupiter'];
      const epochs = [
        new Date('2024-01-01T00:00:00Z'),
        new Date('2024-06-15T12:00:00Z'),
        new Date('2025-12-31T23:59:59Z'),
      ];

      for (const bodyId of bodies) {
        for (const epoch of epochs) {
          const orientation = provider.getBodyOrientation(bodyId, epoch);
          expect(orientation.rotationAngleDeg).toBeGreaterThanOrEqual(0);
          expect(orientation.rotationAngleDeg).toBeLessThan(360);
        }
      }
    });

    it('Earth north pole points approximately toward ecliptic north', () => {
      // Earth's axis is tilted ~23.44 degrees from ecliptic normal
      // In scene coordinates (y-up), the north pole should be mostly +y
      // with a tilt toward +z (in the scene frame)
      const epoch = new Date('2024-01-01T12:00:00Z');
      const orientation = provider.getBodyOrientation('Earth', epoch);

      // The y-component should be dominant (close to cos(23.44) ≈ 0.917)
      expect(orientation.northPole.y).toBeGreaterThan(0.8);

      // The magnitude should be 1 (already tested, but verify here too)
      const mag = Math.sqrt(
        orientation.northPole.x ** 2 +
          orientation.northPole.y ** 2 +
          orientation.northPole.z ** 2
      );
      expect(mag).toBeCloseTo(1.0, 6);
    });
  });

  describe('J2000 epoch consistency', () => {
    it('rotation angle is consistent with IAU model W = W0 + Wdot * d', () => {
      // For Earth, we can verify the rotation rate is consistent
      const epoch1 = new Date('2000-01-01T12:00:00Z'); // J2000.0
      const epoch2 = new Date('2000-01-02T12:00:00Z'); // J2000.0 + 1 day

      const orientation1 = provider.getBodyOrientation('Earth', epoch1);
      const orientation2 = provider.getBodyOrientation('Earth', epoch2);

      // Earth should rotate ~360 degrees per sidereal day
      // In 1 solar day, it rotates slightly more than 360 degrees
      const angleDiff =
        (orientation2.rotationAngleDeg - orientation1.rotationAngleDeg + 360) % 360;

      // Expected: ~360.986 degrees per solar day (360 * 24 / 23.934)
      // But we're measuring mod 360, so we expect ~0.986 degrees
      // Actually, Earth rotates ~361 degrees per solar day relative to stars
      // The difference should be close to either ~0.98 or ~360-0.98
      expect(angleDiff).toBeLessThan(5); // Should be near 0 (mod 360)
    });
  });
});
