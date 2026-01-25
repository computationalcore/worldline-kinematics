/**
 * Scale mapping presets for solar system visualization.
 */

import type { DistanceScaleConfig, SizeScaleConfig, RenderMapping } from '../types';

// ---------------------------
// Physical Constants
// ---------------------------

/**
 * Astronomical Unit in kilometers.
 * IAU 2012 definition (exact).
 * Source: https://www.iau.org/static/resolutions/IAU2012_English.pdf
 */
export const AU_KM = 149_597_870.7;

// ---------------------------
// Distance Scale Presets
// ---------------------------

/**
 * Scene units per AU for linear scale (physical mode).
 * Used to derive physical size scale.
 */
export const AU_TO_SCENE = 3;

/**
 * Scene units per AU for planet ratio mode.
 * Must be large enough that Mercury's orbit (0.387 AU) is outside
 * the Sun's visual radius (~5.7 scene units at Mercury-baseline scale).
 *
 * Math: Sun radius scene = MERCURY_RADIUS_SCENE_EXAGGERATED * (695700 / 2439.7) ≈ 5.7
 * For Mercury orbit > Sun radius: 0.387 * auToScene > 5.7 → auToScene > 14.7
 * Using 20 for comfortable margin.
 */
export const AU_TO_SCENE_PLANET_RATIO = 20;

/**
 * True linear scale: 1 AU = 3 scene units.
 * Preserves: exact distance ratios
 * Tradeoff: outer planets very far, inner planets crowded
 */
export const DISTANCE_LINEAR: DistanceScaleConfig = {
  kind: 'linear',
  auToScene: AU_TO_SCENE,
};

/**
 * Linear scale for planet ratio mode with larger spacing.
 * Ensures bodies don't overlap even with exaggerated sizes.
 */
export const DISTANCE_LINEAR_RATIO: DistanceScaleConfig = {
  kind: 'linear',
  auToScene: AU_TO_SCENE_PLANET_RATIO,
};

/**
 * Logarithmic scale for educational visualization.
 * Preserves: orbital ordering, relative "feel"
 * Distorts: distance ratios (intentionally)
 */
export const DISTANCE_LOG: DistanceScaleConfig = {
  kind: 'log10',
  scale: 2,
  multiplier: 3,
};

/**
 * Piecewise scale: linear for inner planets, log for outer.
 * Best compromise for interactive exploration.
 */
export const DISTANCE_PIECEWISE: DistanceScaleConfig = {
  kind: 'piecewise',
  innerRadiusAu: 2, // Mars orbit
  innerScale: 2, // Linear scale for inner planets
  outerLogScale: 1.5,
  outerMultiplier: 2.5,
};

// ---------------------------
// Size Scale Presets
// ---------------------------

/**
 * Sun reference radius in scene units (for exaggerated modes).
 * This is the visual size of the Sun at the origin.
 */
export const SUN_RADIUS_SCENE = 0.25;

/**
 * Jupiter reference radius for normalized mode.
 */
export const JUPITER_RADIUS_SCENE_NORMALIZED = 0.06;

/**
 * Mercury baseline radius in scene units for "planet ratio" mode.
 * WARNING: This mode preserves planet-to-planet ratios but distorts
 * size-to-distance ratio by ~400x. Use SIZE_PHYSICAL for true scale.
 */
export const MERCURY_RADIUS_SCENE_EXAGGERATED = 0.02;

/**
 * Mercury baseline radius for Scholar mode (log distances).
 * Slightly larger than planet ratio mode for better visibility
 * when distances are compressed.
 */
export const MERCURY_RADIUS_SCENE_SCHOLAR = 0.025;

/**
 * Physical size scale: derived from distance scale.
 * kmToScene = auToScene / AU_KM
 *
 * This is the ONLY geometrically correct option for "true scale".
 * All sizes are consistent with distances.
 *
 * Preserves: ALL geometric ratios (size-to-distance, size-to-size)
 * Tradeoff: planets are extremely tiny (as they should be)
 */
export const SIZE_PHYSICAL: SizeScaleConfig = {
  kind: 'physical',
  kmToScene: AU_TO_SCENE / AU_KM,
};

/**
 * Planet-ratio sizes relative to Sun.
 * Preserves: planet-to-planet size ratios
 * DISTORTS: size-to-distance ratio (planets appear ~100x larger than reality)
 */
