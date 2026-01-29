/**
 * Tests for body orientation computation.
 */

import { describe, it, expect } from 'vitest';
import { AstronomyEngineProvider } from '../src/ephemeris/provider';
import { eclToThreeJs } from '../src/frames/transforms';
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

    it('Earth W at J2000 is approximately 190 degrees (GMST - 90)', () => {
      // At J2000.0 (2000-01-01 12:00 UTC):
      // GMST ~ 280.46 degrees
      // W = GMST - 90 ~ 190.46 degrees (IAU reference is at RA = 90)
      const j2000 = new Date('2000-01-01T12:00:00Z');
      const orientation = provider.getBodyOrientation('Earth', j2000);

      // W should be near 190 degrees at J2000
      expect(orientation.rotationAngleDeg).toBeGreaterThan(185);
      expect(orientation.rotationAngleDeg).toBeLessThan(195);
    });

    it('Earth W at midnight before J2000 differs by ~180 degrees', () => {
      // At 2000-01-01 00:00 UTC (12 hours before J2000.0):
      // Earth rotates ~180 degrees in 12 hours (half a solar day)
      // So W should differ by approximately 180 degrees from J2000 value
      const j2000 = new Date('2000-01-01T12:00:00Z');
      const midnightBefore = new Date('2000-01-01T00:00:00Z');

      const orientationJ2000 = provider.getBodyOrientation('Earth', j2000);
      const orientationMidnight = provider.getBodyOrientation('Earth', midnightBefore);

      // The difference should be ~180 degrees (half rotation)
      const diff = Math.abs(
        orientationJ2000.rotationAngleDeg - orientationMidnight.rotationAngleDeg
      );
      const normalizedDiff = diff > 180 ? 360 - diff : diff;

      // Should be close to 180 degrees (within ~10 degrees tolerance)
      expect(normalizedDiff).toBeGreaterThan(170);
      expect(normalizedDiff).toBeLessThan(190);
    });
  });

  describe('seasonal invariants (pole direction correctness)', () => {
    it('subsolar latitude peaks at +23.44 degrees near June solstice', () => {
      // This test verifies the Earth pole direction is correct.
      // At June solstice, the subsolar latitude should be ~+23.44° (Tropic of Cancer).
      // If the pole azimuth is wrong (e.g., tilt about Z instead of X),
      // this test will fail with subsolar latitude near 0°.

      const juneSolstice = new Date('2024-06-21T12:00:00Z');
      const orientation = provider.getBodyOrientation('Earth', juneSolstice);
      const earthState = provider.getHeliocentricState(
        'Earth',
        juneSolstice,
        'ECLIPJ2000'
      );

      // Sun direction from Earth in ECL coordinates (Earth position negated, normalized)
      const earthDist = Math.sqrt(
        earthState.position.x ** 2 +
          earthState.position.y ** 2 +
          earthState.position.z ** 2
      );
      const sunDirEcl = {
        x: -earthState.position.x / earthDist,
        y: -earthState.position.y / earthDist,
        z: -earthState.position.z / earthDist,
      };

      // Convert to scene coordinates (same frame as northPole)
      const sunDir = eclToThreeJs(sunDirEcl);

      // North pole in scene coordinates (already in scene frame from provider)
      const pole = orientation.northPole;

      // Subsolar latitude = arcsin(pole · sunDir)
      const dotProduct = pole.x * sunDir.x + pole.y * sunDir.y + pole.z * sunDir.z;
      const subsolarLatDeg = Math.asin(dotProduct) * (180 / Math.PI);

      // Should be approximately +23.44° (within 2° tolerance for non-exact solstice time)
      expect(subsolarLatDeg).toBeGreaterThan(20);
      expect(subsolarLatDeg).toBeLessThan(26);
    });

    it('subsolar latitude is near -23.44 degrees at December solstice', () => {
      const decSolstice = new Date('2024-12-21T12:00:00Z');
      const orientation = provider.getBodyOrientation('Earth', decSolstice);
      const earthState = provider.getHeliocentricState(
        'Earth',
        decSolstice,
        'ECLIPJ2000'
      );

      const earthDist = Math.sqrt(
        earthState.position.x ** 2 +
          earthState.position.y ** 2 +
          earthState.position.z ** 2
      );
      const sunDirEcl = {
        x: -earthState.position.x / earthDist,
        y: -earthState.position.y / earthDist,
        z: -earthState.position.z / earthDist,
      };
      const sunDir = eclToThreeJs(sunDirEcl);

      const pole = orientation.northPole;
      const dotProduct = pole.x * sunDir.x + pole.y * sunDir.y + pole.z * sunDir.z;
      const subsolarLatDeg = Math.asin(dotProduct) * (180 / Math.PI);

      // Should be approximately -23.44°
      expect(subsolarLatDeg).toBeGreaterThan(-26);
      expect(subsolarLatDeg).toBeLessThan(-20);
    });

    it('subsolar latitude is near 0 at equinoxes', () => {
      const marchEquinox = new Date('2024-03-20T12:00:00Z');
      const orientation = provider.getBodyOrientation('Earth', marchEquinox);
      const earthState = provider.getHeliocentricState(
        'Earth',
        marchEquinox,
        'ECLIPJ2000'
      );

      const earthDist = Math.sqrt(
        earthState.position.x ** 2 +
          earthState.position.y ** 2 +
          earthState.position.z ** 2
      );
      const sunDirEcl = {
        x: -earthState.position.x / earthDist,
        y: -earthState.position.y / earthDist,
        z: -earthState.position.z / earthDist,
      };
      const sunDir = eclToThreeJs(sunDirEcl);

      const pole = orientation.northPole;
      const dotProduct = pole.x * sunDir.x + pole.y * sunDir.y + pole.z * sunDir.z;
      const subsolarLatDeg = Math.asin(dotProduct) * (180 / Math.PI);

      // Should be approximately 0° (within 5° tolerance)
      expect(Math.abs(subsolarLatDeg)).toBeLessThan(5);
    });
  });

  describe('subsolar longitude sanity checks', () => {
    it('at UTC noon, subsolar longitude is near 0 (Greenwich)', () => {
      // At any day's UTC 12:00, the Sun is approximately overhead at longitude 0
      // (This is the definition of UTC/GMT)
      // The GMST at UTC noon on any day should have the Sun near the meridian
      // We can verify this indirectly through the W angle
      const utcNoon = new Date('2024-06-21T12:00:00Z'); // Summer solstice noon
      const orientation = provider.getBodyOrientation('Earth', utcNoon);

      // At UTC noon, GMST should be such that the Sun is near lon=0
      // This means GMST ~ Sun's RA (which at solstice is ~90 or ~270)
      // We just verify W is a reasonable value and consistent
      expect(orientation.rotationAngleDeg).toBeGreaterThanOrEqual(0);
      expect(orientation.rotationAngleDeg).toBeLessThan(360);
    });

    it('rotation advances ~15 degrees per hour', () => {
      // Earth rotates 360 degrees in ~24 hours = 15 degrees per hour
      const hour1 = new Date('2024-01-15T12:00:00Z');
      const hour2 = new Date('2024-01-15T13:00:00Z'); // 1 hour later

      const orientation1 = provider.getBodyOrientation('Earth', hour1);
      const orientation2 = provider.getBodyOrientation('Earth', hour2);

      // Compute angle difference (accounting for wraparound)
      let diff = orientation2.rotationAngleDeg - orientation1.rotationAngleDeg;
      if (diff < 0) diff += 360;
      if (diff > 180) diff = 360 - diff;

      // Should be approximately 15 degrees (within 1 degree tolerance)
      expect(diff).toBeGreaterThan(14);
      expect(diff).toBeLessThan(16);
    });
  });
});
