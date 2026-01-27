/**
 * Backward compatibility layer for planetaryPositions.
 *
 * This file re-exports from @worldline-kinematics/astro with the old API.
 * Gradually migrate Scene.tsx to use the new package directly.
 */

import {
  getSolarSystemRender,
  getMoonRender,
  getMoonPhase,
  createMappingFromSimple,
  getPreset,
  RENDER_PRESETS,
  BODY_PHYSICAL,
  BODY_VISUAL,
  SEMI_MAJOR_AXIS_AU,
  ORBITAL_INCLINATION_DEG,
  defaultProvider,
  type BodyId,
  type PlanetId,
  type SimpleDistanceScale,
  type SimpleSizeScale,
  type PresetName,
  type RenderMapping,
} from '@worldline-kinematics/astro';

// Re-export types
export type {
  SimpleDistanceScale as DistanceScaleType,
  SimpleSizeScale as SizeScaleType,
};
export type { PresetName, RenderMapping };
export { BODY_PHYSICAL, RENDER_PRESETS, getPreset };

// ---------------------------
// Legacy Types
// ---------------------------

export type PlanetName = PlanetId;
export type BodyName = BodyId;

export interface PlanetPosition {
  name: string;
  x: number;
  y: number;
  z: number;
  distance: number;
  distanceAU: number;
  color: string;
  size: number;
  /** North pole direction in scene coordinates (unit vector) */
  northPole?: [number, number, number];
  /** Prime meridian rotation angle at epoch in degrees (IAU model) */
  rotationAngleDeg?: number;
  /** Texture offset in degrees to align texture's 0-longitude with IAU prime meridian */
  textureOffsetDeg?: number;
}

export interface MoonPosition {
  x: number;
  y: number;
  z: number;
  distance: number;
  phase: number;
}

// ---------------------------
// Texture Offset Constants
// ---------------------------

/**
 * Texture offsets in degrees to align texture's 0-longitude with IAU prime meridian.
 * Different texture sources place their 0-longitude at different positions.
 * These offsets correct for that difference.
 *
 * Solar System Scope textures: The 0-longitude in the texture corresponds to
 * a specific visual feature. We need to offset to match IAU prime meridian definitions.
 *
 * IAU model: W = W0 + Wdot * d (prime meridian angle from ascending node)
 * Texture convention: U=0.5 corresponds to prime meridian (0° longitude)
 *
 * The offset converts from IAU W angle to texture-aligned rotation.
 * Positive values rotate the texture westward (features move east in view).
 *
 * Calibration method:
 * - For Earth: At UTC noon, the sub-solar point should be near 0° longitude
 * - The offset corrects for the relationship between IAU W and texture coordinates
 */
const TEXTURE_OFFSETS_DEG: Record<string, number> = {
  Sun: 0,
  Mercury: 0,
  Venus: 0,
  // Earth: IAU defines W = 190.147° + 360.9856235° * d at J2000.
  // The Solar System Scope texture has Greenwich at center (U=0.5).
  // This offset calibrates the texture to match real-world day/night.
  // Verified: At midnight Brazil time, Brazil should be in darkness.
  Earth: 180,
  Moon: 0,
  Mars: 0,
  Jupiter: 0,
  Saturn: 0,
  Uranus: 0,
  Neptune: 0,
};

// ---------------------------
// Orbital Elements (Legacy)
// ---------------------------

export const ORBITAL_ELEMENTS: Record<
  string,
  {
    semiMajorAxisAU: number;
    inclination: number;
    longitudeOfAscendingNode: number;
    color: string;
  }
