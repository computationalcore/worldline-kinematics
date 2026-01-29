/**
 * Tests for coordinate frame transformations.
 */
import { describe, it, expect } from 'vitest';
import * as Astronomy from 'astronomy-engine';
import {
  vec3FromAstronomyVector,
  astronomyVectorFromVec3,
  rotateEqjToEcl,
  rotateEclToEqj,
  transformFrame,
  eclToThreeJs,
  threeJsToEcl,
  magnitude,
  normalize,
  scale,
  add,
  subtract,
  dot,
  cross,
  lerp,
} from '../src/frames/transforms';
import type { Vec3, Frame } from '../src/types';

describe('vector conversions', () => {
  describe('vec3FromAstronomyVector', () => {
    it('converts Astronomy.Vector to Vec3', () => {
      const time = Astronomy.MakeTime(new Date());
      const astroVec = new Astronomy.Vector(1, 2, 3, time);
      const result = vec3FromAstronomyVector(astroVec);
      expect(result).toEqual({ x: 1, y: 2, z: 3 });
    });
  });

  describe('astronomyVectorFromVec3', () => {
    it('converts Vec3 to Astronomy.Vector', () => {
      const time = Astronomy.MakeTime(new Date());
      const vec: Vec3 = { x: 1, y: 2, z: 3 };
      const result = astronomyVectorFromVec3(vec, time);
      expect(result.x).toBe(1);
      expect(result.y).toBe(2);
      expect(result.z).toBe(3);
    });
  });
});

describe('frame rotations', () => {
  describe('rotateEqjToEcl', () => {
    it('rotates EQJ vector to ECL', () => {
      const time = Astronomy.MakeTime(new Date());
      // Unit vector along z-axis in EQJ (celestial north pole)
      const vecEqj = new Astronomy.Vector(0, 0, 1, time);
      const vecEcl = rotateEqjToEcl(vecEqj);
      // After rotation by obliquity (~23.4 deg), the celestial pole appears tilted
      // x should remain ~0 (rotation is around x-axis)
      expect(Math.abs(vecEcl.x)).toBeLessThan(0.01);
      // y component should be non-zero (tilted by obliquity)
      expect(Math.abs(vecEcl.y)).toBeGreaterThan(0.3);
      // z should still be the major component (cos ~23.4 deg > 0.9)
      expect(vecEcl.z).toBeGreaterThan(0.9);
      // Vector should still be unit length
      const mag = Math.sqrt(vecEcl.x ** 2 + vecEcl.y ** 2 + vecEcl.z ** 2);
      expect(mag).toBeCloseTo(1, 10);
    });

    it('preserves vector magnitude', () => {
      const time = Astronomy.MakeTime(new Date());
      const vecEqj = new Astronomy.Vector(1, 2, 3, time);
      const vecEcl = rotateEqjToEcl(vecEqj);
      const magBefore = Math.sqrt(1 + 4 + 9);
      const magAfter = Math.sqrt(vecEcl.x ** 2 + vecEcl.y ** 2 + vecEcl.z ** 2);
      expect(magAfter).toBeCloseTo(magBefore, 10);
    });
  });

  describe('rotateEclToEqj', () => {
    it('is inverse of rotateEqjToEcl', () => {
      const time = Astronomy.MakeTime(new Date());
      const original = new Astronomy.Vector(1, 2, 3, time);
      const ecl = rotateEqjToEcl(original);
      const backToEqj = rotateEclToEqj(ecl);
      expect(backToEqj.x).toBeCloseTo(original.x, 10);
      expect(backToEqj.y).toBeCloseTo(original.y, 10);
      expect(backToEqj.z).toBeCloseTo(original.z, 10);
    });
  });

  describe('transformFrame', () => {
    it('returns same vector for same frame', () => {
      const time = Astronomy.MakeTime(new Date());
      const vec: Vec3 = { x: 1, y: 2, z: 3 };
      const result = transformFrame(vec, 'EQJ', 'EQJ', time);
      expect(result).toEqual(vec);
    });

    it('transforms EQJ to ECLIPJ2000', () => {
      const time = Astronomy.MakeTime(new Date());
      const vec: Vec3 = { x: 1, y: 0, z: 0 };
      const result = transformFrame(vec, 'EQJ', 'ECLIPJ2000', time);
      // x-axis is same direction in both frames
      expect(result.x).toBeCloseTo(1, 5);
      expect(Math.abs(result.y)).toBeLessThan(0.01);
      expect(Math.abs(result.z)).toBeLessThan(0.01);
    });

    it('transforms ECLIPJ2000 to EQJ', () => {
      const time = Astronomy.MakeTime(new Date());
      const vec: Vec3 = { x: 1, y: 2, z: 3 };
      const ecl = transformFrame(vec, 'EQJ', 'ECLIPJ2000', time);
      const backToEqj = transformFrame(ecl, 'ECLIPJ2000', 'EQJ', time);
      expect(backToEqj.x).toBeCloseTo(vec.x, 10);
      expect(backToEqj.y).toBeCloseTo(vec.y, 10);
      expect(backToEqj.z).toBeCloseTo(vec.z, 10);
    });

    it('throws for unsupported frame combination', () => {
      const time = Astronomy.MakeTime(new Date());
      const vec: Vec3 = { x: 1, y: 2, z: 3 };
      // Cast through unknown to test runtime validation of invalid frame
      expect(() =>
        transformFrame(vec, 'EQJ', 'INVALID' as unknown as Frame, time)
      ).toThrow();
    });
  });
});

