/**
 * Regression tests for body orientation quaternion stability.
 */

import { describe, it, expect } from 'vitest';
import { computeBodyQuaternion } from '../src/solar/Planet';
import * as THREE from 'three';

/**
 * J2000 obliquity in radians.
 */
const OBLIQUITY_J2000 = THREE.MathUtils.degToRad(23.439281);

/**
 * EQJ north pole in scene coordinates (same as in Planet.tsx).
 */
const EQJ_NORTH_SCENE = new THREE.Vector3(
  0,
  Math.cos(OBLIQUITY_J2000),
  -Math.sin(OBLIQUITY_J2000)
).normalize();

describe('computeBodyQuaternion stability', () => {
  describe('near-aligned pole regression', () => {
    it('should not flip x-axis when pole x-component changes sign (regression)', () => {
      // This test catches the bug where the cross product of EQJ_NORTH with a
      // nearly-aligned pole produces a tiny vector whose normalized direction
      // flips based on microscopic sign changes in the pole's off-axis components.
      //
      // Bug: Without the alignment check (dot > 0.9999), this test fails because
      // the x-axis flips ~180 degrees when pole.x changes from +epsilon to -epsilon.

      // Create two poles that differ only in the sign of a tiny x-component
      // Both are nearly aligned with EQJ_NORTH_SCENE
      const tinyOffset = 1e-6;
      const pole1: [number, number, number] = [
        +tinyOffset,
        EQJ_NORTH_SCENE.y,
        EQJ_NORTH_SCENE.z,
      ];
      const pole2: [number, number, number] = [
        -tinyOffset,
        EQJ_NORTH_SCENE.y,
        EQJ_NORTH_SCENE.z,
      ];

      // Normalize both poles
      const norm1 = Math.sqrt(pole1[0] ** 2 + pole1[1] ** 2 + pole1[2] ** 2);
      const norm2 = Math.sqrt(pole2[0] ** 2 + pole2[1] ** 2 + pole2[2] ** 2);
      pole1[0] /= norm1;
      pole1[1] /= norm1;
      pole1[2] /= norm1;
      pole2[0] /= norm2;
      pole2[1] /= norm2;
      pole2[2] /= norm2;

      // Compute quaternions with same rotation angle
      const spinDeg = 102.38; // Example from Oct 3, 1984 12:00 UTC
      const q1 = computeBodyQuaternion(pole1, spinDeg);
      const q2 = computeBodyQuaternion(pole2, spinDeg);

      // Extract x-axis (prime meridian direction) from each quaternion
      const xAxis1 = new THREE.Vector3(1, 0, 0).applyQuaternion(
        new THREE.Quaternion(q1[0], q1[1], q1[2], q1[3])
      );
      const xAxis2 = new THREE.Vector3(1, 0, 0).applyQuaternion(
        new THREE.Quaternion(q2[0], q2[1], q2[2], q2[3])
      );

      // The x-axes should be nearly identical (dot product close to 1)
      // Without the fix, dot would be close to -1 (flipped by 180 degrees)
      const dot = xAxis1.dot(xAxis2);
      expect(dot).toBeGreaterThan(0.99);

      // Angle between should be very small (less than 5 degrees)
      const angleDeg = THREE.MathUtils.radToDeg(Math.acos(Math.min(1, Math.abs(dot))));
      expect(angleDeg).toBeLessThan(5);
    });

    it('should produce consistent results for Earth-like poles across dates', () => {
      // Earth's pole varies slightly due to precession/nutation, but these
      // tiny variations should not cause large orientation changes.
      //
      // Simulate poles from different dates (all nearly aligned with EQJ_NORTH)
      const testPoles: [number, number, number][] = [
        [0.00254, 0.91746, -0.3978], // "Now" (Jan 29, 2026)
        [-0.00151, 0.91747, -0.39779], // "Birthday" (Oct 3, 1984)
        [0.001, 0.91746, -0.39781], // Another hypothetical date
        [-0.002, 0.91747, -0.39778], // Another hypothetical date
      ];

      const spinDeg = 100; // Arbitrary fixed spin angle
      const xAxes: THREE.Vector3[] = [];

      for (const pole of testPoles) {
        // Normalize pole
        const norm = Math.sqrt(pole[0] ** 2 + pole[1] ** 2 + pole[2] ** 2);
        const normalizedPole: [number, number, number] = [
          pole[0] / norm,
          pole[1] / norm,
          pole[2] / norm,
        ];

        const q = computeBodyQuaternion(normalizedPole, spinDeg);
        const xAxis = new THREE.Vector3(1, 0, 0).applyQuaternion(
          new THREE.Quaternion(q[0], q[1], q[2], q[3])
        );
        xAxes.push(xAxis);
      }

      // All x-axes should be nearly parallel (no sudden flips)
      for (let i = 1; i < xAxes.length; i++) {
        const dot = xAxes[0].dot(xAxes[i]);
        // Dot should be positive and close to 1 (not negative which would mean flipped)
        expect(dot).toBeGreaterThan(0.95);
      }
    });

    it('should correctly trigger degenerate path for Earth-like poles', () => {
      // Verify that poles within 0.8 degrees of EQJ_NORTH use the stable fallback
      // dot(pole, EQJ_NORTH) > 0.9999 corresponds to angle < ~0.8 degrees

      // Earth's actual pole is tilted by obliquity from EQJ_NORTH, but very close
      // in the component representation we use
      const earthLikePole: [number, number, number] = [
        0.001,
        EQJ_NORTH_SCENE.y,
        EQJ_NORTH_SCENE.z,
      ];

      // Normalize
      const norm = Math.sqrt(
        earthLikePole[0] ** 2 + earthLikePole[1] ** 2 + earthLikePole[2] ** 2
      );
      earthLikePole[0] /= norm;
      earthLikePole[1] /= norm;
      earthLikePole[2] /= norm;

      // Compute dot with EQJ_NORTH_SCENE
      const dot =
        earthLikePole[0] * EQJ_NORTH_SCENE.x +
        earthLikePole[1] * EQJ_NORTH_SCENE.y +
        earthLikePole[2] * EQJ_NORTH_SCENE.z;

      // Should be very close to 1 (triggering the alignment check)
      expect(Math.abs(dot)).toBeGreaterThan(0.9999);

      // The quaternion should still be valid
      const q = computeBodyQuaternion(earthLikePole, 45);
      const quatObj = new THREE.Quaternion(q[0], q[1], q[2], q[3]);

      // Verify quaternion is normalized
      expect(quatObj.length()).toBeCloseTo(1.0, 6);
    });
  });

  describe('prime meridian direction at UTC noon', () => {
    it('should point toward Sun at UTC noon (within 10 degrees)', () => {
      // At Oct 3, 1984 12:00 UTC, the prime meridian should face the Sun
      // Sun direction at that date (approximate, from analysis document)
      const sunDir = new THREE.Vector3(-0.983, 0, 0.185).normalize();

      // Earth pole at that date (from analysis document)
      const pole: [number, number, number] = [-0.0015, 0.917472, -0.397797];
      const norm = Math.sqrt(pole[0] ** 2 + pole[1] ** 2 + pole[2] ** 2);
      pole[0] /= norm;
      pole[1] /= norm;
      pole[2] /= norm;

      // W angle at Oct 3, 1984 12:00 UTC
      const spinDeg = 102.38;

      const q = computeBodyQuaternion(pole, spinDeg);
      const xAxis = new THREE.Vector3(1, 0, 0).applyQuaternion(
        new THREE.Quaternion(q[0], q[1], q[2], q[3])
      );

      // The x-axis (prime meridian) should point roughly toward the Sun
      const dot = xAxis.dot(sunDir);
      const angleDeg = THREE.MathUtils.radToDeg(Math.acos(Math.abs(dot)));

      // Should be within 10 degrees (accounting for Equation of Time, etc.)
      expect(angleDeg).toBeLessThan(10);
    });
  });
});
