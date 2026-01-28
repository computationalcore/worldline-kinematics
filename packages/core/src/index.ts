/**
 * @worldline-kinematics/core
 *
 * Pure TypeScript physics engine for worldline kinematics calculations.
 * Computes observer motion across multiple reference frames.
 *
 * This package has ZERO React dependencies and is fully unit-testable.
 */

// Constants
export * from './constants';

// Geo utilities
export * from './geo/wgs84';
export * from './geo/seasons';

// Lunar utilities
export * from './lunar/phase';

// Time utilities
export * from './time/age';
export * from './time/parse';
export * from './time/timezone';

// Unit conversions
export * from './units/convert';

// Frame types
export * from './frames/types';

// Frame utilities
export * from './frames/uncertainty';

// Models
export * from './models/spin';
export * from './models/orbit';
export * from './models/galaxy';
export * from './models/cmb';

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

import { computeDurationSeconds } from './time/age';
import { parseDateInput } from './time/parse';
import { computeSpinVelocity, spinDistanceKm } from './models/spin';
import { computeOrbitVelocity, orbitDistanceKm } from './models/orbit';
import { computeGalaxyVelocity, galaxyDistanceKm } from './models/galaxy';
import { computeCMBVelocity, cmbDistanceKm } from './models/cmb';
import { isSignificantUncertainty } from './frames/uncertainty';
import type {
  WorldlineState,
  FrameDistance,
  SpinFrameVelocity,
  OrbitFrameVelocity,
  GalaxyFrameVelocity,
  CMBFrameVelocity,
} from './frames/types';

/**
 * Computes the complete worldline state for an observer.
 * This is the main entry point for Tier A calculations.
 *
 * Date-only strings (YYYY-MM-DD) are interpreted as LOCAL NOON to avoid
 * timezone issues where the date could shift backward for users west of UTC.
 *
 * @param birthDate Observer's birth date
 * @param latitudeDeg Observer's latitude in degrees
 * @param targetDate Target date (default: now)
 * @returns Complete worldline state
 */
export function computeWorldlineState(
  birthDate: Date | string,
  latitudeDeg: number,
  targetDate: Date | string = new Date()
): WorldlineState {
  const birth = parseDateInput(birthDate);
  const target = parseDateInput(targetDate);
  const durationSeconds = computeDurationSeconds(birth, target);

  // Compute velocities
  const spinResult = computeSpinVelocity(latitudeDeg);
  const orbitResult = computeOrbitVelocity();
  const galaxyResult = computeGalaxyVelocity();
  const cmbResult = computeCMBVelocity('ssb');

  // Build frame velocities with discriminated union types
  const spinVelocity: SpinFrameVelocity = {
    frame: 'spin',
    velocityKms: spinResult.velocityKms,
    hasSignificantUncertainty: false,
    metadata: {
      latitudeDeg: spinResult.latitudeDeg,
      parallelRadiusKm: spinResult.parallelRadiusKm,
    },
  };

  const orbitVelocity: OrbitFrameVelocity = {
    frame: 'orbit',
    velocityKms: orbitResult.meanVelocityKms,
    hasSignificantUncertainty: false,
    metadata: {
      aphelionVelocityKms: orbitResult.minVelocityKms,
      perihelionVelocityKms: orbitResult.maxVelocityKms,
      eccentricity: orbitResult.eccentricity,
      // Deprecated aliases for backward compatibility
      minVelocityKms: orbitResult.minVelocityKms,
      maxVelocityKms: orbitResult.maxVelocityKms,
    },
  };

  const galaxyVelocity: GalaxyFrameVelocity = {
    frame: 'galaxy',
    velocityKms: galaxyResult.velocityKms,
    uncertaintyKms: galaxyResult.uncertaintyKms,
    hasSignificantUncertainty: isSignificantUncertainty(
      galaxyResult.velocityKms,
      galaxyResult.uncertaintyKms
    ),
    metadata: {
      distanceToGalacticCenterLy: galaxyResult.distanceToGalacticCenterLy,
      orbitalPeriodYears: galaxyResult.orbitalPeriodYears,
    },
  };

  const cmbVelocityFrame: CMBFrameVelocity = {
    frame: 'cmb',
    velocityKms: cmbResult.velocityKms,
    uncertaintyKms: cmbResult.uncertaintyKms,
    hasSignificantUncertainty: isSignificantUncertainty(
      cmbResult.velocityKms,
      cmbResult.uncertaintyKms
    ),
    metadata: {
      reference: cmbResult.reference,
      directionGalacticLongitude: cmbResult.directionGalacticLongitude,
      directionGalacticLatitude: cmbResult.directionGalacticLatitude,
    },
  };

  // Build frame distances with both pathLengthKm and deprecated distanceKm
  const spinPathKm = spinDistanceKm(latitudeDeg, durationSeconds);
  const spinDistance: FrameDistance = {
    frame: 'spin',
    pathLengthKm: spinPathKm,
    distanceKm: spinPathKm, // Deprecated alias
    durationSeconds,
  };

  const orbitPathKm = orbitDistanceKm(durationSeconds);
  const orbitDistance: FrameDistance = {
    frame: 'orbit',
    pathLengthKm: orbitPathKm,
    distanceKm: orbitPathKm, // Deprecated alias
    durationSeconds,
  };

  const galaxyPathKm = galaxyDistanceKm(durationSeconds);
  const galaxyDistance: FrameDistance = {
    frame: 'galaxy',
    pathLengthKm: galaxyPathKm,
    distanceKm: galaxyPathKm, // Deprecated alias
    durationSeconds,
  };

  const cmbPathKm = cmbDistanceKm(durationSeconds);
  const cmbDistance: FrameDistance = {
    frame: 'cmb',
    pathLengthKm: cmbPathKm,
    distanceKm: cmbPathKm, // Deprecated alias
    durationSeconds,
  };

  return {
    timestamp: target,
    birthDate: birth,
    latitudeDeg,
    durationSeconds,
    frames: {
      spin: spinVelocity,
      orbit: orbitVelocity,
      galaxy: galaxyVelocity,
      cmb: cmbVelocityFrame,
    },
    distances: {
      spin: spinDistance,
      orbit: orbitDistance,
      galaxy: galaxyDistance,
      cmb: cmbDistance,
    },
  };
}
