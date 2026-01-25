/**
 * WGS84 ellipsoid calculations for Earth surface geometry.
 */

import { WGS84_SEMI_MAJOR_AXIS_M, WGS84_ECCENTRICITY_SQUARED } from '../constants';

/**
 * Converts degrees to radians.
 */
export function degreesToRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Converts radians to degrees.
 */
export function radiansToDegrees(radians: number): number {
  return radians * (180 / Math.PI);
}

/**
 * Computes the prime vertical radius of curvature N(φ) at a given latitude.
 * This is the radius of curvature in the plane perpendicular to the meridian.
 *
 * Formula: N(φ) = a / √(1 - e²sin²φ)
 *
 * @param latitudeRad Latitude in radians
 * @returns Prime vertical radius in meters
 */
export function primeVerticalRadius(latitudeRad: number): number {
  const sinLat = Math.sin(latitudeRad);
  const denominator = Math.sqrt(1 - WGS84_ECCENTRICITY_SQUARED * sinLat * sinLat);
  return WGS84_SEMI_MAJOR_AXIS_M / denominator;
}

/**
 * Computes the radius of the parallel (latitude circle) at a given latitude.
 * This is the distance from the Earth's rotation axis to a point on the surface.
 *
 * Formula: r(φ) = N(φ)cos(φ)
 *
 * For simplicity, this ignores altitude above the ellipsoid (assumes h=0).
 *
 * @param latitudeRad Latitude in radians
 * @returns Radius of the parallel in meters
 */
export function parallelRadius(latitudeRad: number): number {
  return primeVerticalRadius(latitudeRad) * Math.cos(latitudeRad);
}

/**
 * Computes the radius of the parallel at a given latitude in degrees.
 * Convenience wrapper that handles degree-to-radian conversion.
 *
 * @param latitudeDeg Latitude in degrees (-90 to 90)
 * @returns Radius of the parallel in meters
 */
export function parallelRadiusFromDegrees(latitudeDeg: number): number {
  if (latitudeDeg < -90 || latitudeDeg > 90) {
    throw new Error(`Invalid latitude: ${latitudeDeg}. Must be between -90 and 90.`);
  }
  return parallelRadius(degreesToRadians(latitudeDeg));
}

/**
 * Computes the circumference of a latitude circle in meters.
 *
 * @param latitudeDeg Latitude in degrees (-90 to 90)
 * @returns Circumference in meters
 */
export function latitudeCircumference(latitudeDeg: number): number {
  return 2 * Math.PI * parallelRadiusFromDegrees(latitudeDeg);
}
