/**
 * Ephemeris provider interface with Astronomy Engine backend.
 */

import * as Astronomy from 'astronomy-engine';
import type {
  BodyId,
  EphemerisProvider,
  Frame,
  StateVectorPhysical,
  Vec3,
  PlanetId,
  BodyStateRender,
  RenderMapping,
} from '../types';
import {
  vec3FromAstronomyVector,
  rotateEqjToEcl,
  eclToThreeJs,
  magnitude,
  normalize,
  scale,
} from '../frames/transforms';
import { BODY_PHYSICAL, BODY_VISUAL } from '../data/physical';

/**
 * Body orientation data at a specific epoch.
 *
 * Provides deterministic orientation computation for rendering body rotation
 * and ring plane orientations. Uses IAU rotation models.
 */
export interface BodyOrientation {
  /** North pole direction in scene coordinates (unit vector) */
  northPole: Vec3;
  /** Prime meridian rotation angle at epoch in degrees */
  rotationAngleDeg: number;
  /** Sidereal rotation period in hours (negative for retrograde) */
  siderealPeriodHours: number;
}

/**
 * Map our BodyId to Astronomy Engine Body enum.
 */
const BODY_MAP: Record<BodyId, Astronomy.Body | null> = {
  Sun: Astronomy.Body.Sun,
  Mercury: Astronomy.Body.Mercury,
  Venus: Astronomy.Body.Venus,
  Earth: Astronomy.Body.Earth,
  Moon: Astronomy.Body.Moon,
  Mars: Astronomy.Body.Mars,
  Jupiter: Astronomy.Body.Jupiter,
  Saturn: Astronomy.Body.Saturn,
  Uranus: Astronomy.Body.Uranus,
  Neptune: Astronomy.Body.Neptune,
};

/**
 * Planet IDs for iteration.
 */
export const PLANET_IDS: PlanetId[] = [
  'Mercury',
  'Venus',
  'Earth',
  'Mars',
  'Jupiter',
  'Saturn',
  'Uranus',
  'Neptune',
];

/**
 * Astronomy Engine ephemeris provider.
 *
 * Accuracy: Typically within a few arcseconds for planets.
 * Reference: https://github.com/cosinekitty/astronomy
 */
export class AstronomyEngineProvider implements EphemerisProvider {
  name = 'Astronomy Engine';

  /**
   * Get heliocentric state for a body.
   * Returns position in AU in the specified frame.
   */
  getHeliocentricState(body: BodyId, epoch: Date, frame: Frame): StateVectorPhysical {
    const astroBody = BODY_MAP[body];
    if (astroBody === null) {
      throw new Error(`Body ${body} not supported for heliocentric state`);
    }

    const time = Astronomy.MakeTime(epoch);

    // Sun is at origin in heliocentric frame
    if (body === 'Sun') {
      return {
        frame,
        unit: 'AU',
        position: { x: 0, y: 0, z: 0 },
        epoch,
      };
    }

    // Get heliocentric vector (returns EQJ by default)
    const vecEqj = Astronomy.HelioVector(astroBody, time);

    let position: Vec3;
    if (frame === 'ECLIPJ2000') {
      const vecEcl = rotateEqjToEcl(vecEqj);
      position = vec3FromAstronomyVector(vecEcl);
    } else {
      position = vec3FromAstronomyVector(vecEqj);
    }

    return {
      frame,
      unit: 'AU',
      position,
      epoch,
    };
  }

  /**
   * Get geocentric state for a body (relative to Earth).
   * Used for Moon and satellites.
   */
  getGeocentricState(body: BodyId, epoch: Date, frame: Frame): StateVectorPhysical {
    const astroBody = BODY_MAP[body];
    if (astroBody === null) {
      throw new Error(`Body ${body} not supported for geocentric state`);
    }

    const time = Astronomy.MakeTime(epoch);

    // Get geocentric vector
    const vecEqj = Astronomy.GeoVector(astroBody, time, false);

    let position: Vec3;
    if (frame === 'ECLIPJ2000') {
      const vecEcl = rotateEqjToEcl(vecEqj);
      position = vec3FromAstronomyVector(vecEcl);
    } else {
      position = vec3FromAstronomyVector(vecEqj);
    }

    return {
      frame,
      unit: 'AU',
      position,
      epoch,
    };
  }

