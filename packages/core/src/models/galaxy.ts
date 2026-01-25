/**
 * Galactic orbit model.
 * Computes velocity and distance relative to the Milky Way center.
 */

import {
  SOLAR_GALACTIC_VELOCITY_KMS,
  SOLAR_GALACTIC_VELOCITY_UNCERTAINTY_KMS,
  SUN_GALACTIC_CENTER_DISTANCE_LY,
  GALACTIC_ORBITAL_PERIOD_YEARS,
} from '../constants';

/**
 * Solar System velocity around galactic center in km/s.
 * This is a canonical value with significant astrophysical uncertainty.
 */
export const GALACTIC_VELOCITY_KMS = SOLAR_GALACTIC_VELOCITY_KMS;

/**
 * Computes distance traveled in galactic orbit over a time interval.
 *
 * @param durationSeconds Duration in seconds
 * @returns Distance in kilometers
 */
export function galaxyDistanceKm(durationSeconds: number): number {
  return GALACTIC_VELOCITY_KMS * durationSeconds;
}

/**
 * Returns galactic velocity data for display.
 */
export interface GalaxyVelocityResult {
  velocityKms: number;
  uncertaintyKms: number;
  distanceToGalacticCenterLy: number;
  orbitalPeriodYears: number;
  hasSignificantUncertainty: boolean;
}

/**
 * Computes galactic velocity with metadata.
 * Includes uncertainty flag for UI display.
 */
export function computeGalaxyVelocity(): GalaxyVelocityResult {
  return {
    velocityKms: GALACTIC_VELOCITY_KMS,
    uncertaintyKms: SOLAR_GALACTIC_VELOCITY_UNCERTAINTY_KMS,
    distanceToGalacticCenterLy: SUN_GALACTIC_CENTER_DISTANCE_LY,
    orbitalPeriodYears: GALACTIC_ORBITAL_PERIOD_YEARS,
    hasSignificantUncertainty: true,
  };
}
