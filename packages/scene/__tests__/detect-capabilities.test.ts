/**
 * Tests for GPU capability detection and assessment.
 */

import { describe, it, expect } from 'vitest';
import {
  assessCapabilities,
  detectWebGLCapabilities,
  detectAndAssess,
} from '../src/render-profile/detect-capabilities';
import type { WebGLCapabilities } from '../src/render-profile/types';

describe('assessCapabilities', () => {
  describe('WebGL not supported', () => {
    it('returns cinematic not feasible when WebGL not supported', () => {
      const capabilities: WebGLCapabilities = {
        supported: false,
        isWebGL2: false,
        maxTextureSize: 0,
        maxTextureUnits: 0,
        hasAnisotropicFiltering: false,
        maxAnisotropy: 0,
        hasFloatTextureLinear: false,
        renderer: 'unknown',
      };

      const assessment = assessCapabilities(capabilities);

      expect(assessment.cinematicFeasible).toBe(false);
      expect(assessment.cinematicBlockers).toContain('WebGL not supported');
      expect(assessment.recommendedProfile.fidelity).toBe('standard');
    });
  });

  describe('WebGL1 only', () => {
    it('returns cinematic not feasible when only WebGL1 is available', () => {
      const capabilities: WebGLCapabilities = {
        supported: true,
        isWebGL2: false,
        maxTextureSize: 4096,
        maxTextureUnits: 16,
        hasAnisotropicFiltering: true,
        maxAnisotropy: 16,
        hasFloatTextureLinear: false,
        renderer: 'ANGLE (NVIDIA GeForce GTX 1080)',
      };

      const assessment = assessCapabilities(capabilities);

      expect(assessment.cinematicFeasible).toBe(false);
      expect(assessment.cinematicBlockers).toContain(
        'WebGL2 required for cinematic mode'
      );
    });
  });

  describe('low texture size', () => {
    it('returns cinematic not feasible when texture size is below 4096', () => {
      const capabilities: WebGLCapabilities = {
        supported: true,
        isWebGL2: true,
        maxTextureSize: 2048,
        maxTextureUnits: 16,
        hasAnisotropicFiltering: true,
        maxAnisotropy: 16,
        hasFloatTextureLinear: true,
        renderer: 'ANGLE (NVIDIA GeForce GTX 1080)',
      };

      const assessment = assessCapabilities(capabilities);

      expect(assessment.cinematicFeasible).toBe(false);
      expect(assessment.cinematicBlockers).toContain(
        'Texture size 2048 below minimum 4096'
      );
    });
  });

  describe('software renderer', () => {
    it('returns cinematic not feasible for SwiftShader', () => {
      const capabilities: WebGLCapabilities = {
        supported: true,
        isWebGL2: true,
        maxTextureSize: 8192,
        maxTextureUnits: 16,
        hasAnisotropicFiltering: true,
        maxAnisotropy: 16,
        hasFloatTextureLinear: true,
        renderer: 'Google SwiftShader',
      };

      const assessment = assessCapabilities(capabilities);

      expect(assessment.cinematicFeasible).toBe(false);
      expect(assessment.cinematicBlockers).toContain(
        'Software renderer detected (no GPU acceleration)'
      );
    });

    it('detects software renderer case-insensitively', () => {
      const capabilities: WebGLCapabilities = {
        supported: true,
        isWebGL2: true,
        maxTextureSize: 8192,
        maxTextureUnits: 16,
        hasAnisotropicFiltering: true,
        maxAnisotropy: 16,
        hasFloatTextureLinear: true,
        renderer: 'SOFTWARE Rasterizer',
      };

      const assessment = assessCapabilities(capabilities);

      expect(assessment.cinematicFeasible).toBe(false);
    });
  });

  describe('cinematic feasible', () => {
    it('returns cinematic feasible for capable hardware', () => {
      const capabilities: WebGLCapabilities = {
        supported: true,
        isWebGL2: true,
        maxTextureSize: 16384,
        maxTextureUnits: 32,
        hasAnisotropicFiltering: true,
        maxAnisotropy: 16,
        hasFloatTextureLinear: true,
        renderer: 'ANGLE (NVIDIA GeForce RTX 4090)',
      };

      const assessment = assessCapabilities(capabilities);

      expect(assessment.cinematicFeasible).toBe(true);
      expect(assessment.cinematicBlockers).toHaveLength(0);
      expect(assessment.recommendedProfile.fidelity).toBe('cinematic');
    });

    it('sets 4k texture tier for 8192+ texture size', () => {
      const capabilities: WebGLCapabilities = {
        supported: true,
        isWebGL2: true,
        maxTextureSize: 8192,
        maxTextureUnits: 32,
        hasAnisotropicFiltering: true,
        maxAnisotropy: 16,
        hasFloatTextureLinear: true,
        renderer: 'ANGLE (NVIDIA GeForce GTX 1080)',
      };

      const assessment = assessCapabilities(capabilities);

      expect(assessment.cinematicFeasible).toBe(true);
      expect(assessment.recommendedProfile.textureTier).toBe('4k');
    });

    it('sets 4k texture tier for 4096 texture size', () => {
      const capabilities: WebGLCapabilities = {
        supported: true,
        isWebGL2: true,
        maxTextureSize: 4096,
        maxTextureUnits: 16,
        hasAnisotropicFiltering: true,
        maxAnisotropy: 8,
        hasFloatTextureLinear: true,
        renderer: 'ANGLE (Intel HD Graphics)',
      };

      const assessment = assessCapabilities(capabilities);

      expect(assessment.cinematicFeasible).toBe(true);
      expect(assessment.recommendedProfile.textureTier).toBe('4k');
    });

    it('caps maxAnisotropy at 8', () => {
      const capabilities: WebGLCapabilities = {
        supported: true,
        isWebGL2: true,
        maxTextureSize: 8192,
        maxTextureUnits: 32,
        hasAnisotropicFiltering: true,
        maxAnisotropy: 16,
        hasFloatTextureLinear: true,
        renderer: 'ANGLE (NVIDIA GeForce RTX 4090)',
      };

      const assessment = assessCapabilities(capabilities);

      expect(assessment.recommendedProfile.maxAnisotropy).toBe(8);
    });

    it('uses device maxAnisotropy when less than 8', () => {
      const capabilities: WebGLCapabilities = {
        supported: true,
        isWebGL2: true,
        maxTextureSize: 8192,
        maxTextureUnits: 32,
        hasAnisotropicFiltering: true,
        maxAnisotropy: 4,
        hasFloatTextureLinear: true,
        renderer: 'ANGLE (Intel HD Graphics)',
      };

      const assessment = assessCapabilities(capabilities);

      expect(assessment.recommendedProfile.maxAnisotropy).toBe(4);
    });
  });

  describe('capabilities object', () => {
    it('includes original capabilities in assessment', () => {
      const capabilities: WebGLCapabilities = {
        supported: true,
        isWebGL2: true,
        maxTextureSize: 8192,
        maxTextureUnits: 32,
        hasAnisotropicFiltering: true,
        maxAnisotropy: 16,
        hasFloatTextureLinear: true,
        renderer: 'ANGLE (NVIDIA GeForce GTX 1080)',
      };

      const assessment = assessCapabilities(capabilities);

      expect(assessment.capabilities).toBe(capabilities);
    });
  });

  describe('multiple blockers', () => {
    it('lists all blockers when multiple issues exist', () => {
      const capabilities: WebGLCapabilities = {
        supported: true,
        isWebGL2: false,
        maxTextureSize: 2048,
        maxTextureUnits: 8,
        hasAnisotropicFiltering: false,
        maxAnisotropy: 0,
        hasFloatTextureLinear: false,
        renderer: 'Google SwiftShader',
      };

      const assessment = assessCapabilities(capabilities);

      expect(assessment.cinematicFeasible).toBe(false);
      expect(assessment.cinematicBlockers.length).toBeGreaterThan(1);
      expect(assessment.cinematicBlockers).toContain(
        'WebGL2 required for cinematic mode'
      );
      expect(assessment.cinematicBlockers).toContain(
        'Texture size 2048 below minimum 4096'
      );
      expect(assessment.cinematicBlockers).toContain(
        'Software renderer detected (no GPU acceleration)'
      );
    });
  });
});