export const SIZE_RATIO_SUN: SizeScaleConfig = {
  kind: 'realRelativeToSun',
  sunRadiusScene: SUN_RADIUS_SCENE,
};

/**
 * Planet-ratio sizes relative to Mercury (smallest planet).
 * Mercury = baseline visible size, all others = true ratio to Mercury.
 *
 * Preserves: exact planet-to-planet size ratios
 * DISTORTS: size-to-distance ratio by ~400x
 *
 * WARNING: This is NOT "true scale" - the Moon will appear inside Earth!
 * Use SIZE_PHYSICAL for geometrically correct visualization.
 */
export const SIZE_RATIO_MERCURY: SizeScaleConfig = {
  kind: 'realRelativeToMercury',
  mercuryRadiusScene: MERCURY_RADIUS_SCENE_EXAGGERATED,
};

/**
 * Planet-ratio sizes for Scholar mode (with log distances).
 * Larger baseline for better visibility with compressed distances.
 * Preserves exact planet-to-planet size ratios.
 */
export const SIZE_RATIO_SCHOLAR: SizeScaleConfig = {
  kind: 'realRelativeToMercury',
  mercuryRadiusScene: MERCURY_RADIUS_SCENE_SCHOLAR,
};

// Legacy alias (deprecated - use SIZE_RATIO_MERCURY)
export const SIZE_REAL = SIZE_RATIO_MERCURY;

/**
 * Normalized sizes relative to Jupiter.
 * Preserves: planet-to-planet size ratios
 * Distorts: planet-to-Sun ratio
 */
export const SIZE_NORMALIZED: SizeScaleConfig = {
  kind: 'normalizedRelativeToJupiter',
  jupiterRadiusScene: JUPITER_RADIUS_SCENE_NORMALIZED,
};

/**
 * Normalized with minimum visibility.
 * Ensures all planets are at least visible.
 */
export const SIZE_VISIBLE: SizeScaleConfig = {
  kind: 'clampedMinimum',
  minRadiusScene: 0.008,
  baseScale: SIZE_NORMALIZED,
};

/**
 * Mass comparison mode.
 * Sphere volume represents relative mass.
 */
export const SIZE_MASS_COMPARISON: SizeScaleConfig = {
  kind: 'customMetric',
  metric: 'mass',
  referenceBody: 'Earth',
  referenceRadiusScene: 0.05,
  logCompress: {
    scale: 0.5,
    multiplier: 1.2,
  },
};

// ---------------------------
// Combined Presets
// ---------------------------

/**
 * TRUE PHYSICAL preset.
 *
 * What it shows: Geometrically correct scale
 * - Distance ratios are exact (linear)
 * - Size ratios are derived from distances (kmToScene = auToScene / AU_KM)
 * - ALL geometric relationships are correct
 *
 * Preserves: Everything - this is physically accurate
 * Best for: Understanding true scale of the solar system
 * Tradeoff: Planets are extremely tiny (as they should be)
 *
 * Invariants that MUST hold:
 * - Moon orbit is ~60x Earth radius (outside Earth!)
 * - Earth radius / 1 AU = 6371 / 149597870.7
 */
export const PRESET_TRUE_PHYSICAL: RenderMapping = {
  distanceScale: DISTANCE_LINEAR,
  sizeScale: SIZE_PHYSICAL,
};

/**
 * PLANET RATIO preset (formerly "TRUE SCALE" - RENAMED for honesty).
 *
 * What it shows: Linear distances with exaggerated planet sizes
 * - Distance ratios are exact
 * - Size ratios are exact relative to each other (planet-to-planet)
 * - BUT size-to-distance ratio is WRONG by ~400x
 *
 * Uses DISTANCE_LINEAR_RATIO (auToScene=20) to ensure bodies don't overlap.
 *
 * Preserves: distance ratios, planet-to-planet size ratios
 * DISTORTS: size-to-distance ratio (Moon renders inside Earth!)
 *
 * WARNING: Despite the name, this is NOT physically correct.
 * Use PRESET_TRUE_PHYSICAL for geometric accuracy.
 */
export const PRESET_PLANET_RATIO: RenderMapping = {
  distanceScale: DISTANCE_LINEAR_RATIO,
  sizeScale: SIZE_RATIO_MERCURY,
};

// Legacy alias (deprecated)
export const PRESET_TRUE_SCALE = PRESET_PLANET_RATIO;

