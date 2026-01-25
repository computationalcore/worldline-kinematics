/**
 * Core-only entrypoint (no astronomy-engine dependency).
 *
 * Import from '@worldline-kinematics/astro/core' to get types, data,
 * scale mappings, and coordinate transforms without the heavy
 * astronomy-engine dependency.
 *
 * This is useful for:
 * - Shared type definitions between packages
 * - Scale configuration without ephemeris computation
 * - Build-time constants and physical data
 *
 * Usage:
 * ```ts
 * // Core only (no astronomy-engine)
 * import {
 *   BODY_PHYSICAL,
 *   PRESET_TRUE_PHYSICAL,
 *   validateMapping,
 *   eclToThreeJs,
 * } from '@worldline-kinematics/astro/core';
 *
 * // Full package (includes astronomy-engine)
 * import { AstronomyEngineProvider } from '@worldline-kinematics/astro';
 * ```
 */

// Core types (no runtime deps)
export * from './types';

// Physical data (JPL SSD, PDS Ring-Moon Systems Node)
export * from './data';

// Coordinate frame transforms (pure math, no astronomy-engine)
export * from './frames';

// Scale mapping (pure config, no astronomy-engine)
export * from './scale';
