/**
 * Coordinate frame transformations.
 *
 * Astronomy Engine provides vectors in EQJ (J2000 equatorial) by default.
 * For solar system visualization, we convert to ECLIPJ2000 (J2000 ecliptic).
 *
 * Reference: Astronomy Engine documentation
 * https://github.com/cosinekitty/astronomy
 */

import * as Astronomy from 'astronomy-engine';
import type { Frame, Vec3 } from '../types';

/**
 * Pre-computed rotation matrix from EQJ to ECLIPJ2000.
 * This is a fixed rotation by the J2000 obliquity of the ecliptic (~23.4 degrees).
 */
const ROT_EQJ_TO_ECL = Astronomy.Rotation_EQJ_ECL();

/**
 * Pre-computed rotation matrix from ECLIPJ2000 to EQJ.
 */
const ROT_ECL_TO_EQJ = Astronomy.Rotation_ECL_EQJ();

/**
 * Convert an Astronomy Engine vector to our Vec3 type.
 */
export function vec3FromAstronomyVector(v: Astronomy.Vector): Vec3 {
  return { x: v.x, y: v.y, z: v.z };
}

/**
 * Convert our Vec3 type to an Astronomy Engine vector.
 */
export function astronomyVectorFromVec3(
  v: Vec3,
  t: Astronomy.AstroTime
): Astronomy.Vector {
  return new Astronomy.Vector(v.x, v.y, v.z, t);
}

/**
 * Rotate a vector from EQJ to ECLIPJ2000.
 */
export function rotateEqjToEcl(vecEqj: Astronomy.Vector): Astronomy.Vector {
  return Astronomy.RotateVector(ROT_EQJ_TO_ECL, vecEqj);
}

/**
 * Rotate a vector from ECLIPJ2000 to EQJ.
 */
export function rotateEclToEqj(vecEcl: Astronomy.Vector): Astronomy.Vector {
  return Astronomy.RotateVector(ROT_ECL_TO_EQJ, vecEcl);
}

/**
 * Transform a Vec3 between frames.
 */
export function transformFrame(
  v: Vec3,
  from: Frame,
  to: Frame,
  time: Astronomy.AstroTime
): Vec3 {
  if (from === to) {
    return v;
  }

  const astroVec = astronomyVectorFromVec3(v, time);

  if (from === 'EQJ' && to === 'ECLIPJ2000') {
    return vec3FromAstronomyVector(rotateEqjToEcl(astroVec));
  }

  if (from === 'ECLIPJ2000' && to === 'EQJ') {
    return vec3FromAstronomyVector(rotateEclToEqj(astroVec));
  }

  throw new Error(`Unsupported frame transformation: ${from} -> ${to}`);
}

/**
 * Map ECLIPJ2000 coordinates to Three.js scene coordinates.
 *
 * Convention (right-handed, determinant +1):
 * - ECL x -> Three x (vernal equinox direction)
 * - ECL y -> Three -z (negated to maintain right-handedness)
 * - ECL z -> Three y (north ecliptic pole = "up")
 *
 * This preserves:
 * - Right-handed coordinate system (crucial for cross products, normals, ring planes)
 * - Counterclockwise orbital motion when viewed from +y
 * - Ecliptic plane as the xz-plane
 * - North ecliptic pole as +y
 *
 * The negation of the y-component prevents the reflection that would otherwise
 * flip angular momentum directions and break physics-based calculations.
 */
export function eclToThreeJs(vEcl: Vec3): Vec3 {
  return {
    x: vEcl.x,
    y: vEcl.z, // ECL z (north pole) -> Three y (up)
    z: -vEcl.y, // ECL y (prograde) -> Three -z (negated for right-handedness)
  };
}

/**
 * Map Three.js scene coordinates back to ECLIPJ2000.
 * Inverse of eclToThreeJs.
 */
export function threeJsToEcl(vThree: Vec3): Vec3 {
  return {
    x: vThree.x,
    y: -vThree.z, // Three -z -> ECL y (negated)
    z: vThree.y, // Three y (up) -> ECL z (north pole)
  };
}

/**
 * Calculate the magnitude (length) of a vector.
 */
export function magnitude(v: Vec3): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

/**
 * Normalize a vector to unit length.
 */
export function normalize(v: Vec3): Vec3 {
  const m = magnitude(v);
  if (m === 0) {
    return { x: 0, y: 0, z: 0 };
  }
  return { x: v.x / m, y: v.y / m, z: v.z / m };
}

/**
 * Scale a vector by a scalar.
 */
export function scale(v: Vec3, s: number): Vec3 {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

/**
 * Add two vectors.
 */
export function add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

/**
 * Subtract two vectors (a - b).
 */
export function subtract(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

/**
 * Dot product of two vectors.
 */
export function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

/**
 * Cross product of two vectors.
 */
export function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

/**
 * Linear interpolation between two vectors.
 */
export function lerp(a: Vec3, b: Vec3, t: number): Vec3 {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
  };
}
