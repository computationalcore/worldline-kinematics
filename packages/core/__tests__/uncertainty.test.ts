/**
 * Tests for uncertainty evaluation helper.
 */

import { describe, it, expect } from 'vitest';
import { isSignificantUncertainty } from '../src/frames/uncertainty';

describe('isSignificantUncertainty', () => {
  describe('returns false for insignificant uncertainty', () => {
    it('returns false when sigma is undefined', () => {
      expect(isSignificantUncertainty(100)).toBe(false);
      expect(isSignificantUncertainty(100, undefined)).toBe(false);
    });

    it('returns false when sigma is null', () => {
      expect(isSignificantUncertainty(100, null as unknown as undefined)).toBe(false);
    });

    it('returns false when sigma is 0', () => {
      expect(isSignificantUncertainty(100, 0)).toBe(false);
      expect(isSignificantUncertainty(0.001, 0)).toBe(false);
    });

    it('returns false when relative uncertainty is below threshold', () => {
      // Default threshold is 1e-3 (0.1%)
      // sigma / value < 1e-3 means sigma < value * 1e-3

      // 0.05 / 100 = 0.0005 = 0.05% < 0.1%
      expect(isSignificantUncertainty(100, 0.05)).toBe(false);

      // 0.001 / 10 = 0.0001 = 0.01% < 0.1%
      expect(isSignificantUncertainty(10, 0.001)).toBe(false);
    });
  });

  describe('returns true for significant uncertainty', () => {
    it('returns true when relative uncertainty exceeds threshold', () => {
      // Default threshold is 1e-3 (0.1%)
      // sigma / value >= 1e-3

      // 0.5 / 100 = 0.005 = 0.5% > 0.1%
      expect(isSignificantUncertainty(100, 0.5)).toBe(true);

      // 1 / 100 = 0.01 = 1% > 0.1%
      expect(isSignificantUncertainty(100, 1)).toBe(true);

      // 10 / 100 = 0.1 = 10% > 0.1%
      expect(isSignificantUncertainty(100, 10)).toBe(true);
    });

    it('returns true when value is 0 but sigma is non-zero', () => {
      // Any non-zero uncertainty on a zero value is significant
      expect(isSignificantUncertainty(0, 0.001)).toBe(true);
      expect(isSignificantUncertainty(0, 1)).toBe(true);
    });

    it('returns true at exactly the threshold', () => {
      // At exactly 0.1% (1e-3), should return true (>= comparison)
      expect(isSignificantUncertainty(1000, 1)).toBe(true); // 1/1000 = 0.001 = 0.1%
    });
  });

  describe('custom threshold', () => {
    it('uses custom threshold when provided', () => {
      // With 1% threshold (0.01)
      // 0.5 / 100 = 0.5% < 1% -> false
      expect(isSignificantUncertainty(100, 0.5, 0.01)).toBe(false);

      // 1 / 100 = 1% >= 1% -> true
      expect(isSignificantUncertainty(100, 1, 0.01)).toBe(true);

      // 2 / 100 = 2% > 1% -> true
      expect(isSignificantUncertainty(100, 2, 0.01)).toBe(true);
    });

    it('supports very small thresholds', () => {
      // With 0.001% threshold (1e-5)
      // 0.001 / 100 = 0.00001 = 0.001% >= 0.001% -> true
      expect(isSignificantUncertainty(100, 0.001, 1e-5)).toBe(true);

      // 0.0001 / 100 = 0.000001 = 0.0001% < 0.001% -> false
      expect(isSignificantUncertainty(100, 0.0001, 1e-5)).toBe(false);
    });

    it('supports large thresholds', () => {
      // With 10% threshold (0.1)
      // 5 / 100 = 5% < 10% -> false
      expect(isSignificantUncertainty(100, 5, 0.1)).toBe(false);

      // 15 / 100 = 15% > 10% -> true
      expect(isSignificantUncertainty(100, 15, 0.1)).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('handles negative values correctly', () => {
      // Negative values should work (absolute ratio)
      expect(isSignificantUncertainty(-100, 0.05)).toBe(false);
      expect(isSignificantUncertainty(-100, 0.5)).toBe(true);
    });

    it('handles negative sigma correctly', () => {
      // Negative sigma is mathematically unusual but should work
      // The function uses Math.abs(sigma / value)
      expect(isSignificantUncertainty(100, -0.05)).toBe(false);
      expect(isSignificantUncertainty(100, -0.5)).toBe(true);
    });

    it('handles very large values', () => {
      const largeValue = 1e15;
      const smallSigma = 1e12; // 0.1%
      const largeSigma = 1e13; // 1%

      expect(isSignificantUncertainty(largeValue, smallSigma)).toBe(true); // 0.1% >= 0.1%
      expect(isSignificantUncertainty(largeValue, largeSigma)).toBe(true);
    });

    it('handles very small values', () => {
      const smallValue = 1e-10;
      const tinySigma = 1e-14; // 0.01%
      const smallSigma = 1e-13; // 0.1%

      expect(isSignificantUncertainty(smallValue, tinySigma)).toBe(false);
      expect(isSignificantUncertainty(smallValue, smallSigma)).toBe(true);
    });
  });

  describe('real-world frame uncertainty examples', () => {
    it('Earth spin velocity has no significant uncertainty', () => {
      // Spin velocity is computed from known constants
      const spinVelocityKms = 0.465; // km/s at equator
      // No measurement uncertainty in our model
      expect(isSignificantUncertainty(spinVelocityKms, undefined)).toBe(false);
    });

    it('Galaxy velocity has significant uncertainty', () => {
      // Solar galactic orbital speed: ~220 km/s with ~10-20 km/s uncertainty
      const galaxyVelocityKms = 220;
      const galaxyUncertaintyKms = 15; // ~7% uncertainty

      expect(isSignificantUncertainty(galaxyVelocityKms, galaxyUncertaintyKms)).toBe(
        true
      );
    });

    it('CMB velocity has significant uncertainty', () => {
      // SSB CMB velocity: 369.82 +/- 0.11 km/s
      const cmbVelocityKms = 369.82;
      const cmbUncertaintyKms = 0.11; // ~0.03% uncertainty

      // 0.03% < 0.1% default threshold, so NOT significant by default
      expect(isSignificantUncertainty(cmbVelocityKms, cmbUncertaintyKms)).toBe(false);

      // But with a tighter threshold (0.01% = 1e-4), it IS significant
      expect(isSignificantUncertainty(cmbVelocityKms, cmbUncertaintyKms, 1e-4)).toBe(
        true
      );
    });
  });
});