/**
 * SCHOOL MODEL preset (Scholar mode).
 *
 * What it shows: Educational visualization
 * - Distances are logarithmically compressed
 * - Sizes are normalized for visibility (not real ratios)
 *
 * Best for: Interactive exploration, education
 * Tradeoff: Both distances and sizes are compressed for visibility
 */
export const PRESET_SCHOOL_MODEL: RenderMapping = {
  distanceScale: DISTANCE_LOG,
  sizeScale: SIZE_NORMALIZED,
};

/**
 * TRUE SIZES preset.
 *
 * What it shows: Real planet-to-planet size ratios with compressed distances
 * - Sizes preserve exact planet-to-planet ratios (Mercury as baseline)
 * - Distances are logarithmically compressed to fit the scene
 *
 * IMPORTANT: Because sizes are real ratios but distances are compressed,
 * bodies may overlap (e.g., Moon inside Earth, inner planets inside Sun).
 * The renderer must add size-based offsets to prevent overlap:
 *   effectiveDistance = logDistance + (parentRadius + childRadius) * safetyFactor
 *
 * Best for: Comparing relative sizes of planets
 * Preserves: exact planet-to-planet size ratios
 * Tradeoff: Distance ratios are intentionally distorted
 */
export const PRESET_TRUE_SIZES: RenderMapping = {
  distanceScale: DISTANCE_LOG,
  sizeScale: SIZE_RATIO_SCHOLAR,
};

/**
 * EXPLORER preset.
 *
 * What it shows: Best compromise for interactive use
 * - Inner planets use linear distance
 * - Outer planets use log distance
 * - Sizes normalized with minimum visibility
 *
 * Best for: General-purpose exploration
 */
export const PRESET_EXPLORER: RenderMapping = {
  distanceScale: DISTANCE_PIECEWISE,
  sizeScale: SIZE_VISIBLE,
};

/**
 * MASS COMPARISON preset.
 *
 * What it shows: Relative masses as sphere volumes
 * - Sphere volume proportional to body mass
 * - Log-compressed to handle huge range
 *
 * Best for: Comparing planetary masses visually
 */
export const PRESET_MASS_COMPARISON: RenderMapping = {
  distanceScale: DISTANCE_LOG,
  sizeScale: SIZE_MASS_COMPARISON,
};

// ---------------------------
// Preset Registry
// ---------------------------

export type PresetName =
  | 'truePhysical'
  | 'planetRatio'
  | 'schoolModel'
  | 'trueSizes'
  | 'explorer'
  | 'massComparison';

export const RENDER_PRESETS: Record<PresetName, RenderMapping> = {
  truePhysical: PRESET_TRUE_PHYSICAL,
  planetRatio: PRESET_PLANET_RATIO,
  schoolModel: PRESET_SCHOOL_MODEL,
  trueSizes: PRESET_TRUE_SIZES,
  explorer: PRESET_EXPLORER,
  massComparison: PRESET_MASS_COMPARISON,
};

/**
 * Get a render mapping by preset name.
 */
export function getPreset(name: PresetName): RenderMapping {
  return RENDER_PRESETS[name];
}

/**
 * Create a custom render mapping.
 */
export function createMapping(
  distanceScale: DistanceScaleConfig,
  sizeScale: SizeScaleConfig
): RenderMapping {
  return { distanceScale, sizeScale };
}

// ---------------------------
// Backward Compatibility
// ---------------------------

/**
 * Simple distance scale types for backward compatibility.
 */
export type SimpleDistanceScale = 'log' | 'real';

/**
 * Simple size scale types for backward compatibility.
 * - 'normalized': Exaggerated sizes for visibility
 * - 'real': Planet-ratio mode (preserves ratios but NOT geometric correctness)
 * - 'physical': TRUE physical scale (sizes derived from distances)
 */
export type SimpleSizeScale = 'normalized' | 'real' | 'physical';

/**
 * Convert simple scale types to full configs.
 *
 * NOTE: 'real' size scale is NOT physically correct - it preserves planet-to-planet
 * ratios but distorts size-to-distance by ~400x. Use 'physical' for true scale.
 *
 * IMPORTANT: When using 'real' size scale with 'real' distance scale, we use
 * DISTANCE_LINEAR_RATIO (auToScene=20) to prevent body overlap.
 */