> = {
  Mercury: {
    semiMajorAxisAU: SEMI_MAJOR_AXIS_AU.Mercury,
    inclination: (ORBITAL_INCLINATION_DEG.Mercury * Math.PI) / 180,
    longitudeOfAscendingNode: (48.331 * Math.PI) / 180,
    color: BODY_VISUAL.Mercury.color,
  },
  Venus: {
    semiMajorAxisAU: SEMI_MAJOR_AXIS_AU.Venus,
    inclination: (ORBITAL_INCLINATION_DEG.Venus * Math.PI) / 180,
    longitudeOfAscendingNode: (76.68 * Math.PI) / 180,
    color: BODY_VISUAL.Venus.color,
  },
  Earth: {
    semiMajorAxisAU: SEMI_MAJOR_AXIS_AU.Earth,
    inclination: 0,
    longitudeOfAscendingNode: 0,
    color: '#4488cc',
  },
  Mars: {
    semiMajorAxisAU: SEMI_MAJOR_AXIS_AU.Mars,
    inclination: (ORBITAL_INCLINATION_DEG.Mars * Math.PI) / 180,
    longitudeOfAscendingNode: (49.558 * Math.PI) / 180,
    color: BODY_VISUAL.Mars.color,
  },
  Jupiter: {
    semiMajorAxisAU: SEMI_MAJOR_AXIS_AU.Jupiter,
    inclination: (ORBITAL_INCLINATION_DEG.Jupiter * Math.PI) / 180,
    longitudeOfAscendingNode: (100.464 * Math.PI) / 180,
    color: BODY_VISUAL.Jupiter.color,
  },
  Saturn: {
    semiMajorAxisAU: SEMI_MAJOR_AXIS_AU.Saturn,
    inclination: (ORBITAL_INCLINATION_DEG.Saturn * Math.PI) / 180,
    longitudeOfAscendingNode: (113.665 * Math.PI) / 180,
    color: BODY_VISUAL.Saturn.color,
  },
  Uranus: {
    semiMajorAxisAU: SEMI_MAJOR_AXIS_AU.Uranus,
    inclination: (ORBITAL_INCLINATION_DEG.Uranus * Math.PI) / 180,
    longitudeOfAscendingNode: (74.006 * Math.PI) / 180,
    color: BODY_VISUAL.Uranus.color,
  },
  Neptune: {
    semiMajorAxisAU: SEMI_MAJOR_AXIS_AU.Neptune,
    inclination: (ORBITAL_INCLINATION_DEG.Neptune * Math.PI) / 180,
    longitudeOfAscendingNode: (131.784 * Math.PI) / 180,
    color: BODY_VISUAL.Neptune.color,
  },
};

// ---------------------------
// Legacy Functions
// ---------------------------

/**
 * Get scaled planet positions (backward compatible with existing Scene.tsx).
 */
export function getScaledPlanetPositions(
  date: Date = new Date(),
  distanceScale: SimpleDistanceScale = 'log',
  sizeScale: SimpleSizeScale = 'normalized'
): PlanetPosition[] {
  const mapping = createMappingFromSimple(distanceScale, sizeScale);
  const render = getSolarSystemRender(date, mapping);

  return render.map((p) => ({
    name: p.id,
    x: p.position.x,
    y: p.position.y,
    z: p.position.z,
    distance: p.distanceScene,
    distanceAU: p.distanceAu,
    color: p.color,
    size: p.radiusScene,
  }));
}

/**
 * Get Moon position relative to Earth.
 * IMPORTANT: sizeScale must match the scale used for planets to maintain consistency.
 */
export function getScaledMoonPosition(
  date: Date = new Date(),
  distanceScale: SimpleDistanceScale = 'log',
  sizeScale: SimpleSizeScale = 'normalized'
): MoonPosition & { size: number } {
  const mapping = createMappingFromSimple(distanceScale, sizeScale);
  const planets = getSolarSystemRender(date, mapping);
  const earth = planets.find((p) => p.id === 'Earth');

  if (!earth) {
    return { x: 0, y: 0, z: 0, distance: 0.15, phase: 0, size: 0.015 };
  }

  const moonRender = getMoonRender(earth.position, date, mapping);
  const phase = getMoonPhase(date);

  // Return position relative to Earth (for compatibility with existing code)
  return {
    x: moonRender.position.x - earth.position.x,
    y: moonRender.position.y - earth.position.y,
    z: moonRender.position.z - earth.position.z,
    distance: moonRender.distanceScene,
    phase,
    size: moonRender.radiusScene,
  };
}

/**
 * Get Moon orbital radius for drawing orbit path.
 */
export function getScaledMoonOrbitalRadius(
  distanceScale: SimpleDistanceScale = 'log'
): number {
  const mapping = createMappingFromSimple(distanceScale, 'normalized');

  if (distanceScale === 'real') {
    // Moon's actual semi-major axis: ~384,400 km = ~0.00257 AU
    const moonAu = 0.00257;
    if (mapping.distanceScale.kind === 'linear') {
      return moonAu * mapping.distanceScale.auToScene;
    }
  }

  // In log mode, use a visible distance (educational mode)
  return 0.15;
}