describe('Three.js coordinate mapping', () => {
  describe('eclToThreeJs', () => {
    it('maps ECL x to Three x', () => {
      const ecl: Vec3 = { x: 1, y: 0, z: 0 };
      const three = eclToThreeJs(ecl);
      expect(three.x).toBe(1);
      expect(three.y).toBeCloseTo(0, 10);
      expect(three.z).toBeCloseTo(0, 10);
    });

    it('maps ECL z to Three y', () => {
      const ecl: Vec3 = { x: 0, y: 0, z: 1 };
      const three = eclToThreeJs(ecl);
      expect(three.x).toBeCloseTo(0, 10);
      expect(three.y).toBe(1);
      expect(three.z).toBeCloseTo(0, 10);
    });

    it('maps ECL y to Three -z', () => {
      const ecl: Vec3 = { x: 0, y: 1, z: 0 };
      const three = eclToThreeJs(ecl);
      expect(three.x).toBeCloseTo(0, 10);
      expect(three.y).toBeCloseTo(0, 10);
      expect(three.z).toBe(-1);
    });

    it('preserves vector magnitude', () => {
      const ecl: Vec3 = { x: 1, y: 2, z: 3 };
      const three = eclToThreeJs(ecl);
      expect(magnitude(three)).toBeCloseTo(magnitude(ecl), 10);
    });
  });

  describe('threeJsToEcl', () => {
    it('is inverse of eclToThreeJs', () => {
      const original: Vec3 = { x: 1, y: 2, z: 3 };
      const three = eclToThreeJs(original);
      const backToEcl = threeJsToEcl(three);
      expect(backToEcl.x).toBeCloseTo(original.x, 10);
      expect(backToEcl.y).toBeCloseTo(original.y, 10);
      expect(backToEcl.z).toBeCloseTo(original.z, 10);
    });
  });
});

