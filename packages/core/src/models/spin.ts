/**
 * Earth rotation (spin) model.
 * Computes the tangential velocity of a point on Earth's surface due to rotation.
 */

import { SIDEREAL_DAY_SECONDS } from '../constants';
import { parallelRadiusFromDegrees } from '../geo/wgs84';

/**
 * Earth's angular velocity in radians per second.
 * Derived from the sidereal day period.
 */
export const EARTH_ANGULAR_VELOCITY_RAD_S = (2 * Math.PI) / SIDEREAL_DAY_SECONDS;

/**
 * Computes the tangential (spin) velocity at a given latitude in m/s.
 * This is how fast you're moving due to Earth's rotation.
 *
 * Formula: v = ω × r(φ)
 *
 * @param latitudeDeg Latitude in degrees (-90 to 90)
 * @returns Tangential velocity in meters per second
 */
export function spinVelocityMs(latitudeDeg: number): number {
  const radiusM = parallelRadiusFromDegrees(latitudeDeg);
  return EARTH_ANGULAR_VELOCITY_RAD_S * radiusM;
}

/**
 * Computes the tangential (spin) velocity at a given latitude in km/s.
 *
 * @param latitudeDeg Latitude in degrees (-90 to 90)
 * @returns Tangential velocity in km/s
 */
export function spinVelocityKms(latitudeDeg: number): number {
  return spinVelocityMs(latitudeDeg) / 1000;
}

/**
 * Computes the distance traveled due to Earth's rotation over a time interval.
 * This is the arc length traced on the latitude circle.
 *
 * @param latitudeDeg Latitude in degrees (-90 to 90)
 * @param durationSeconds Duration in seconds
 * @returns Distance in kilometers
 */
export function spinDistanceKm(latitudeDeg: number, durationSeconds: number): number {
  const velocityKms = spinVelocityKms(latitudeDeg);
  return velocityKms * durationSeconds;
}

/**
 * Returns spin velocity data for display.
 */
export interface SpinVelocityResult {
  velocityKms: number;
  velocityMs: number;
  latitudeDeg: number;
  parallelRadiusKm: number;
}

/**
 * Computes spin velocity with all relevant metadata.
 *
 * @param latitudeDeg Latitude in degrees (-90 to 90)
 * @returns Spin velocity result with metadata
 */
export function computeSpinVelocity(latitudeDeg: number): SpinVelocityResult {
  const parallelRadiusM = parallelRadiusFromDegrees(latitudeDeg);
  const velocityMs = EARTH_ANGULAR_VELOCITY_RAD_S * parallelRadiusM;

  return {
    velocityKms: velocityMs / 1000,
    velocityMs,
    latitudeDeg,
    parallelRadiusKm: parallelRadiusM / 1000,
  };
}
