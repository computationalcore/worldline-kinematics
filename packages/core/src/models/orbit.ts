/**
 * Earth orbit model (heliocentric frame).
 * Computes velocity and distance traveled relative to the Sun.
 */

import { EARTH_ORBITAL_VELOCITY_KMS, EARTH_ORBITAL_ECCENTRICITY } from '../constants';

/**
 * Mean orbital velocity (Tier A: constant approximation).
 * Uses the mean value, ignoring orbital eccentricity variations.
 *
 * For Tier B, use astronomy-engine to compute instantaneous velocity.
 */
export const MEAN_ORBITAL_VELOCITY_KMS = EARTH_ORBITAL_VELOCITY_KMS;

const e = EARTH_ORBITAL_ECCENTRICITY;

/**
 * Orbital velocity at aphelion (farthest from Sun, slowest) in km/s.
 *
 * Derived from vis-viva equation:
 *   v^2 = GM(2/r - 1/a)
 *
 * For an ellipse with semi-major axis a and eccentricity e:
 *   v_aphelion = v_circular * sqrt((1-e)/(1+e))
 *
 * Source: Fundamentals of Astrodynamics (Bate, Mueller, White)
 */
export const APHELION_VELOCITY_KMS =
  EARTH_ORBITAL_VELOCITY_KMS * Math.sqrt((1 - e) / (1 + e));

/**
 * Orbital velocity at perihelion (closest to Sun, fastest) in km/s.
 *
 * Derived from vis-viva equation:
 *   v_perihelion = v_circular * sqrt((1+e)/(1-e))
 *
 * Source: Fundamentals of Astrodynamics (Bate, Mueller, White)
 */
export const PERIHELION_VELOCITY_KMS =
  EARTH_ORBITAL_VELOCITY_KMS * Math.sqrt((1 + e) / (1 - e));

/**
 * @deprecated Use APHELION_VELOCITY_KMS instead
 */
export const MIN_ORBITAL_VELOCITY_KMS = APHELION_VELOCITY_KMS;

/**
 * @deprecated Use PERIHELION_VELOCITY_KMS instead
 */
export const MAX_ORBITAL_VELOCITY_KMS = PERIHELION_VELOCITY_KMS;

/**
 * Computes distance traveled in Earth's orbit over a time interval (Tier A).
 * Uses mean velocity approximation.
 *
 * @param durationSeconds Duration in seconds
 * @returns Distance in kilometers
 */
export function orbitDistanceKm(durationSeconds: number): number {
  return MEAN_ORBITAL_VELOCITY_KMS * durationSeconds;
}

/**
 * Returns orbit velocity data for display.
 */
export interface OrbitVelocityResult {
  meanVelocityKms: number;
  aphelionVelocityKms: number;
  perihelionVelocityKms: number;
  eccentricity: number;
  /** @deprecated Use aphelionVelocityKms */
  minVelocityKms: number;
  /** @deprecated Use perihelionVelocityKms */
  maxVelocityKms: number;
}

/**
 * Computes orbit velocity with metadata.
 * For Tier A, returns mean values.
 * For Tier B, would integrate over the actual orbital position.
 */
export function computeOrbitVelocity(): OrbitVelocityResult {
  return {
    meanVelocityKms: MEAN_ORBITAL_VELOCITY_KMS,
    aphelionVelocityKms: APHELION_VELOCITY_KMS,
    perihelionVelocityKms: PERIHELION_VELOCITY_KMS,
    eccentricity: EARTH_ORBITAL_ECCENTRICITY,
    // Backward compatibility
    minVelocityKms: APHELION_VELOCITY_KMS,
    maxVelocityKms: PERIHELION_VELOCITY_KMS,
  };
}