  /**
   * Get planet axis orientation (north pole direction).
   * Uses IAU rotation models via Astronomy Engine.
   */
  getAxisOrientation(
    body: BodyId,
    epoch: Date
  ): { northPole: Vec3; rotationAngleDeg: number } {
    const astroBody = BODY_MAP[body];
    if (astroBody === null || body === 'Sun') {
      return { northPole: { x: 0, y: 0, z: 1 }, rotationAngleDeg: 0 };
    }

    const time = Astronomy.MakeTime(epoch);

    try {
      const axis = Astronomy.RotationAxis(astroBody, time);
      // axis.north is in EQJ, convert to ECL
      const northEcl = rotateEqjToEcl(
        new Astronomy.Vector(axis.north.x, axis.north.y, axis.north.z, time)
      );
      return {
        northPole: vec3FromAstronomyVector(northEcl),
        rotationAngleDeg: axis.spin,
      };
    } catch {
      // Fallback for bodies without rotation axis data
      return { northPole: { x: 0, y: 0, z: 1 }, rotationAngleDeg: 0 };
    }
  }

  /**
   * Get complete body orientation at a given epoch.
   *
   * Returns north pole direction in scene coordinates (Three.js convention),
   * rotation angle using IAU-style computation: W = W0 + Wdot * d,
   * where d is Julian days since J2000.0 (January 1, 2000, 12:00 TT).
   *
   * @param bodyId Body identifier
   * @param epoch Date/time for orientation computation
   * @returns Complete body orientation data
   */
  getBodyOrientation(bodyId: BodyId, epoch: Date): BodyOrientation {
    const physicalData = BODY_PHYSICAL[bodyId];
    const siderealPeriodHours = physicalData.siderealRotationHours ?? 0;

    // For Sun, use a simplified model based on its obliquity
    if (bodyId === 'Sun') {
      const obliquityRad = ((physicalData.obliquityDeg ?? 0) * Math.PI) / 180;
      // Sun's north pole is tilted from ecliptic north by its obliquity
      const northEcl: Vec3 = {
        x: 0,
        y: Math.sin(obliquityRad),
        z: Math.cos(obliquityRad),
      };
      const northScene = eclToThreeJs(normalize(northEcl));

      // Compute rotation angle: W = W0 + Wdot * d
      const julianDaysSinceJ2000 = this.computeJulianDaysSinceJ2000(epoch);
      const rotationRateDegPerDay = (360 / Math.abs(siderealPeriodHours)) * 24;
      const rotationAngleDeg = (rotationRateDegPerDay * julianDaysSinceJ2000) % 360;

      return {
        northPole: northScene,
        rotationAngleDeg:
          rotationAngleDeg >= 0 ? rotationAngleDeg : rotationAngleDeg + 360,
        siderealPeriodHours,
      };
    }

    const astroBody = BODY_MAP[bodyId];

    // For bodies without Astronomy Engine support, use physical data
    if (astroBody === null) {
      return this.computeOrientationFromPhysicalData(bodyId, epoch);
    }

    const time = Astronomy.MakeTime(epoch);

    try {
      const axis = Astronomy.RotationAxis(astroBody, time);

      // Convert north pole from EQJ to ECL, then to scene coordinates
      const northEqj = new Astronomy.Vector(
        axis.north.x,
        axis.north.y,
        axis.north.z,
        time
      );
      const northEcl = rotateEqjToEcl(northEqj);
      const northEclVec3 = vec3FromAstronomyVector(northEcl);
      const northScene = eclToThreeJs(normalize(northEclVec3));

      // For Earth, compute rotation angle using GMST-based approach for reliability.
      // The IAU W angle relates to GMST by: W = GMST - 90° (for Earth's pole at α≈0°).
      // This is more explicit and testable than the direct IAU formula.
      let rotationAngleDeg: number;
      if (bodyId === 'Earth') {
        rotationAngleDeg = this.computeEarthWdeg(epoch);
      } else {
        // For other planets, use Astronomy Engine's spin value
        rotationAngleDeg = axis.spin % 360;
        if (rotationAngleDeg < 0) {
          rotationAngleDeg += 360;
        }
      }

      return {
        northPole: northScene,
        rotationAngleDeg,
        siderealPeriodHours,
      };
    } catch {
      // Fallback to physical data computation
      return this.computeOrientationFromPhysicalData(bodyId, epoch);
    }
  }

