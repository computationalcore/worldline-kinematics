/**
 * Reference frame types and interfaces.
 */

/**
 * Supported reference frames (modes).
 */
export type ReferenceFrame = 'spin' | 'orbit' | 'galaxy' | 'cmb';

/**
 * Frame metadata for UI display.
 */
export interface FrameInfo {
  id: ReferenceFrame;
  name: string;
  shortName: string;
  description: string;
  relativeTo: string;
}

/**
 * Frame definitions with display metadata.
 */
export const FRAME_INFO: Record<ReferenceFrame, FrameInfo> = {
  spin: {
    id: 'spin',
    name: 'Earth Rotation',
    shortName: 'Spin',
    description: 'Your speed due to Earth rotating on its axis',
    relativeTo: 'Earth surface (inertial frame)',
  },
  orbit: {
    id: 'orbit',
    name: 'Heliocentric Orbit',
    shortName: 'Orbit',
    description: 'Your speed as Earth orbits the Sun',
    relativeTo: 'Sun (heliocentric frame)',
  },
  galaxy: {
    id: 'galaxy',
    name: 'Galactic Orbit',
    shortName: 'Galaxy',
    description: 'Your speed as the Solar System orbits the Milky Way',
    relativeTo: 'Milky Way center (galactocentric frame)',
  },
  cmb: {
    id: 'cmb',
    name: 'CMB Rest Frame',
    shortName: 'CMB',
    description: 'Your speed relative to the cosmic background radiation',
    relativeTo: 'Cosmic Microwave Background rest frame',
  },
};

// =============================================================================
// FRAME-SPECIFIC METADATA TYPES
// =============================================================================

/**
 * Metadata for the spin (Earth rotation) frame.
 */
export interface SpinMetadata {
  latitudeDeg: number;
  parallelRadiusKm: number;
}

/**
 * Metadata for the orbit (heliocentric) frame.
 */
export interface OrbitMetadata {
  aphelionVelocityKms: number;
  perihelionVelocityKms: number;
  eccentricity: number;
  /** @deprecated Use aphelionVelocityKms */
  minVelocityKms: number;
  /** @deprecated Use perihelionVelocityKms */
  maxVelocityKms: number;
}

/**
 * Metadata for the galaxy (galactocentric) frame.
 */
export interface GalaxyMetadata {
  distanceToGalacticCenterLy: number;
  orbitalPeriodYears: number;
}

/**
 * CMB reference type.
 * - 'ssb': Solar System Barycenter (most relevant for individual observers)
 * - 'local-group': Local Group of galaxies (larger scale)
 */
export type CMBReference = 'ssb' | 'local-group';

/**
 * Metadata for the CMB rest frame.
 */
export interface CMBMetadata {
  reference: CMBReference;
  directionGalacticLongitude: number;
  directionGalacticLatitude: number;
}

// =============================================================================
// DISCRIMINATED UNION FRAME VELOCITY TYPE
// =============================================================================

/**
 * Spin frame velocity result.
 */
export interface SpinFrameVelocity {
  frame: 'spin';
  velocityKms: number;
  hasSignificantUncertainty: boolean;
  uncertaintyKms?: number;
  metadata: SpinMetadata;
}

/**
 * Orbit frame velocity result.
 */
export interface OrbitFrameVelocity {
  frame: 'orbit';
  velocityKms: number;
  hasSignificantUncertainty: boolean;
  uncertaintyKms?: number;
  metadata: OrbitMetadata;
}

/**
 * Galaxy frame velocity result.
 * Uncertainty is always present due to astrophysical measurement limits.
 */
export interface GalaxyFrameVelocity {
  frame: 'galaxy';
  velocityKms: number;
  hasSignificantUncertainty: boolean;
  uncertaintyKms: number;
  metadata: GalaxyMetadata;
}

/**
 * CMB frame velocity result.
 * Uncertainty is always present from CMB dipole measurements.
 */
export interface CMBFrameVelocity {
  frame: 'cmb';
  velocityKms: number;
  hasSignificantUncertainty: boolean;
  uncertaintyKms: number;
  metadata: CMBMetadata;
}

/**
 * Discriminated union of frame velocity results.
 * The `frame` property serves as the discriminant.
 */
export type FrameVelocity =
  | SpinFrameVelocity
  | OrbitFrameVelocity
  | GalaxyFrameVelocity
  | CMBFrameVelocity;

// =============================================================================
// FRAME DISTANCE TYPE
// =============================================================================

/**
 * Distance result from a frame computation.
 */
export interface FrameDistance {
  frame: ReferenceFrame;
  /** Path length (arc length) traveled in this frame, in km */
  pathLengthKm: number;
  /** @deprecated Use pathLengthKm */
  distanceKm: number;
  durationSeconds: number;
}

// =============================================================================
// WORLDLINE STATE
// =============================================================================

/**
 * Complete worldline state at a point in time.
 */
export interface WorldlineState {
  timestamp: Date;
  birthDate: Date;
  latitudeDeg: number;
  durationSeconds: number;
  frames: {
    spin: SpinFrameVelocity;
    orbit: OrbitFrameVelocity;
    galaxy: GalaxyFrameVelocity;
    cmb: CMBFrameVelocity;
  };
  distances: {
    spin: FrameDistance;
    orbit: FrameDistance;
    galaxy: FrameDistance;
    cmb: FrameDistance;
  };
}
