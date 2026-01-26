/**
 * @worldline-kinematics/scene
 *
 * R3F 3D scene components for worldline visualization.
 * Handles Earth, solar system, galaxy, and CMB visualizations with smooth transitions.
 *
 * Features:
 * - Adaptive visual fidelity (Standard/Cinematic modes)
 * - GPU capability detection
 * - Physics-accurate rotation with correct axial tilts
 */

// Render profile system (GPU detection, fidelity tiers)
export * from './render-profile';

// Earth components
export * from './earth';

// Solar system components
export * from './solar';

// Galaxy components
export * from './galaxy';

// CMB components
export * from './cmb';

// Camera system
export * from './camera';

// Post-processing effects
export * from './effects';