  /**
   * Compute Julian days since J2000.0 epoch.
   * J2000.0 = January 1, 2000, 12:00 UTC for practical purposes.
   *
   * Note: Astronomically, J2000.0 is 12:00 TT (~11:58:55.816 UTC), but for
   * visualization purposes we use 12:00 UTC which is simpler and the ~64 second
   * difference is negligible for rendering.
   *
   * @param date Date to compute from
   * @returns Days since J2000.0 (can be negative for dates before J2000.0)
   */
  private computeJulianDaysSinceJ2000(date: Date): number {
    // J2000.0 in milliseconds since Unix epoch (2000-01-01 12:00:00 UTC)
    const J2000_MS = Date.UTC(2000, 0, 1, 12, 0, 0);
    const MS_PER_DAY = 86400000;
    return (date.getTime() - J2000_MS) / MS_PER_DAY;
  }

  /**
   * Normalize angle to [0, 360) range.
   */
  private normalizeDeg(deg: number): number {
    deg = deg % 360;
    return deg < 0 ? deg + 360 : deg;
  }

  /**
   * Compute Greenwich Mean Sidereal Time in degrees.
   *
   * Uses the standard GMST formula from the US Naval Observatory.
   * Source: https://aa.usno.navy.mil/faq/GAST
   *
   * @param date Date/time for GMST computation
   * @returns GMST in degrees [0, 360)
   */
  private computeGmstDeg(date: Date): number {
    const d = this.computeJulianDaysSinceJ2000(date);
    const T = d / 36525.0; // Julian centuries since J2000

    // GMST formula (degrees)
    const gmst =
      280.46061837 + 360.98564736629 * d + 0.000387933 * T * T - (T * T * T) / 38710000.0;

    return this.normalizeDeg(gmst);
  }

  /**
   * Compute Earth's IAU W angle (prime meridian rotation).
   *
   * For Earth, the relationship is: W = GMST - 90°
   * This is because the IAU reference direction is at RA = 90° (for Earth's pole at α≈0°).
   *
   * @param date Date/time for computation
   * @returns W angle in degrees [0, 360)
   */
  private computeEarthWdeg(date: Date): number {
    const gmst = this.computeGmstDeg(date);
    return this.normalizeDeg(gmst - 90);
  }