describe('vector operations', () => {
  describe('magnitude', () => {
    it('computes magnitude of unit vectors', () => {
      expect(magnitude({ x: 1, y: 0, z: 0 })).toBe(1);
      expect(magnitude({ x: 0, y: 1, z: 0 })).toBe(1);
      expect(magnitude({ x: 0, y: 0, z: 1 })).toBe(1);
    });

    it('computes magnitude of 3-4-5 triangle', () => {
      expect(magnitude({ x: 3, y: 4, z: 0 })).toBe(5);
    });

    it('returns 0 for zero vector', () => {
      expect(magnitude({ x: 0, y: 0, z: 0 })).toBe(0);
    });
  });

  describe('normalize', () => {
    it('normalizes to unit length', () => {
      const result = normalize({ x: 3, y: 4, z: 0 });
      expect(magnitude(result)).toBeCloseTo(1, 10);
      expect(result.x).toBeCloseTo(0.6, 10);
      expect(result.y).toBeCloseTo(0.8, 10);
    });

    it('returns zero vector for zero input', () => {
      const result = normalize({ x: 0, y: 0, z: 0 });
      expect(result).toEqual({ x: 0, y: 0, z: 0 });
    });
  });

  describe('scale', () => {
    it('scales vector by factor', () => {
      const result = scale({ x: 1, y: 2, z: 3 }, 2);
      expect(result).toEqual({ x: 2, y: 4, z: 6 });
    });

    it('handles negative scale', () => {
      const result = scale({ x: 1, y: 2, z: 3 }, -1);
      expect(result).toEqual({ x: -1, y: -2, z: -3 });
    });
  });

  describe('add', () => {
    it('adds two vectors', () => {
      const result = add({ x: 1, y: 2, z: 3 }, { x: 4, y: 5, z: 6 });
      expect(result).toEqual({ x: 5, y: 7, z: 9 });
    });
  });

  describe('subtract', () => {
    it('subtracts two vectors', () => {
      const result = subtract({ x: 4, y: 5, z: 6 }, { x: 1, y: 2, z: 3 });
      expect(result).toEqual({ x: 3, y: 3, z: 3 });
    });
  });

  describe('dot', () => {
    it('computes dot product', () => {
      expect(dot({ x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 })).toBe(0);
      expect(dot({ x: 1, y: 2, z: 3 }, { x: 4, y: 5, z: 6 })).toBe(32);
    });

    it('returns magnitude squared for self dot', () => {
      const v: Vec3 = { x: 3, y: 4, z: 0 };
      expect(dot(v, v)).toBe(25);
    });
  });

  describe('cross', () => {
    it('computes cross product of basis vectors', () => {
      const x: Vec3 = { x: 1, y: 0, z: 0 };
      const y: Vec3 = { x: 0, y: 1, z: 0 };
      const z: Vec3 = { x: 0, y: 0, z: 1 };

      const xCrossY = cross(x, y);
      expect(xCrossY.z).toBeCloseTo(1, 10);

      const yCrossZ = cross(y, z);
      expect(yCrossZ.x).toBeCloseTo(1, 10);

      const zCrossX = cross(z, x);
      expect(zCrossX.y).toBeCloseTo(1, 10);
    });

    it('is anti-commutative', () => {
      const a: Vec3 = { x: 1, y: 2, z: 3 };
      const b: Vec3 = { x: 4, y: 5, z: 6 };
      const aXb = cross(a, b);
      const bXa = cross(b, a);
      expect(aXb.x).toBeCloseTo(-bXa.x, 10);
      expect(aXb.y).toBeCloseTo(-bXa.y, 10);
      expect(aXb.z).toBeCloseTo(-bXa.z, 10);
    });
  });

  describe('lerp', () => {
    it('returns a at t=0', () => {
      const a: Vec3 = { x: 0, y: 0, z: 0 };
      const b: Vec3 = { x: 10, y: 20, z: 30 };
      const result = lerp(a, b, 0);
      expect(result).toEqual(a);
    });

    it('returns b at t=1', () => {
      const a: Vec3 = { x: 0, y: 0, z: 0 };
      const b: Vec3 = { x: 10, y: 20, z: 30 };
      const result = lerp(a, b, 1);
      expect(result).toEqual(b);
    });

    it('returns midpoint at t=0.5', () => {
      const a: Vec3 = { x: 0, y: 0, z: 0 };
      const b: Vec3 = { x: 10, y: 20, z: 30 };
      const result = lerp(a, b, 0.5);
      expect(result).toEqual({ x: 5, y: 10, z: 15 });
    });
  });
});