export function createMappingFromSimple(
  distanceScale: SimpleDistanceScale,
  sizeScale: SimpleSizeScale
): RenderMapping {
  // Determine distance config
  // For 'real' size scale with linear distances, use the larger auToScene
  // to prevent bodies from overlapping (Earth inside Sun issue)
  let distance: DistanceScaleConfig;
  if (distanceScale === 'log') {
    distance = DISTANCE_LOG;
  } else if (sizeScale === 'real') {
    // Planet ratio mode needs larger spacing to prevent overlap
    distance = DISTANCE_LINEAR_RATIO;
  } else {
    distance = DISTANCE_LINEAR;
  }

  let size: SizeScaleConfig;
  switch (sizeScale) {
    case 'physical':
      // True physical scale - kmToScene derived from auToScene
      // For log scale, we use the linear auToScene as the reference
      // (physical scale only makes sense with linear distances)
      size = {
        kind: 'physical',
        kmToScene: AU_TO_SCENE / AU_KM,
      };
      break;
    case 'real':
      // Planet-ratio mode (legacy - NOT physically correct)
      size = SIZE_RATIO_MERCURY;
      break;
    case 'normalized':
    default:
      size = SIZE_NORMALIZED;
      break;
  }

  return { distanceScale: distance, sizeScale: size };
}

// ---------------------------
// Runtime Scale Validation
// ---------------------------

/**
 * Error thrown when a render mapping configuration is invalid.
 */
export class MappingValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MappingValidationError';
  }
}

/**
 * Validates that a render mapping is internally consistent.
 *
 * In "physical" size scale mode, the kmToScene value MUST be derived
 * from the distance scale's auToScene value. This ensures that sizes
 * and distances use the same linear scale factor, which is required
 * for geometrically correct visualization.
 *
 * Invariant: kmToScene === auToScene / AU_KM (within floating-point tolerance)
 *
 * This validation prevents common bugs like:
 * - Moon rendering inside Earth
 * - Rings at wrong scale relative to planet
 * - Inconsistent geometric relationships
 *
 * @param mapping The render mapping to validate
 * @throws {MappingValidationError} If the mapping is invalid
 */
export function validateMapping(mapping: RenderMapping): void {
  const { distanceScale, sizeScale } = mapping;

  // Physical size scale requires linear distance scale
  if (sizeScale.kind === 'physical') {
    if (distanceScale.kind !== 'linear') {
      throw new MappingValidationError(
        `Physical size scale requires linear distance scale, got '${distanceScale.kind}'. ` +
          'Physical mode derives kmToScene from auToScene, which only makes sense for linear distances.'
      );
    }

    // Verify kmToScene matches auToScene / AU_KM
    const expectedKmToScene = distanceScale.auToScene / AU_KM;
    const actualKmToScene = sizeScale.kmToScene;
    const relativeError = Math.abs(
      (actualKmToScene - expectedKmToScene) / expectedKmToScene
    );

    // Allow tiny floating-point tolerance (1e-9 ≈ double precision limit)
    if (relativeError > 1e-9) {
      throw new MappingValidationError(
        'Invalid physical mapping: kmToScene mismatch. ' +
          `Expected ${expectedKmToScene.toExponential(6)} (auToScene / AU_KM), ` +
          `got ${actualKmToScene.toExponential(6)}. ` +
          `Relative error: ${(relativeError * 100).toFixed(6)}%. ` +
          'For physical mode, kmToScene MUST equal auToScene / AU_KM.'
      );
    }
  }
}

/**
 * Creates a validated render mapping.
 * Throws if the configuration is invalid.
 *
 * @param distanceScale Distance scale configuration
 * @param sizeScale Size scale configuration
 * @returns Validated render mapping
 * @throws {MappingValidationError} If the mapping is invalid
 */
export function createValidatedMapping(
  distanceScale: DistanceScaleConfig,
  sizeScale: SizeScaleConfig
): RenderMapping {
  const mapping = { distanceScale, sizeScale };
  validateMapping(mapping);
  return mapping;
}

/**
 * Creates a physically correct mapping where sizes are derived from distances.
 * This is the safest way to create a "true scale" visualization.
 *
 * @param auToScene Scene units per AU
 * @returns Validated physical render mapping
 */
export function createPhysicalMapping(auToScene: number): RenderMapping {
  return createValidatedMapping(
    { kind: 'linear', auToScene },
    { kind: 'physical', kmToScene: auToScene / AU_KM }
  );
}
