/**
 * @worldline-kinematics/astro
 *
 * Ephemerides, physical data, and coordinate transforms for solar system visualization.
 *
 * Architecture (C2 principles):
 * - Physical state vectors are always tagged with frame + unit
 * - No implicit axis swaps; all transforms go through named functions
 * - Rendering uses explicit RenderMapping configurations
 * - "True scale" mode never uses visibility hacks
 * - Every constant has a source citation
 *
 * Main exports:
 * - Types: Frame-tagged state vectors, body properties, render states
 * - Data: JPL physical parameters, PDS ring data, belt definitions
 * - Ephemeris: Astronomy Engine provider with frame transforms
 * - Scale: Mapping presets (TrueScale, SchoolModel, Explorer)
 */

// Core types
export * from './types';

// Physical data (JPL SSD, PDS Ring-Moon Systems Node)
export * from './data';

// Ephemeris provider
export * from './ephemeris';

// Coordinate frame transforms
export * from './frames';

// Scale mapping
export * from './scale';
