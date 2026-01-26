/**
 * Visual fidelity and animation configuration types.
 *
 * The render profile system separates visual quality from physics computation.
 * Physics (positions, velocities, distances) is always accurate.
 * Visual fidelity controls how bodies are rendered.
 */

/**
 * Visual fidelity tier.
 * - standard: Fast, works on all devices. 2K textures, simple materials.
 * - cinematic: High quality. 4K+ textures, PBR materials, atmosphere, effects.
 */
export type VisualFidelity = 'standard' | 'cinematic';

/**
 * Animation mode for celestial body rotation.
 * - off: Bodies don't rotate (static view)
 * - subtle: Slow rotation for visual interest (not physically accurate)
 * - realtime: Accurate rotation based on sidereal period and epoch
 */
export type AnimationMode = 'off' | 'subtle' | 'realtime';

/**
 * Texture resolution tier.
 * Determines which texture set to load.
 */
export type TextureTier = '1k' | '2k' | '4k' | '8k';

/**
 * Complete render profile configuration.
 * Determined by auto-detection + user override.
 */
export interface RenderProfile {
  /** Visual quality tier */
  fidelity: VisualFidelity;

  /** Animation behavior */
  animation: AnimationMode;

  /** Device pixel ratio (1.0 - 2.0+) */
  dpr: number;

  /** Enable shadow casting/receiving */
  enableShadows: boolean;

  /** Enable bloom post-processing */
  enableBloom: boolean;

  /** Sphere geometry segments (higher = smoother) */
  sphereSegments: number;

  /** Texture resolution to load */
  textureTier: TextureTier;

  /** Use KTX2/Basis compressed textures (if available) */
  useCompressedTextures: boolean;

  /** Maximum texture anisotropy (1 = off, 4-16 = high quality) */
  maxAnisotropy: number;
}

/**
 * Standard profile - fast, works everywhere.
 */
export const PROFILE_STANDARD: RenderProfile = {
  fidelity: 'standard',
  animation: 'subtle',
  dpr: 1,
  enableShadows: false,
  enableBloom: true,
  sphereSegments: 32,
  textureTier: '2k',
  useCompressedTextures: false,
  maxAnisotropy: 1,
};

/**
 * Cinematic profile - high quality for capable devices.
 */
export const PROFILE_CINEMATIC: RenderProfile = {
  fidelity: 'cinematic',
  animation: 'realtime',
  dpr: 1.5,
  enableShadows: true,
  enableBloom: true,
  sphereSegments: 128,
  textureTier: '4k',
  useCompressedTextures: true,
  maxAnisotropy: 8,
};

/**
 * Adaptive profile knobs for performance degradation.
 * When FPS drops, reduce these in order:
 * 1. dpr (1.5 -> 1.0)
 * 2. sphereSegments (128 -> 64)
 * 3. enableShadows (true -> false)
 * 4. textureTier (4k -> 2k)
 */
export type ProfileKnob = 'dpr' | 'sphereSegments' | 'enableShadows' | 'textureTier';

/**
 * WebGL capability report from GPU detection.
 */
export interface WebGLCapabilities {
  /** Whether WebGL is supported at all */
  supported: boolean;

  /** Whether WebGL2 is available */
  isWebGL2: boolean;

  /** Maximum texture dimension (usually 4096, 8192, or 16384) */
  maxTextureSize: number;

  /** Maximum texture units available */
  maxTextureUnits: number;

  /** Whether anisotropic filtering is available */
  hasAnisotropicFiltering: boolean;

  /** Maximum anisotropy level (0 if not supported) */
  maxAnisotropy: number;

  /** Whether float textures with linear filtering are supported */
  hasFloatTextureLinear: boolean;

  /** Renderer string (GPU name, may be masked) */
  renderer: string;
}

/**
 * Result of GPU capability assessment.
 */
export interface CapabilityAssessment {
  /** Detected capabilities */
  capabilities: WebGLCapabilities;

  /** Whether cinematic mode is feasible */
  cinematicFeasible: boolean;

  /** Recommended starting profile */
  recommendedProfile: RenderProfile;

  /** Reasons if cinematic is not feasible */
  cinematicBlockers: string[];
}
