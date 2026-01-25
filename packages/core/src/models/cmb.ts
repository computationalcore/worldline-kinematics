/**
 * CMB rest frame model.
 * Computes velocity relative to the Cosmic Microwave Background.
 */

import {
  SSB_CMB_VELOCITY_KMS,
  SSB_CMB_VELOCITY_UNCERTAINTY_KMS,
  SSB_CMB_GALACTIC_LONGITUDE_DEG,
  SSB_CMB_GALACTIC_LATITUDE_DEG,
  LOCAL_GROUP_CMB_VELOCITY_KMS,
  LOCAL_GROUP_CMB_VELOCITY_UNCERTAINTY_KMS,
} from '../constants';
import type { CMBReference } from '../frames/types';

/**
 * Solar System Barycenter velocity relative to CMB in km/s.
 * This is derived from the CMB dipole measurement.
 */
export const SSB_VELOCITY_KMS = SSB_CMB_VELOCITY_KMS;

/**
 * Local Group velocity relative to CMB in km/s.
 */
export const LOCAL_GROUP_VELOCITY_KMS = LOCAL_GROUP_CMB_VELOCITY_KMS;

/**
 * Computes distance traveled relative to CMB over a time interval.
 *
 * @param durationSeconds Duration in seconds
 * @param reference Which CMB reference to use (default: SSB)
 * @returns Distance in kilometers
 */
export function cmbDistanceKm(
  durationSeconds: number,
  reference: CMBReference = 'ssb'
): number {
  const velocity = reference === 'ssb' ? SSB_VELOCITY_KMS : LOCAL_GROUP_VELOCITY_KMS;
  return velocity * durationSeconds;
}

/**
 * Returns CMB velocity data for display.
 */
export interface CMBVelocityResult {
  velocityKms: number;
  uncertaintyKms: number;
  reference: CMBReference;
  directionGalacticLongitude: number;
  directionGalacticLatitude: number;
}

/**
 * Computes CMB velocity with metadata.
 *
 * @param reference Which CMB reference to use (default: SSB)
 */
export function computeCMBVelocity(reference: CMBReference = 'ssb'): CMBVelocityResult {
  if (reference === 'ssb') {
    return {
      velocityKms: SSB_VELOCITY_KMS,
      uncertaintyKms: SSB_CMB_VELOCITY_UNCERTAINTY_KMS,
      reference: 'ssb',
      directionGalacticLongitude: SSB_CMB_GALACTIC_LONGITUDE_DEG,
      directionGalacticLatitude: SSB_CMB_GALACTIC_LATITUDE_DEG,
    };
  }

  return {
    velocityKms: LOCAL_GROUP_VELOCITY_KMS,
    uncertaintyKms: LOCAL_GROUP_CMB_VELOCITY_UNCERTAINTY_KMS,
    reference: 'local-group',
    // Local Group direction is different but less precisely measured
    directionGalacticLongitude: 276,
    directionGalacticLatitude: 30,
  };
}
