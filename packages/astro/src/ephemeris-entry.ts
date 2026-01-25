/**
 * Ephemeris-only entrypoint.
 *
 * Import from '@worldline-kinematics/astro/ephemeris' to get only the
 * ephemeris provider and its dependencies (astronomy-engine).
 *
 * This allows tree-shaking of the heavy astronomy-engine dependency
 * when you only need types, data, or scale mappings.
 *
 * Usage:
 * ```ts
 * // Full package (includes astronomy-engine)
 * import { AstronomyEngineProvider } from '@worldline-kinematics/astro';
 *
 * // Ephemeris-only (same result, more explicit)
 * import { AstronomyEngineProvider } from '@worldline-kinematics/astro/ephemeris';
 *
 * // Types, data, scale only (no astronomy-engine)
 * import { BODY_PHYSICAL, PRESET_TRUE_PHYSICAL } from '@worldline-kinematics/astro/core';
 * ```
 */

export * from './ephemeris';
