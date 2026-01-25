/**
 * Tests for CMB (Cosmic Microwave Background) reference frame model.
 */

import { describe, it, expect } from 'vitest';
import { computeCMBVelocity, cmbDistanceKm } from '../src/models/cmb';
import {
  SSB_CMB_VELOCITY_KMS,
  SSB_CMB_VELOCITY_UNCERTAINTY_KMS,
  LOCAL_GROUP_CMB_VELOCITY_KMS,
  LOCAL_GROUP_CMB_VELOCITY_UNCERTAINTY_KMS,
  SSB_CMB_GALACTIC_LONGITUDE_DEG,
  SSB_CMB_GALACTIC_LATITUDE_DEG,
} from '../src/constants';

describe('CMB model', () => {
  describe('computeCMBVelocity with SSB reference', () => {
    it('returns velocity of ~369.82 km/s', () => {
      const result = computeCMBVelocity('ssb');
      expect(result.velocityKms).toBe(SSB_CMB_VELOCITY_KMS);
      expect(result.velocityKms).toBeCloseTo(369.82, 2);
    });

    it('includes very small uncertainty (~0.11 km/s)', () => {
      const result = computeCMBVelocity('ssb');
      expect(result.uncertaintyKms).toBe(SSB_CMB_VELOCITY_UNCERTAINTY_KMS);
      expect(result.uncertaintyKms).toBeCloseTo(0.11, 2);
    });

    it('includes direction in galactic coordinates', () => {
      const result = computeCMBVelocity('ssb');
      expect(result.directionGalacticLongitude).toBeCloseTo(
        SSB_CMB_GALACTIC_LONGITUDE_DEG,
        1
      );
      expect(result.directionGalacticLatitude).toBeCloseTo(
        SSB_CMB_GALACTIC_LATITUDE_DEG,
        1
      );
    });

    it('has reference set to ssb', () => {
      const result = computeCMBVelocity('ssb');
      expect(result.reference).toBe('ssb');
    });
  });

  describe('computeCMBVelocity with Local Group reference', () => {
    it('returns velocity of ~620 km/s', () => {
      const result = computeCMBVelocity('local-group');
      expect(result.velocityKms).toBe(LOCAL_GROUP_CMB_VELOCITY_KMS);
      expect(result.velocityKms).toBeCloseTo(620, 0);
    });

    it('includes larger uncertainty (~15 km/s)', () => {
      const result = computeCMBVelocity('local-group');
      expect(result.uncertaintyKms).toBe(LOCAL_GROUP_CMB_VELOCITY_UNCERTAINTY_KMS);
      expect(result.uncertaintyKms).toBeCloseTo(15, 0);
    });

    it('has reference set to local-group', () => {
      const result = computeCMBVelocity('local-group');
      expect(result.reference).toBe('local-group');
    });
  });

  describe('computeCMBVelocity default', () => {
    it('defaults to SSB reference', () => {
      const defaultResult = computeCMBVelocity();
      const ssbResult = computeCMBVelocity('ssb');
      expect(defaultResult.velocityKms).toBe(ssbResult.velocityKms);
      expect(defaultResult.reference).toBe('ssb');
    });
  });

  describe('cmbDistanceKm', () => {
    it('uses SSB velocity by default', () => {
      const duration = 3600; // 1 hour
      const distance = cmbDistanceKm(duration);
      const expected = SSB_CMB_VELOCITY_KMS * duration;
      expect(distance).toBeCloseTo(expected, 6);
    });

    it('scales linearly with time', () => {
      const d1 = cmbDistanceKm(1000);
      const d2 = cmbDistanceKm(2000);
      expect(d2).toBeCloseTo(d1 * 2, 6);
    });

    it('computes correct distance for one year', () => {
      const oneYear = 365.25 * 24 * 3600;
      const distance = cmbDistanceKm(oneYear);
      // ~11.7 billion km per year at 369.82 km/s
      expect(distance / 1e9).toBeCloseTo(11.7, 0);
    });
  });

  describe('physical reasonableness', () => {
    it('CMB velocity is highest of all frames', () => {
      // CMB velocity (~370 km/s) > Galaxy (~220 km/s) > Orbit (~30 km/s)
      expect(SSB_CMB_VELOCITY_KMS).toBeGreaterThan(300);
    });

    it('Local Group velocity is higher than SSB', () => {
      // Local Group moves faster relative to CMB than just the solar system
      expect(LOCAL_GROUP_CMB_VELOCITY_KMS).toBeGreaterThan(SSB_CMB_VELOCITY_KMS);
    });

    it('SSB measurement has very low relative uncertainty', () => {
      // ~0.03% uncertainty - very precise measurement from Planck/WMAP
      const relativeUncertainty = SSB_CMB_VELOCITY_UNCERTAINTY_KMS / SSB_CMB_VELOCITY_KMS;
      expect(relativeUncertainty).toBeLessThan(0.001);
    });
  });
});
