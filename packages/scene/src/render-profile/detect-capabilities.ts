/**
 * GPU capability detection for adaptive rendering.
 *
 * Uses WebGL parameters to assess device capabilities before deciding
 * whether cinematic mode is feasible. This is a fast, deterministic check
 * that runs before the live performance benchmark.
 */

import {
  type WebGLCapabilities,
  type CapabilityAssessment,
  type RenderProfile,
  PROFILE_STANDARD,
  PROFILE_CINEMATIC,
} from './types';

/**
 * Minimum requirements for cinematic mode.
 */
const CINEMATIC_REQUIREMENTS = {
  minTextureSize: 4096,
  requireWebGL2: true,
} as const;

/**
 * Detects WebGL capabilities by creating a temporary canvas.
 *
 * @returns Capability report, or a "not supported" report if WebGL unavailable
 */
export function detectWebGLCapabilities(): WebGLCapabilities {
  // SSR guard
  if (typeof document === 'undefined' || typeof WebGLRenderingContext === 'undefined') {
    return {
      supported: false,
      isWebGL2: false,
      maxTextureSize: 0,
      maxTextureUnits: 0,
      hasAnisotropicFiltering: false,
      maxAnisotropy: 0,
      hasFloatTextureLinear: false,
      renderer: 'unknown',
    };
  }

  const canvas = document.createElement('canvas');

  // Try WebGL2 first, then fall back to WebGL1
  const gl =
    (canvas.getContext('webgl2', {
      powerPreference: 'high-performance',
    }) as WebGL2RenderingContext | null) ||
    (canvas.getContext('webgl', {
      powerPreference: 'high-performance',
    }) as WebGLRenderingContext | null);

  if (!gl) {
    return {
      supported: false,
      isWebGL2: false,
      maxTextureSize: 0,
      maxTextureUnits: 0,
      hasAnisotropicFiltering: false,
      maxAnisotropy: 0,
      hasFloatTextureLinear: false,
      renderer: 'unknown',
    };
  }

  const isWebGL2 =
    typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;

  // Core parameters
  const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
  const maxTextureUnits = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS) as number;

  // Anisotropic filtering extension (vendor-prefixed)
  const anisoExt =
    gl.getExtension('EXT_texture_filter_anisotropic') ||
    gl.getExtension('MOZ_EXT_texture_filter_anisotropic') ||
    gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic');

  const hasAnisotropicFiltering = anisoExt !== null;
  const maxAnisotropy = hasAnisotropicFiltering
    ? (gl.getParameter(anisoExt.MAX_TEXTURE_MAX_ANISOTROPY_EXT) as number)
    : 0;

  // Float texture linear filtering (useful for some post-processing)
  const floatLinearExt = gl.getExtension('OES_texture_float_linear');
  const hasFloatTextureLinear = floatLinearExt !== null;

  // Renderer string (may be "Google SwiftShader" on software, or actual GPU name)
  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
  const renderer = debugInfo
    ? (gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) as string)
    : 'unknown';

  // Clean up
  const loseContext = gl.getExtension('WEBGL_lose_context');
  if (loseContext) {
    loseContext.loseContext();
  }

  return {
    supported: true,
    isWebGL2,
    maxTextureSize,
    maxTextureUnits,
    hasAnisotropicFiltering,
    maxAnisotropy,
    hasFloatTextureLinear,
    renderer,
  };
}

/**
 * Assesses whether cinematic mode is feasible and recommends a profile.
 *
 * @param capabilities - Result from detectWebGLCapabilities()
 * @returns Assessment with recommendation and blockers
 */
export function assessCapabilities(
  capabilities: WebGLCapabilities
): CapabilityAssessment {
  const blockers: string[] = [];

  if (!capabilities.supported) {
    blockers.push('WebGL not supported');
  }

  if (CINEMATIC_REQUIREMENTS.requireWebGL2 && !capabilities.isWebGL2) {
    blockers.push('WebGL2 required for cinematic mode');
  }

  if (capabilities.maxTextureSize < CINEMATIC_REQUIREMENTS.minTextureSize) {
    blockers.push(
      `Texture size ${capabilities.maxTextureSize} below minimum ${CINEMATIC_REQUIREMENTS.minTextureSize}`
    );
  }

  // Check for software renderer (SwiftShader = no GPU acceleration)
  const isSoftwareRenderer =
    capabilities.renderer.toLowerCase().includes('swiftshader') ||
    capabilities.renderer.toLowerCase().includes('software');

  if (isSoftwareRenderer) {
    blockers.push('Software renderer detected (no GPU acceleration)');
  }

  const cinematicFeasible = blockers.length === 0;

  // Build recommended profile
  let recommendedProfile: RenderProfile;

  if (cinematicFeasible) {
    // Start with cinematic base, adjust based on capabilities
    recommendedProfile = { ...PROFILE_CINEMATIC };

    // Adjust texture tier based on max texture size
    if (capabilities.maxTextureSize >= 8192) {
      recommendedProfile.textureTier = '4k'; // Could go 8k, but 4k is safer default
    } else if (capabilities.maxTextureSize >= 4096) {
      recommendedProfile.textureTier = '4k';
    } else {
      recommendedProfile.textureTier = '2k';
    }

    // Adjust anisotropy
    recommendedProfile.maxAnisotropy = Math.min(8, capabilities.maxAnisotropy);
  } else {
    recommendedProfile = { ...PROFILE_STANDARD };
  }

  return {
    capabilities,
    cinematicFeasible,
    recommendedProfile,
    cinematicBlockers: blockers,
  };
}

/**
 * One-shot function to detect capabilities and assess them.
 *
 * @returns Complete capability assessment
 */
export function detectAndAssess(): CapabilityAssessment {
  const capabilities = detectWebGLCapabilities();
  return assessCapabilities(capabilities);
}