describe('detectWebGLCapabilities', () => {
  it('returns not supported in jsdom environment', () => {
    // jsdom doesn't support WebGL, so this should return not supported
    const capabilities = detectWebGLCapabilities();

    expect(capabilities.supported).toBe(false);
    expect(capabilities.isWebGL2).toBe(false);
    expect(capabilities.maxTextureSize).toBe(0);
    expect(capabilities.renderer).toBe('unknown');
  });
});

describe('detectAndAssess', () => {
  it('combines detection and assessment in jsdom', () => {
    // In jsdom, WebGL is not supported, so we should get a standard profile
    const assessment = detectAndAssess();

    expect(assessment.capabilities.supported).toBe(false);
    expect(assessment.cinematicFeasible).toBe(false);
    expect(assessment.cinematicBlockers).toContain('WebGL not supported');
    expect(assessment.recommendedProfile.fidelity).toBe('standard');
  });
});

describe('SSR environment handling', () => {
  // Note: Testing SSR guards in jsdom is challenging because:
  // 1. document is always defined in jsdom
  // 2. WebGLRenderingContext is read-only and cannot be mocked directly
  //
  // The SSR guards (typeof document === 'undefined') are implicitly tested
  // by running the build in a real Node.js environment during SSR.
  // These tests verify the function behavior in the jsdom test environment.

  it('returns not supported in jsdom (no WebGL context available)', () => {
    // jsdom doesn't provide actual WebGL context
    // This exercises the gl === null branch
    const capabilities = detectWebGLCapabilities();

    expect(capabilities.supported).toBe(false);
    expect(capabilities.isWebGL2).toBe(false);
  });

  it('provides complete capability object even when not supported', () => {
    const capabilities = detectWebGLCapabilities();

    // All fields should be present with default values
    expect(capabilities).toHaveProperty('supported', false);
    expect(capabilities).toHaveProperty('isWebGL2', false);
    expect(capabilities).toHaveProperty('maxTextureSize', 0);
    expect(capabilities).toHaveProperty('maxTextureUnits', 0);
    expect(capabilities).toHaveProperty('hasAnisotropicFiltering', false);
    expect(capabilities).toHaveProperty('maxAnisotropy', 0);
    expect(capabilities).toHaveProperty('hasFloatTextureLinear', false);
    expect(capabilities).toHaveProperty('renderer', 'unknown');
  });
});