  /**
   * Compute body orientation from physical data when Astronomy Engine data is unavailable.
   * Uses obliquity and sidereal period to compute approximate orientation.
   *
   * @param bodyId Body identifier
   * @param epoch Date/time for orientation computation
   * @returns Body orientation computed from physical constants
   */
  private computeOrientationFromPhysicalData(
    bodyId: BodyId,
    epoch: Date
  ): BodyOrientation {
    const physicalData = BODY_PHYSICAL[bodyId];
    const obliquityDeg = physicalData.obliquityDeg ?? 0;
    const siderealPeriodHours = physicalData.siderealRotationHours ?? 0;

    // Convert obliquity to radians
    const obliquityRad = (obliquityDeg * Math.PI) / 180;

    // Compute north pole direction in ecliptic coordinates
    // The pole is tilted from the ecliptic north pole by the obliquity
    // For bodies with obliquity > 90 (Venus, Uranus), the pole is "south-pointing"
    // but we define north as the direction of angular momentum
    let northEcl: Vec3;
    if (obliquityDeg > 90) {
      // Retrograde rotation: north pole points "downward" in ecliptic frame
      const effectiveObliquity = ((180 - obliquityDeg) * Math.PI) / 180;
      northEcl = {
        x: 0,
        y: Math.sin(effectiveObliquity),
        z: -Math.cos(effectiveObliquity),
      };
    } else {
      northEcl = {
        x: 0,
        y: Math.sin(obliquityRad),
        z: Math.cos(obliquityRad),
      };
    }

    const northScene = eclToThreeJs(normalize(northEcl));

    // Compute rotation angle: W = W0 + Wdot * d
    // W0 is unknown without detailed IAU data, so we use 0 as reference
    // Wdot = 360 / period (degrees per day)
    const julianDaysSinceJ2000 = this.computeJulianDaysSinceJ2000(epoch);

    let rotationAngleDeg = 0;
    if (siderealPeriodHours !== 0) {
      const rotationRateDegPerDay = (360 / Math.abs(siderealPeriodHours)) * 24;
      rotationAngleDeg = (rotationRateDegPerDay * julianDaysSinceJ2000) % 360;
      // Normalize to [0, 360)
      if (rotationAngleDeg < 0) {
        rotationAngleDeg += 360;
      }
    }

    return {
      northPole: northScene,
      rotationAngleDeg,
      siderealPeriodHours,
    };
  }
}

/**
 * Default ephemeris provider instance.
 */
export const defaultProvider = new AstronomyEngineProvider();

/**
 * Get all planet positions at a given epoch.
 * Returns positions in ECLIPJ2000 frame in AU.
 */
export function getPlanetPositions(
  epoch: Date = new Date(),
  provider: EphemerisProvider = defaultProvider
): Map<PlanetId, StateVectorPhysical> {
  const positions = new Map<PlanetId, StateVectorPhysical>();

  for (const planetId of PLANET_IDS) {
    positions.set(planetId, provider.getHeliocentricState(planetId, epoch, 'ECLIPJ2000'));
  }

  return positions;
}

/**
 * Get Moon position relative to Earth.
 */
export function getMoonPosition(
  epoch: Date = new Date(),
  provider: EphemerisProvider = defaultProvider
): StateVectorPhysical {
  return provider.getGeocentricState('Moon', epoch, 'ECLIPJ2000');
}

/**
 * Apply distance scaling to a position.
 */
function scaleDistance(
  distanceAu: number,
  config: RenderMapping['distanceScale']
): number {
  switch (config.kind) {
    case 'linear':
      return distanceAu * config.auToScene;
    case 'log10': {
      const sign = distanceAu >= 0 ? 1 : -1;
      return (
        sign * Math.log10(1 + Math.abs(distanceAu) * config.scale) * config.multiplier
      );
    }
    case 'piecewise': {
      if (distanceAu <= config.innerRadiusAu) {
        return distanceAu * config.innerScale;
      }
      const innerScaled = config.innerRadiusAu * config.innerScale;
      const outerPart = distanceAu - config.innerRadiusAu;
      return (
        innerScaled +
        Math.log10(1 + outerPart * config.outerLogScale) * config.outerMultiplier
      );
    }
  }
}

/**
 * Apply size scaling to get radius in scene units.
 */
