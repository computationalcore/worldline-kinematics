/**
 * End-to-end tests for computeWorldlineState.
 */

import { describe, it, expect } from 'vitest';
import { computeWorldlineState } from '../src/index';

describe('computeWorldlineState', () => {
  describe('basic functionality', () => {
    it('returns complete state for valid inputs', () => {
      const state = computeWorldlineState('1990-01-01', 45, '2020-01-01');

      expect(state).toHaveProperty('timestamp');
      expect(state).toHaveProperty('birthDate');
      expect(state).toHaveProperty('latitudeDeg');
      expect(state).toHaveProperty('durationSeconds');
      expect(state).toHaveProperty('frames');
      expect(state).toHaveProperty('distances');
    });

    it('handles Date objects', () => {
      const birth = new Date('1990-01-01T12:00:00Z');
      const target = new Date('2020-01-01T12:00:00Z');
      const state = computeWorldlineState(birth, 45, target);

      expect(state.birthDate.getTime()).toBe(birth.getTime());
    });

    it('defaults target date to now', () => {
      const before = Date.now();
      const state = computeWorldlineState('1990-01-01', 0);
      const after = Date.now();

      expect(state.timestamp.getTime()).toBeGreaterThanOrEqual(before);
      expect(state.timestamp.getTime()).toBeLessThanOrEqual(after);
    });
  });

  describe('frame velocities', () => {
    const state = computeWorldlineState('1990-01-01', 45, '2020-01-01');

    it('spin velocity varies with latitude', () => {
      const equator = computeWorldlineState('1990-01-01', 0, '2020-01-01');
      const pole = computeWorldlineState('1990-01-01', 90, '2020-01-01');

      expect(equator.frames.spin.velocityKms).toBeGreaterThan(
        pole.frames.spin.velocityKms
      );
      expect(pole.frames.spin.velocityKms).toBeCloseTo(0, 3);
    });

    it('all frame velocities are positive', () => {
      expect(state.frames.spin.velocityKms).toBeGreaterThanOrEqual(0);
      expect(state.frames.orbit.velocityKms).toBeGreaterThan(0);
      expect(state.frames.galaxy.velocityKms).toBeGreaterThan(0);
      expect(state.frames.cmb.velocityKms).toBeGreaterThan(0);
    });

    it('velocities are in expected ranges', () => {
      // Spin: 0-0.465 km/s
      expect(state.frames.spin.velocityKms).toBeLessThan(0.5);

      // Orbit: ~29.78 km/s
      expect(state.frames.orbit.velocityKms).toBeGreaterThan(29);
      expect(state.frames.orbit.velocityKms).toBeLessThan(31);

      // Galaxy: ~220 km/s
      expect(state.frames.galaxy.velocityKms).toBeGreaterThan(200);
      expect(state.frames.galaxy.velocityKms).toBeLessThan(250);

      // CMB: ~370 km/s
      expect(state.frames.cmb.velocityKms).toBeGreaterThan(350);
      expect(state.frames.cmb.velocityKms).toBeLessThan(400);
    });

    it('includes correct frame identifiers', () => {
      expect(state.frames.spin.frame).toBe('spin');
      expect(state.frames.orbit.frame).toBe('orbit');
      expect(state.frames.galaxy.frame).toBe('galaxy');
      expect(state.frames.cmb.frame).toBe('cmb');
    });

    it('galaxy and cmb frames have uncertainty', () => {
      expect(state.frames.galaxy.uncertaintyKms).toBeDefined();
      expect(state.frames.cmb.uncertaintyKms).toBeDefined();
      expect(state.frames.galaxy.hasSignificantUncertainty).toBeDefined();
      expect(state.frames.cmb.hasSignificantUncertainty).toBeDefined();
    });
  });

  describe('frame distances', () => {
    const state = computeWorldlineState('1990-01-01', 0, '2020-01-01');

    it('all distances are positive for positive duration', () => {
      expect(state.distances.spin.pathLengthKm).toBeGreaterThan(0);
      expect(state.distances.orbit.pathLengthKm).toBeGreaterThan(0);
      expect(state.distances.galaxy.pathLengthKm).toBeGreaterThan(0);
      expect(state.distances.cmb.pathLengthKm).toBeGreaterThan(0);
    });

    it('distances scale with duration', () => {
      const state10 = computeWorldlineState('2010-01-01', 0, '2020-01-01');
      const state20 = computeWorldlineState('2000-01-01', 0, '2020-01-01');

      // 20 years vs 10 years should have ~2x distance
      const ratio =
        state20.distances.orbit.pathLengthKm / state10.distances.orbit.pathLengthKm;
      expect(ratio).toBeGreaterThan(1.9);
      expect(ratio).toBeLessThan(2.1);
    });

    it('orbit distance is approximately v * t', () => {
      const years = 30;
      const secondsPerYear = 365.25 * 24 * 60 * 60;
      const durationSeconds = years * secondsPerYear;
      const expectedKm = 29.78 * durationSeconds;

      // Use looser tolerance (-7) for large distances to account for velocity precision
      expect(state.distances.orbit.pathLengthKm).toBeCloseTo(expectedKm, -7);
    });

    it('includes duration in distance objects', () => {
      expect(state.distances.spin.durationSeconds).toBe(state.durationSeconds);
      expect(state.distances.orbit.durationSeconds).toBe(state.durationSeconds);
      expect(state.distances.galaxy.durationSeconds).toBe(state.durationSeconds);
      expect(state.distances.cmb.durationSeconds).toBe(state.durationSeconds);
    });

    it('includes deprecated distanceKm alias', () => {
      expect(state.distances.orbit.distanceKm).toBe(state.distances.orbit.pathLengthKm);
    });
  });

  describe('metadata', () => {
    const state = computeWorldlineState('1990-01-01', 45, '2020-01-01');

    it('spin metadata includes latitude and radius', () => {
      expect(state.frames.spin.metadata.latitudeDeg).toBe(45);
      expect(state.frames.spin.metadata.parallelRadiusKm).toBeGreaterThan(0);
    });

    it('orbit metadata includes velocity range', () => {
      expect(state.frames.orbit.metadata.aphelionVelocityKms).toBeDefined();
      expect(state.frames.orbit.metadata.perihelionVelocityKms).toBeDefined();
      expect(state.frames.orbit.metadata.eccentricity).toBeDefined();
    });

    it('galaxy metadata includes distance and period', () => {
      expect(state.frames.galaxy.metadata.distanceToGalacticCenterLy).toBeGreaterThan(0);
      expect(state.frames.galaxy.metadata.orbitalPeriodYears).toBeGreaterThan(0);
    });

    it('cmb metadata includes direction', () => {
      expect(state.frames.cmb.metadata.reference).toBe('ssb');
      expect(state.frames.cmb.metadata.directionGalacticLongitude).toBeDefined();
      expect(state.frames.cmb.metadata.directionGalacticLatitude).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('handles equator latitude', () => {
      const state = computeWorldlineState('1990-01-01', 0, '2020-01-01');
      expect(state.frames.spin.velocityKms).toBeCloseTo(0.465, 2);
    });

    it('handles poles', () => {
      const north = computeWorldlineState('1990-01-01', 90, '2020-01-01');
      const south = computeWorldlineState('1990-01-01', -90, '2020-01-01');

      expect(north.frames.spin.velocityKms).toBeCloseTo(0, 5);
      expect(south.frames.spin.velocityKms).toBeCloseTo(0, 5);
    });

    it('handles negative latitudes', () => {
      const north = computeWorldlineState('1990-01-01', 45, '2020-01-01');
      const south = computeWorldlineState('1990-01-01', -45, '2020-01-01');

      // Spin velocity should be the same magnitude at same absolute latitude
      expect(north.frames.spin.velocityKms).toBeCloseTo(south.frames.spin.velocityKms, 5);
    });

    it('handles very short durations', () => {
      const state = computeWorldlineState(
        new Date('2020-01-01T00:00:00Z'),
        0,
        new Date('2020-01-01T00:00:01Z')
      );

      expect(state.durationSeconds).toBe(1);
      expect(state.distances.orbit.pathLengthKm).toBeCloseTo(29.78, 1);
    });

    it('handles date strings with time components', () => {
      const state = computeWorldlineState(
        '2020-01-01T06:00:00Z',
        45,
        '2020-01-01T18:00:00Z'
      );

      // 12 hours = 43200 seconds
      expect(state.durationSeconds).toBe(43200);
    });
  });

  describe('golden values', () => {
    it('matches expected values for standard 30-year calculation', () => {
      // 30 years at equator from 1990 to 2020
      const state = computeWorldlineState('1990-01-01', 0, '2020-01-01');

      // Duration: 30 years in seconds (approximate due to date parsing)
      const expectedDurationYears = state.durationSeconds / (365.25 * 24 * 60 * 60);
      expect(expectedDurationYears).toBeCloseTo(30, 0);

      // Orbit distance: 30 years * 29.78 km/s
      const expectedOrbitKm = state.durationSeconds * 29.78;
      expect(state.distances.orbit.pathLengthKm).toBeCloseTo(expectedOrbitKm, -6);

      // Galaxy distance: 30 years * 220 km/s
      const expectedGalaxyKm = state.durationSeconds * 220;
      expect(state.distances.galaxy.pathLengthKm).toBeCloseTo(expectedGalaxyKm, -6);
    });
  });
});
