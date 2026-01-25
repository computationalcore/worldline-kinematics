/**
 * Core types for solar system ephemerides and visualization.
 */

// ---------------------------
// Reference Frames
// ---------------------------

/**
 * Coordinate reference frames.
 * - EQJ: J2000 equatorial (Astronomy Engine default)
 * - ECLIPJ2000: J2000 ecliptic (solar system visualization standard)
 * - ICRF: International Celestial Reference Frame (future)
 */
export type Frame = 'EQJ' | 'ECLIPJ2000';

/**
 * Distance units.
 * - AU: Astronomical Units (ephemeris standard)
 * - km: Kilometers (physical properties)
 * - m: Meters (high precision)
 */
export type DistanceUnit = 'AU' | 'km' | 'm';

// ---------------------------
// Body Identifiers
// ---------------------------

/**
 * Planet identifiers (8 major planets).
 */
export type PlanetId =
  | 'Mercury'
  | 'Venus'
  | 'Earth'
  | 'Mars'
  | 'Jupiter'
  | 'Saturn'
  | 'Uranus'
  | 'Neptune';

/**
 * All body identifiers including Sun and Moon.
 */
export type BodyId = PlanetId | 'Sun' | 'Moon';

/**
 * Bodies with ring systems.
 */
export type RingedBodyId = 'Jupiter' | 'Saturn' | 'Uranus' | 'Neptune';

// ---------------------------
// Physical State (Truth Layer)
// ---------------------------

/**
 * 3D vector with explicit numeric type.
 */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/**
 * Physical state vector with frame and unit metadata.
 * This is the "truth layer" - raw data from ephemerides.
 */
export interface StateVectorPhysical {
  /** Coordinate reference frame */
  frame: Frame;
  /** Distance unit */
  unit: DistanceUnit;
  /** Position vector */
  position: Vec3;
  /** Velocity vector (optional, km/s) */
  velocity?: Vec3;
  /** Timestamp of this state */
  epoch: Date;
}

/**
 * Physical properties of a celestial body.
 * All values sourced from authoritative datasets with citations.
 */
export interface BodyPhysicalProps {
  id: BodyId;
  /** Mean radius in km */
  radiusMeanKm: number;
  /** Equatorial radius in km (for oblate bodies) */
  radiusEquatorialKm?: number;
  /** Polar radius in km (for oblate bodies) */
  radiusPolarKm?: number;
  /** Mass in kg */
  massKg: number;
  /** Standard gravitational parameter GM in km^3/s^2 */
  gmKm3s2: number;
  /** Mean density in g/cm^3 */
  densityGcm3?: number;
  /** Sidereal rotation period in hours */
  siderealRotationHours?: number;
  /** Axial tilt (obliquity) in degrees */
  obliquityDeg?: number;
  /** Data source URL */
  source: string;
}

/**
 * Complete physical state of a body at a given epoch.
 */
export interface BodyStatePhysical {
  id: BodyId;
  /** State vector in specified frame */
  state: StateVectorPhysical;
  /** Physical properties */
  props: BodyPhysicalProps;
}

// ---------------------------
// Render State (View Layer)
// ---------------------------

/**
 * Render-ready state for visualization.
 * Positions and sizes are in "scene units" after applying scale mappings.
 */
export interface BodyStateRender {
  id: BodyId;
  /** Position in scene units (post-scaling) */
  position: Vec3;
  /** Distance from focus in scene units */
  distanceScene: number;
  /** Physical distance in AU (for display) */
  distanceAu: number;
  /** Radius in scene units (post-scaling) */
  radiusScene: number;
  /** Color for visualization */
  color: string;
  /** Texture path (optional) */
  texture?: string;
}

// ---------------------------
// Scale Configuration
// ---------------------------

/**
 * Distance scaling modes.
 */
export type DistanceScaleConfig =
  | { kind: 'linear'; auToScene: number }
  | { kind: 'log10'; scale: number; multiplier: number }
  | {
      kind: 'piecewise';
      innerRadiusAu: number;
      innerScale: number;
      outerLogScale: number;
      outerMultiplier: number;
    };

/**
 * Size visualization metrics.
 */
export type SizeMetric = 'radius' | 'diameter' | 'volume' | 'mass';

/**
 * Size scaling modes.
 *
 * IMPORTANT: For physically correct "true scale" visualization, use 'physical' kind
 * where kmToScene = auToScene / AU_KM. This ensures sizes and distances use the
 * same linear scale factor, preserving all geometric relationships.
 *
 * Other modes preserve planet-to-planet size ratios but distort size-to-distance
 * ratios (typically by hundreds of times) for visibility.
 */