function scaleSize(bodyId: BodyId, config: RenderMapping['sizeScale']): number {
  const body = BODY_PHYSICAL[bodyId];
  if (!body) return 0.01;

  switch (config.kind) {
    case 'physical': {
      // Physical scale: radius derived from the same scale as distances.
      // This is the only geometrically correct option for "true scale".
      // kmToScene MUST equal auToScene / AU_KM for correctness.
      return body.radiusMeanKm * config.kmToScene;
    }
    case 'realRelativeToSun': {
      const sunRadius = BODY_PHYSICAL.Sun.radiusMeanKm;
      return config.sunRadiusScene * (body.radiusMeanKm / sunRadius);
    }
    case 'realRelativeToMercury': {
      // Mercury is the baseline - smallest planet gets the base size
      // All others scaled by their true radius ratio to Mercury
      // WARNING: This distorts size-to-distance ratio by ~400x
      const mercuryRadius = BODY_PHYSICAL.Mercury.radiusMeanKm;
      return config.mercuryRadiusScene * (body.radiusMeanKm / mercuryRadius);
    }
    case 'normalizedRelativeToJupiter': {
      const jupiterRadius = BODY_PHYSICAL.Jupiter.radiusMeanKm;
      let size = config.jupiterRadiusScene * (body.radiusMeanKm / jupiterRadius);
      // In school models, the Sun is typically shown much smaller than true scale
      // True ratio is ~10x Jupiter, but we reduce to ~3x for better visualization
      if (bodyId === 'Sun') {
        size *= 0.3; // Reduce Sun to about 3x Jupiter instead of 10x
      }
      return size;
    }
    case 'clampedMinimum': {
      const baseSize = scaleSize(bodyId, config.baseScale);
      return Math.max(baseSize, config.minRadiusScene);
    }
    case 'customMetric': {
      const ref = BODY_PHYSICAL[config.referenceBody];
      if (!ref) return config.referenceRadiusScene;

      let value: number;
      let refValue: number;

      switch (config.metric) {
        case 'radius':
          value = body.radiusMeanKm;
          refValue = ref.radiusMeanKm;
          break;
        case 'diameter':
          value = body.radiusMeanKm * 2;
          refValue = ref.radiusMeanKm * 2;
          break;
        case 'volume':
          value = (4 / 3) * Math.PI * Math.pow(body.radiusMeanKm, 3);
          refValue = (4 / 3) * Math.PI * Math.pow(ref.radiusMeanKm, 3);
          break;
        case 'mass':
          value = body.massKg;
          refValue = ref.massKg;
          break;
      }

      const ratio = value / refValue;
      // For volume/mass, take cube root to map to radius
      const exponent = config.metric === 'volume' || config.metric === 'mass' ? 1 / 3 : 1;
      let radiusRatio = Math.pow(ratio, exponent);

      if (config.logCompress) {
        radiusRatio =
          Math.log10(1 + radiusRatio * config.logCompress.scale) *
          config.logCompress.multiplier;
      }

      return config.referenceRadiusScene * radiusRatio;
    }
  }
}

/**
 * Check if the mapping requires size-based distance offset.
 *
 * When using exaggerated sizes (realRelativeToMercury/Sun) with compressed distances (log),
 * planets can end up inside the Sun or each other because the log-compressed spacing
 * is smaller than the sum of adjacent planet radii.
 */
function needsSizeBasedOffset(mapping: RenderMapping): boolean {
  const hasExaggeratedSizes =
    mapping.sizeScale.kind === 'realRelativeToMercury' ||
    mapping.sizeScale.kind === 'realRelativeToSun';
  const hasCompressedDistances =
    mapping.distanceScale.kind === 'log10' || mapping.distanceScale.kind === 'piecewise';

  return hasExaggeratedSizes && hasCompressedDistances;
}

/**
 * Get render-ready solar system state.
 * Converts physical positions to scene coordinates with scaling.
 * Includes Sun + all 8 planets.
 *
 * For True Sizes mode (exaggerated sizes + compressed distances):
 *   orbit = previousOrbit + previousRadius + myRadius + gap
 *   gap = myLogDistance - previousLogDistance
 */
