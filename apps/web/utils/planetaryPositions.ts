/**
 * Planetary position utilities for the 3D scene.
 */

import {
  getSolarSystemRender,
  getMoonRender,
  getMoonPhase,
  getPreset,
  RENDER_PRESETS,
  BODY_PHYSICAL,
  BODY_VISUAL,
  SEMI_MAJOR_AXIS_AU,
  ORBITAL_INCLINATION_DEG,
  defaultProvider,
  type BodyId,
  type PresetName,
  type RenderMapping,
} from '@worldline-kinematics/astro';

export type { PresetName, RenderMapping };
export { BODY_PHYSICAL, RENDER_PRESETS, getPreset };

// ---------------------------
// Types
// ---------------------------

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
  /** North pole direction in scene coordinates (unit vector) */
  northPole?: [number, number, number];
  /** Prime meridian rotation angle at epoch in degrees */
  rotationAngleDeg?: number;
}

// ---------------------------
// Texture Offset Constants
// ---------------------------

/**
 * Texture offsets in degrees to align texture's 0-longitude with IAU prime meridian.
 *
 * Earth: IAU defines W = 190.147° + 360.9856235° * d at J2000.
 * The Solar System Scope texture has Greenwich at center (U=0.5).
 * This offset calibrates the texture to match real-world day/night.
 * Verified: At midnight Brazil time, Brazil should be in darkness.
 */
const TEXTURE_OFFSETS_DEG: Record<string, number> = {
  Sun: 0,
  Mercury: 0,
  Venus: 0,
  Earth: 0,
  Moon: 0,
  Mars: 0,
  Jupiter: 0,
  Saturn: 0,
  Uranus: 0,
  Neptune: 0,
};

// ---------------------------
// Orbital Elements
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
// Functions
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
 * Includes orientation data for proper texture alignment.
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
  const orientation = defaultProvider.getBodyOrientation('Moon', date);

  return {
    x: moonRender.position.x - earth.position.x,
    y: moonRender.position.y - earth.position.y,
    z: moonRender.position.z - earth.position.z,
    distance: moonRender.distanceScene,
    phase,
    size: moonRender.radiusScene,
    northPole: [
      orientation.northPole.x,
      orientation.northPole.y,
      orientation.northPole.z,
    ] as [number, number, number],
    rotationAngleDeg: orientation.rotationAngleDeg,
  };
}