export type SizeScaleConfig =
  | {
      /**
       * Physical scale: sizes derived from the same scale as distances.
       * kmToScene MUST equal auToScene / AU_KM for geometric correctness.
       * This is the only scientifically honest "true scale" option.
       */
      kind: 'physical';
      kmToScene: number;
    }
  | { kind: 'realRelativeToSun'; sunRadiusScene: number }
  | { kind: 'realRelativeToMercury'; mercuryRadiusScene: number }
  | { kind: 'normalizedRelativeToJupiter'; jupiterRadiusScene: number }
  | { kind: 'clampedMinimum'; minRadiusScene: number; baseScale: SizeScaleConfig }
  | {
      kind: 'customMetric';
      metric: SizeMetric;
      referenceBody: BodyId;
      referenceRadiusScene: number;
      logCompress?: { scale: number; multiplier: number };
    };

/**
 * Complete render mapping configuration.
 */
export interface RenderMapping {
  distanceScale: DistanceScaleConfig;
  sizeScale: SizeScaleConfig;
}

// ---------------------------
// Ring System Types
// ---------------------------

/**
 * Individual ring component.
 */
export interface RingComponent {
  /** Ring name (e.g., "A Ring", "B Ring", "Cassini Division") */
  name: string;
  /** Inner radius in km from planet center */
  innerRadiusKm: number;
  /** Outer radius in km from planet center */
  outerRadiusKm: number;
  /** Optical depth (0 = transparent, >1 = opaque) */
  opticalDepth?: number;
  /** Data source URL */
  source: string;
}

/**
 * Complete ring system for a planet.
 */
export interface RingSystem {
  bodyId: RingedBodyId;
  /** All ring components, ordered from innermost to outermost */
  components: RingComponent[];
  /** Ring plane inclination relative to ecliptic (derived from planet obliquity) */
  inclination?: number;
}

// ---------------------------
// Belt Types
// ---------------------------

/**
 * Asteroid/debris belt definition.
 */
export interface BeltDefinition {
  /** Belt identifier */
  name: string;
  /** Inner boundary in AU */
  innerRadiusAu: number;
  /** Outer boundary in AU */
  outerRadiusAu: number;
  /** Vertical thickness in AU (above/below ecliptic) */
  thicknessAu: number;
  /** Typical orbital inclination distribution (degrees, 1-sigma) */
  inclinationSpreadDeg: number;
  /** Data source URL */
  source: string;
}

// ---------------------------
// Solar System Snapshot
// ---------------------------

/**
 * Complete solar system state at a given epoch.
 */
export interface SolarSystemStatePhysical {
  epoch: Date;
  frame: Frame;
  bodies: BodyStatePhysical[];
}

/**
 * Render-ready solar system state.
 */
export interface SolarSystemStateRender {
  epoch: Date;
  bodies: BodyStateRender[];
  mapping: RenderMapping;
}

// ---------------------------
// Ephemeris Provider Interface
// ---------------------------

/**
 * Interface for ephemeris providers.
 * Enables swapping between Astronomy Engine, SPICE, Horizons, etc.
 */
export interface EphemerisProvider {
  /** Provider name for debugging/UI */
  name: string;

  /** Get heliocentric state for a body */
  getHeliocentricState(body: BodyId, epoch: Date, frame: Frame): StateVectorPhysical;

  /** Get geocentric state (for Moon, satellites) */
  getGeocentricState(body: BodyId, epoch: Date, frame: Frame): StateVectorPhysical;

  /** Get planet axis orientation (for ring planes) */
  getAxisOrientation?(
    body: BodyId,
    epoch: Date
  ): { northPole: Vec3; rotationAngleDeg: number };
}

// ---------------------------
// Camera Semantic Zoom
// ---------------------------

/**
 * Camera state in semantic units.
 * Zoom is defined relative to target body radius, not raw scene units.
 */
export interface CameraSemanticState {
  /** Target body being focused on */
  targetId: BodyId;
  /** Distance from target in "planetary radii" units */
  zoomRadii: number;
  /** Azimuthal angle (horizontal rotation) in radians */
  azimuth: number;
  /** Polar angle (vertical inclination) in radians */
  polar: number;
  /** Pan offset from target center (in scene units) */
  panOffset?: Vec3;
}