describe('WebGL context edge cases', () => {
  it('handles canvas getContext returning null', () => {
    // This is actually what happens in jsdom by default
    const capabilities = detectWebGLCapabilities();

    expect(capabilities.supported).toBe(false);
    expect(capabilities.renderer).toBe('unknown');
  });
});

describe('assessCapabilities edge cases', () => {
  it('handles minimum viable cinematic configuration', () => {
    const capabilities: WebGLCapabilities = {
      supported: true,
      isWebGL2: true,
      maxTextureSize: 4096, // Exactly at minimum
      maxTextureUnits: 8,
      hasAnisotropicFiltering: false,
      maxAnisotropy: 0,
      hasFloatTextureLinear: false,
      renderer: 'Generic GPU',
    };

    const assessment = assessCapabilities(capabilities);

    expect(assessment.cinematicFeasible).toBe(true);
    expect(assessment.recommendedProfile.textureTier).toBe('4k');
  });

  it('clamps maxAnisotropy to device capability when low', () => {
    const capabilities: WebGLCapabilities = {
      supported: true,
      isWebGL2: true,
      maxTextureSize: 8192,
      maxTextureUnits: 32,
      hasAnisotropicFiltering: true,
      maxAnisotropy: 2, // Very low
      hasFloatTextureLinear: true,
      renderer: 'Test GPU',
    };

    const assessment = assessCapabilities(capabilities);

    expect(assessment.recommendedProfile.maxAnisotropy).toBe(2);
  });

  it('handles zero maxAnisotropy', () => {
    const capabilities: WebGLCapabilities = {
      supported: true,
      isWebGL2: true,
      maxTextureSize: 8192,
      maxTextureUnits: 32,
      hasAnisotropicFiltering: false,
      maxAnisotropy: 0,
      hasFloatTextureLinear: true,
      renderer: 'Test GPU',
    };

    const assessment = assessCapabilities(capabilities);

    expect(assessment.recommendedProfile.maxAnisotropy).toBe(0);
  });
});