/**
 * Get scaled orbital radius for drawing orbit paths.
 */
export function getScaledOrbitalRadius(
  planetName: string,
  distanceScale: SimpleDistanceScale = 'log'
): number {
  const elements = ORBITAL_ELEMENTS[planetName];
  if (!elements) return 0;

  const mapping = createMappingFromSimple(distanceScale, 'normalized');

  if (mapping.distanceScale.kind === 'linear') {
    return elements.semiMajorAxisAU * mapping.distanceScale.auToScene;
  }

  if (mapping.distanceScale.kind === 'log10') {
    const au = elements.semiMajorAxisAU;
    return (
      Math.log10(1 + au * mapping.distanceScale.scale) * mapping.distanceScale.multiplier
    );
  }

  return elements.semiMajorAxisAU * 3;
}

// ---------------------------
// Preset-based Functions
// ---------------------------

/**
 * Get planet positions using a preset.
 * Includes orientation data (north pole, rotation angle) for accurate rendering.
 */
export function getPlanetPositionsWithPreset(
  date: Date = new Date(),
  preset: PresetName = 'schoolModel'
): PlanetPosition[] {
  const mapping = getPreset(preset);
  const render = getSolarSystemRender(date, mapping);

  return render.map((p) => {
    // Get orientation data from ephemeris provider
    const orientation = defaultProvider.getBodyOrientation(p.id as BodyId, date);

    return {
      name: p.id,
      x: p.position.x,
      y: p.position.y,
      z: p.position.z,
      distance: p.distanceScene,
      distanceAU: p.distanceAu,
      color: p.color,
      size: p.radiusScene,
      northPole: [
        orientation.northPole.x,
        orientation.northPole.y,
        orientation.northPole.z,
      ] as [number, number, number],
      rotationAngleDeg: orientation.rotationAngleDeg,
      textureOffsetDeg: TEXTURE_OFFSETS_DEG[p.id] ?? 0,
    };
  });
}

/**
 * Get Moon position using a preset.
 */
export function getMoonPositionWithPreset(
  date: Date = new Date(),
  preset: PresetName = 'schoolModel'
): MoonPosition & { size: number } {
  const mapping = getPreset(preset);
  const planets = getSolarSystemRender(date, mapping);
  const earth = planets.find((p) => p.id === 'Earth');

  if (!earth) {
    return { x: 0, y: 0, z: 0, distance: 0.15, phase: 0, size: 0.015 };
  }

  const moonRender = getMoonRender(earth.position, date, mapping);
  const phase = getMoonPhase(date);

  return {
    x: moonRender.position.x - earth.position.x,
    y: moonRender.position.y - earth.position.y,
    z: moonRender.position.z - earth.position.z,
    distance: moonRender.distanceScene,
    phase,
    size: moonRender.radiusScene,
  };
}

/**
 * Get orbital radius for a preset.
 */
export function getOrbitalRadiusWithPreset(
  planetName: string,
  preset: PresetName = 'schoolModel'
): number {
  const elements = ORBITAL_ELEMENTS[planetName];
  if (!elements) return 0;

  const mapping = getPreset(preset);
  const { distanceScale } = mapping;

  if (distanceScale.kind === 'linear') {
    return elements.semiMajorAxisAU * distanceScale.auToScene;
  }

  if (distanceScale.kind === 'log10') {
    const au = elements.semiMajorAxisAU;
    return Math.log10(1 + au * distanceScale.scale) * distanceScale.multiplier;
  }

  if (distanceScale.kind === 'piecewise') {
    const au = elements.semiMajorAxisAU;
    if (au <= distanceScale.innerRadiusAu) {
      return au * distanceScale.innerScale;
    }
    const innerScaled = distanceScale.innerRadiusAu * distanceScale.innerScale;
    const outerPart = au - distanceScale.innerRadiusAu;
    return (
      innerScaled +
      Math.log10(1 + outerPart * distanceScale.outerLogScale) *
        distanceScale.outerMultiplier
    );
  }

  return elements.semiMajorAxisAU * 3;
}