export function getSolarSystemRender(
  epoch: Date = new Date(),
  mapping: RenderMapping,
  provider: EphemerisProvider = defaultProvider
): BodyStateRender[] {
  const results: BodyStateRender[] = [];

  const sunRadiusScene = scaleSize('Sun', mapping.sizeScale);
  results.push({
    id: 'Sun',
    position: { x: 0, y: 0, z: 0 },
    distanceScene: 0,
    distanceAu: 0,
    radiusScene: sunRadiusScene,
    color: BODY_VISUAL.Sun.color,
    texture: BODY_VISUAL.Sun.texture,
  });

  const useSizeOffset = needsSizeBasedOffset(mapping);

  let prevOrbit = 0;
  let prevRadius = sunRadiusScene;
  let prevLogDist = 0;

  for (const planetId of PLANET_IDS) {
    const state = provider.getHeliocentricState(planetId, epoch, 'ECLIPJ2000');
    const distanceAu = magnitude(state.position);
    const logDist = scaleDistance(distanceAu, mapping.distanceScale);
    const radius = scaleSize(planetId, mapping.sizeScale);

    let distanceScene: number;

    if (useSizeOffset) {
      const gap = logDist - prevLogDist;
      distanceScene = prevOrbit + prevRadius + radius + gap;

      prevOrbit = distanceScene;
      prevRadius = radius;
      prevLogDist = logDist;
    } else {
      distanceScene = logDist;
    }

    const dir = distanceAu > 0 ? normalize(state.position) : { x: 0, y: 0, z: 0 };
    const positionThree = eclToThreeJs(scale(dir, distanceScene));
    const visual = BODY_VISUAL[planetId];

    results.push({
      id: planetId,
      position: positionThree,
      distanceScene,
      distanceAu,
      radiusScene: radius,
      color: visual.color,
      texture: visual.texture,
    });
  }

  return results;
}

/**
 * Minimum Moon distance multiplier relative to Earth radius.
 * Physical ratio is ~60:1, but for non-physical presets we ensure
 * the Moon is at least 3x Earth radius away for visual clarity.
 */
const MIN_MOON_EARTH_RADIUS_RATIO = 3;

/**
 * Get Moon render state relative to Earth.
 *
 * For non-physical scale presets (log, piecewise), the Moon distance is
 * enforced to be at least MIN_MOON_EARTH_RADIUS_RATIO * Earth's radius
 * to prevent the Moon from appearing inside or touching Earth.
 */
export function getMoonRender(
  earthPosition: Vec3,
  epoch: Date,
  mapping: RenderMapping,
  provider: EphemerisProvider = defaultProvider
): BodyStateRender {
  const moonGeo = provider.getGeocentricState('Moon', epoch, 'ECLIPJ2000');
  const distanceAu = magnitude(moonGeo.position);
  let distanceScene = scaleDistance(distanceAu, mapping.distanceScale);

  // For non-physical scales, ensure Moon is visually outside Earth
  // The log/piecewise scales can crush Moon-Earth distance to nearly zero
  if (mapping.distanceScale.kind !== 'linear' || mapping.sizeScale.kind !== 'physical') {
    const earthRadiusScene = scaleSize('Earth', mapping.sizeScale);
    const moonRadiusScene = scaleSize('Moon', mapping.sizeScale);
    const minDistance =
      (earthRadiusScene + moonRadiusScene) * MIN_MOON_EARTH_RADIUS_RATIO;
    distanceScene = Math.max(distanceScene, minDistance);
  }

  // Scale Moon position relative to Earth
  const dir = distanceAu > 0 ? normalize(moonGeo.position) : { x: 0, y: 0, z: 0 };
  const scaledEcl = scale(dir, distanceScene);
  const moonOffset = eclToThreeJs(scaledEcl);

  const radiusScene = scaleSize('Moon', mapping.sizeScale);
  const visual = BODY_VISUAL.Moon;

  return {
    id: 'Moon',
    position: {
      x: earthPosition.x + moonOffset.x,
      y: earthPosition.y + moonOffset.y,
      z: earthPosition.z + moonOffset.z,
    },
    distanceScene,
    distanceAu,
    radiusScene,
    color: visual.color,
    texture: visual.texture,
  };
}

/**
 * Get Moon phase (0 = new moon, 0.5 = full moon, 1 = new moon again).
 */
export function getMoonPhase(epoch: Date = new Date()): number {
  const time = Astronomy.MakeTime(epoch);
  const phase = Astronomy.MoonPhase(time);
  return phase / 360; // Convert to 0-1 range
}
