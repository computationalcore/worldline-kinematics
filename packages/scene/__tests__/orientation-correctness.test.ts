/**
 * Body orientation correctness tests.
 *
 * Verifies the quaternion-based orientation system aligns body textures
 * correctly with IAU rotation models.
 */

import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { computeBodyQuaternion } from '../src/solar/Planet';

// J2000 obliquity
const OBLIQUITY_J2000 = THREE.MathUtils.degToRad(23.439281);

// EQJ north pole in scene coordinates
const EQJ_NORTH_SCENE = new THREE.Vector3(
  0,
  Math.cos(OBLIQUITY_J2000),
  -Math.sin(OBLIQUITY_J2000)
).normalize();

// EQJ +Y axis in scene coordinates (RA = 90 direction) - reserved for future use
const _EQJ_Y_SCENE = new THREE.Vector3(
  0,
  Math.sin(OBLIQUITY_J2000),
  -Math.cos(OBLIQUITY_J2000)
).normalize();

describe('computeBodyQuaternion', () => {
  describe('basic properties', () => {
    it('returns a unit quaternion', () => {
      const northPole: [number, number, number] = [0, 1, 0];
      const qArr = computeBodyQuaternion(northPole, 0);
      const q = new THREE.Quaternion(qArr[0], qArr[1], qArr[2], qArr[3]);

      expect(q.length()).toBeCloseTo(1, 10);
    });

    it('produces deterministic output for same input', () => {
      const northPole: [number, number, number] = [0.1, 0.9, 0.436];
      const rotationAngle = 45;

      const q1 = computeBodyQuaternion(northPole, rotationAngle);
      const q2 = computeBodyQuaternion(northPole, rotationAngle);

      expect(q1[0]).toBe(q2[0]);
      expect(q1[1]).toBe(q2[1]);
      expect(q1[2]).toBe(q2[2]);
      expect(q1[3]).toBe(q2[3]);
    });

    it('different rotation angles produce different quaternions', () => {
      const northPole: [number, number, number] = [0, 0.917, -0.398];

      const q1 = computeBodyQuaternion(northPole, 0);
      const q2 = computeBodyQuaternion(northPole, 90);

      // At least one component should differ
      const same =
        q1[0] === q2[0] && q1[1] === q2[1] && q1[2] === q2[2] && q1[3] === q2[3];

      expect(same).toBe(false);
    });
  });

  describe('pole alignment invariants', () => {
    it('Y-axis of rotated basis points toward north pole', () => {
      // Various pole directions to test
      const poles: [number, number, number][] = [
        [0, 1, 0], // Ecliptic north
        [0, 0.917, -0.398], // Earth-like (EQJ north)
        [0.447, 0.894, 0], // Tilted pole
        [0, 0.134, 0.991], // Uranus-like (extreme tilt)
      ];

      for (const northPole of poles) {
        const qArr = computeBodyQuaternion(northPole, 0);
        const q = new THREE.Quaternion(qArr[0], qArr[1], qArr[2], qArr[3]);

        // Y-axis after rotation should align with north pole
        const yAxis = new THREE.Vector3(0, 1, 0).applyQuaternion(q);
        const pole = new THREE.Vector3(
          northPole[0],
          northPole[1],
          northPole[2]
        ).normalize();

        const dotProduct = yAxis.dot(pole);
        expect(dotProduct).toBeCloseTo(1, 5);
      }
    });

    it('produces orthonormal basis', () => {
      const northPole: [number, number, number] = [0.1, 0.95, -0.3];
      const qArr = computeBodyQuaternion(northPole, 45);
      const q = new THREE.Quaternion(qArr[0], qArr[1], qArr[2], qArr[3]);

      const xAxis = new THREE.Vector3(1, 0, 0).applyQuaternion(q);
      const yAxis = new THREE.Vector3(0, 1, 0).applyQuaternion(q);
      const zAxis = new THREE.Vector3(0, 0, 1).applyQuaternion(q);

      // All should be unit vectors
      expect(xAxis.length()).toBeCloseTo(1, 10);
      expect(yAxis.length()).toBeCloseTo(1, 10);
      expect(zAxis.length()).toBeCloseTo(1, 10);

      // All should be orthogonal
      expect(xAxis.dot(yAxis)).toBeCloseTo(0, 10);
      expect(yAxis.dot(zAxis)).toBeCloseTo(0, 10);
      expect(zAxis.dot(xAxis)).toBeCloseTo(0, 10);

      // Should form right-handed system
      const crossXY = new THREE.Vector3().crossVectors(xAxis, yAxis);
      expect(crossXY.dot(zAxis)).toBeCloseTo(1, 10);
    });
  });

  describe('Earth-like degenerate case handling', () => {
    /**
     * When the body's pole is aligned with EQJ north (like Earth),
     * the cross product becomes degenerate and we need special handling.
     * This test ensures the fallback to EQJ_Y_SCENE works correctly.
     */

    it('handles Earth pole (nearly aligned with EQJ north)', () => {
      // Earth's pole in scene coordinates (very close to EQJ north)
      const earthPole: [number, number, number] = [
        -0.0015,
        0.9175,
        -0.3978, // Typical Earth orientation values
      ];

      expect(() => computeBodyQuaternion(earthPole, 102.38)).not.toThrow();

      const qArr = computeBodyQuaternion(earthPole, 102.38);
      const q = new THREE.Quaternion(qArr[0], qArr[1], qArr[2], qArr[3]);

      // Should still be unit quaternion
      expect(q.length()).toBeCloseTo(1, 10);

      // Y-axis should still point toward pole
      const yAxis = new THREE.Vector3(0, 1, 0).applyQuaternion(q);
      const pole = new THREE.Vector3(
        earthPole[0],
        earthPole[1],
        earthPole[2]
      ).normalize();
      expect(yAxis.dot(pole)).toBeCloseTo(1, 3);
    });

    it('handles exactly EQJ north pole', () => {
      // Exactly EQJ north (edge case)
      const eqjNorth: [number, number, number] = [
        EQJ_NORTH_SCENE.x,
        EQJ_NORTH_SCENE.y,
        EQJ_NORTH_SCENE.z,
      ];

      expect(() => computeBodyQuaternion(eqjNorth, 0)).not.toThrow();
      expect(() => computeBodyQuaternion(eqjNorth, 180)).not.toThrow();
    });

    it('W angle rotation works correctly for Earth-like poles', () => {
      const earthPole: [number, number, number] = [-0.0015, 0.9175, -0.3978];

      // Get quaternion at W=0 and W=90
      const q0 = computeBodyQuaternion(earthPole, 0);
      const q90 = computeBodyQuaternion(earthPole, 90);

      const quat0 = new THREE.Quaternion(q0[0], q0[1], q0[2], q0[3]);
      const quat90 = new THREE.Quaternion(q90[0], q90[1], q90[2], q90[3]);

      // X-axis should rotate by 90 degrees around the pole
      const x0 = new THREE.Vector3(1, 0, 0).applyQuaternion(quat0);
      const x90 = new THREE.Vector3(1, 0, 0).applyQuaternion(quat90);

      // The angle between them should be ~90 degrees
      const dotProduct = x0.dot(x90);
      const angle = Math.acos(Math.abs(dotProduct)) * (180 / Math.PI);

      // Should be close to 90 degrees
      expect(angle).toBeGreaterThan(80);
      expect(angle).toBeLessThan(100);
    });
  });

  describe('rotation angle (W) behavior', () => {
    it('W=0 and W=360 produce equivalent orientations', () => {
      const pole: [number, number, number] = [0.2, 0.9, 0.387];

      const q0 = computeBodyQuaternion(pole, 0);
      const q360 = computeBodyQuaternion(pole, 360);

      const quat0 = new THREE.Quaternion(q0[0], q0[1], q0[2], q0[3]);
      const quat360 = new THREE.Quaternion(q360[0], q360[1], q360[2], q360[3]);

      // Same point after rotation should be the same
      const point = new THREE.Vector3(1, 2, 3);
      const p0 = point.clone().applyQuaternion(quat0);
      const p360 = point.clone().applyQuaternion(quat360);

      expect(p0.x).toBeCloseTo(p360.x, 5);
      expect(p0.y).toBeCloseTo(p360.y, 5);
      expect(p0.z).toBeCloseTo(p360.z, 5);
    });

    it('W advances proportionally with rotation angle', () => {
      const pole: [number, number, number] = [0.1, 0.95, -0.3];

      // Get X-axis directions at different W values
      const angles = [0, 30, 60, 90, 120, 150, 180];
      const xDirections: THREE.Vector3[] = [];

      for (const angle of angles) {
        const qArr = computeBodyQuaternion(pole, angle);
        const q = new THREE.Quaternion(qArr[0], qArr[1], qArr[2], qArr[3]);
        xDirections.push(new THREE.Vector3(1, 0, 0).applyQuaternion(q));
      }

      // Consecutive angles should have ~30 degrees between X-axes
      for (let i = 1; i < xDirections.length; i++) {
        const dotProduct = xDirections[i - 1].dot(xDirections[i]);
        const angle = Math.acos(Math.abs(dotProduct)) * (180 / Math.PI);

        // Should be approximately 30 degrees (with some tolerance)
        expect(angle).toBeGreaterThan(20);
        expect(angle).toBeLessThan(40);
      }
    });
  });

  describe('texture offset handling', () => {
    it('texture offset modifies the rotation correctly', () => {
      const pole: [number, number, number] = [0, 0.917, -0.398];

      const qNoOffset = computeBodyQuaternion(pole, 90, 0);
      const qWithOffset = computeBodyQuaternion(pole, 90, 45);

      const quatNoOffset = new THREE.Quaternion(
        qNoOffset[0],
        qNoOffset[1],
        qNoOffset[2],
        qNoOffset[3]
      );
      const quatWithOffset = new THREE.Quaternion(
        qWithOffset[0],
        qWithOffset[1],
        qWithOffset[2],
        qWithOffset[3]
      );

      // They should produce different orientations
      const point = new THREE.Vector3(1, 0, 0);
      const p1 = point.clone().applyQuaternion(quatNoOffset);
      const p2 = point.clone().applyQuaternion(quatWithOffset);

      // Angle between should be ~45 degrees
      const dotProduct = p1.dot(p2);
      const angle = Math.acos(Math.abs(dotProduct)) * (180 / Math.PI);

      expect(angle).toBeGreaterThan(35);
      expect(angle).toBeLessThan(55);
    });

    it('texture offset is equivalent to adding to W', () => {
      const pole: [number, number, number] = [0.3, 0.9, 0.316];

      const q1 = computeBodyQuaternion(pole, 90, 30); // W=90, offset=30
      const q2 = computeBodyQuaternion(pole, 120, 0); // W=120, offset=0

      const quat1 = new THREE.Quaternion(q1[0], q1[1], q1[2], q1[3]);
      const quat2 = new THREE.Quaternion(q2[0], q2[1], q2[2], q2[3]);

      // Should produce equivalent orientations
      const point = new THREE.Vector3(1, 2, 3);
      const p1 = point.clone().applyQuaternion(quat1);
      const p2 = point.clone().applyQuaternion(quat2);

      expect(p1.x).toBeCloseTo(p2.x, 5);
      expect(p1.y).toBeCloseTo(p2.y, 5);
      expect(p1.z).toBeCloseTo(p2.z, 5);
    });
  });

  describe('various planet pole orientations', () => {
    // Test data based on typical pole orientations from getBodyOrientation
    const planetPoles: Record<string, [number, number, number]> = {
      Mercury: [0.0914, 0.9925, 0.0816],
      Venus: [0.0187, 0.9998, -0.0109],
      Earth: [-0.0015, 0.9175, -0.3978],
      Moon: [-0.0234, 0.9996, -0.014],
      Mars: [0.4462, 0.8932, 0.0553],
      Jupiter: [-0.0146, 0.9993, 0.0358],
      Saturn: [0.0855, 0.8825, -0.4624],
      Uranus: [-0.212, 0.1344, 0.968], // Extreme tilt
      Neptune: [0.3575, 0.8793, 0.3149],
    };

    for (const [planet, pole] of Object.entries(planetPoles)) {
      it(`handles ${planet} pole orientation`, () => {
        expect(() => computeBodyQuaternion(pole, 0)).not.toThrow();
        expect(() => computeBodyQuaternion(pole, 90)).not.toThrow();
        expect(() => computeBodyQuaternion(pole, 180)).not.toThrow();
        expect(() => computeBodyQuaternion(pole, 270)).not.toThrow();

        const qArr = computeBodyQuaternion(pole, 45);
        const q = new THREE.Quaternion(qArr[0], qArr[1], qArr[2], qArr[3]);

        // Should produce valid unit quaternion
        expect(q.length()).toBeCloseTo(1, 10);

        // Y-axis should point toward pole
        const yAxis = new THREE.Vector3(0, 1, 0).applyQuaternion(q);
        const poleVec = new THREE.Vector3(pole[0], pole[1], pole[2]).normalize();
        expect(yAxis.dot(poleVec)).toBeCloseTo(1, 3);
      });
    }
  });

  describe('numerical stability', () => {
    it('handles very small rotation angles', () => {
      const pole: [number, number, number] = [0.1, 0.9, 0.436];

      expect(() => computeBodyQuaternion(pole, 0.001)).not.toThrow();
      expect(() => computeBodyQuaternion(pole, -0.001)).not.toThrow();
    });

    it('handles negative rotation angles', () => {
      const pole: [number, number, number] = [0.2, 0.9, 0.387];

      const qPos = computeBodyQuaternion(pole, 45);
      const qNeg = computeBodyQuaternion(pole, -315); // Equivalent to +45

      const quatPos = new THREE.Quaternion(qPos[0], qPos[1], qPos[2], qPos[3]);
      const quatNeg = new THREE.Quaternion(qNeg[0], qNeg[1], qNeg[2], qNeg[3]);

      const point = new THREE.Vector3(1, 2, 3);
      const pPos = point.clone().applyQuaternion(quatPos);
      const pNeg = point.clone().applyQuaternion(quatNeg);

      expect(pPos.x).toBeCloseTo(pNeg.x, 5);
      expect(pPos.y).toBeCloseTo(pNeg.y, 5);
      expect(pPos.z).toBeCloseTo(pNeg.z, 5);
    });

    it('handles poles near coordinate axes', () => {
      const polesNearAxes: [number, number, number][] = [
        [0.999, 0.01, 0.01], // Near +X
        [0.01, 0.999, 0.01], // Near +Y
        [0.01, 0.01, 0.999], // Near +Z
        [-0.999, 0.01, 0.01], // Near -X
      ];

      for (const pole of polesNearAxes) {
        expect(() => computeBodyQuaternion(pole, 90)).not.toThrow();

        const qArr = computeBodyQuaternion(pole, 90);
        const q = new THREE.Quaternion(qArr[0], qArr[1], qArr[2], qArr[3]);

        expect(q.length()).toBeCloseTo(1, 8);
      }
    });
  });
});
