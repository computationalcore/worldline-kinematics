/**
 * Tests for RenderProfileContext and useRenderProfile hook.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import {
  PROFILE_STANDARD,
  PROFILE_CINEMATIC,
  type CapabilityAssessment,
} from '../src/render-profile/types';

// Mock detectAndAssess
const mockDetectAndAssess = vi.fn();
vi.mock('../src/render-profile/detect-capabilities', () => ({
  detectAndAssess: () => mockDetectAndAssess(),
}));

// Import after mocking
import {
  RenderProfileProvider,
  useRenderProfile,
} from '../src/render-profile/RenderProfileContext';

// Helper component to access context
function ProfileDisplay() {
  const ctx = useRenderProfile();
  return (
    <div>
      <span data-testid="fidelity">{ctx.profile.fidelity}</span>
      <span data-testid="animation">{ctx.profile.animation}</span>
      <span data-testid="initialized">{ctx.initialized ? 'true' : 'false'}</span>
      <span data-testid="cinematic-available">
        {ctx.cinematicAvailable ? 'true' : 'false'}
      </span>
      <span data-testid="sphere-segments">{ctx.profile.sphereSegments}</span>
      <span data-testid="max-anisotropy">{ctx.profile.maxAnisotropy}</span>
    </div>
  );
}

// Helper component with buttons to test callbacks
function ProfileController() {
  const ctx = useRenderProfile();
  return (
    <div>
      <ProfileDisplay />
      <button onClick={() => ctx.setFidelity('cinematic')}>Set Cinematic</button>
      <button onClick={() => ctx.setFidelity('standard')}>Set Standard</button>
      <button onClick={() => ctx.setAnimation('realtime')}>Set Realtime</button>
      <button onClick={() => ctx.setAnimation('off')}>Set Off</button>
      <button onClick={() => ctx.resetToAuto()}>Reset Auto</button>
    </div>
  );
}

// Default mock assessment that supports cinematic
const createMockAssessment = (cinematicFeasible = true): CapabilityAssessment => ({
  capabilities: {
    supported: true,
    isWebGL2: true,
    maxTextureSize: 8192,
    maxTextureUnits: 32,
    hasAnisotropicFiltering: true,
    maxAnisotropy: 16,
    hasFloatTextureLinear: true,
    renderer: 'Test GPU',
  },
  cinematicFeasible,
  recommendedProfile: cinematicFeasible ? PROFILE_CINEMATIC : PROFILE_STANDARD,
  cinematicBlockers: cinematicFeasible ? [] : ['Test blocker'],
});

describe('RenderProfileContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDetectAndAssess.mockReturnValue(createMockAssessment(true));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('useRenderProfile hook', () => {
    it('throws when used outside provider', () => {
      // Suppress console.error for this test
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<ProfileDisplay />);
      }).toThrow('useRenderProfile must be used within a RenderProfileProvider');

      spy.mockRestore();
    });
  });

  describe('RenderProfileProvider', () => {
    it('provides context to children', async () => {
      render(
        <RenderProfileProvider>
          <ProfileDisplay />
        </RenderProfileProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('initialized').textContent).toBe('true');
      });

      expect(screen.getByTestId('fidelity')).toBeDefined();
    });

    it('initializes with standard animation mode by default', () => {
      // Note: In tests, useEffect runs synchronously so detection completes immediately
      // We verify the default animation mode is preserved
      mockDetectAndAssess.mockReturnValue(createMockAssessment(true));

      render(
        <RenderProfileProvider>
          <ProfileDisplay />
        </RenderProfileProvider>
      );

      // Default animation mode should be 'subtle'
      expect(screen.getByTestId('animation').textContent).toBe('subtle');
    });

    it('applies detected recommended profile after mount', async () => {
      mockDetectAndAssess.mockReturnValue(createMockAssessment(true));

      render(
        <RenderProfileProvider>
          <ProfileDisplay />
        </RenderProfileProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('initialized').textContent).toBe('true');
      });

      // Should have cinematic profile since device supports it
      expect(screen.getByTestId('fidelity').textContent).toBe('cinematic');
    });

    it('respects initialFidelity override', async () => {
      mockDetectAndAssess.mockReturnValue(createMockAssessment(true));

      render(
        <RenderProfileProvider initialFidelity="standard">
          <ProfileDisplay />
        </RenderProfileProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('initialized').textContent).toBe('true');
      });

      // Should respect override even if device supports cinematic
      expect(screen.getByTestId('fidelity').textContent).toBe('standard');
    });

    it('respects initialAnimation override', async () => {
      render(
        <RenderProfileProvider initialAnimation="off">
          <ProfileDisplay />
        </RenderProfileProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('initialized').textContent).toBe('true');
      });

      expect(screen.getByTestId('animation').textContent).toBe('off');
    });

    it('reports cinematicAvailable correctly when supported', async () => {
      mockDetectAndAssess.mockReturnValue(createMockAssessment(true));

      render(
        <RenderProfileProvider>
          <ProfileDisplay />
        </RenderProfileProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('initialized').textContent).toBe('true');
      });

      expect(screen.getByTestId('cinematic-available').textContent).toBe('true');
    });

    it('reports cinematicAvailable false when not supported', async () => {
      mockDetectAndAssess.mockReturnValue(createMockAssessment(false));

      render(
        <RenderProfileProvider>
          <ProfileDisplay />
        </RenderProfileProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('initialized').textContent).toBe('true');
      });

      expect(screen.getByTestId('cinematic-available').textContent).toBe('false');
    });
  });

  describe('setFidelity callback', () => {
    it('changes fidelity to cinematic when available', async () => {
      mockDetectAndAssess.mockReturnValue(createMockAssessment(true));

      render(
        <RenderProfileProvider initialFidelity="standard">
          <ProfileController />
        </RenderProfileProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('initialized').textContent).toBe('true');
      });

      expect(screen.getByTestId('fidelity').textContent).toBe('standard');

      act(() => {
        screen.getByText('Set Cinematic').click();
      });

      expect(screen.getByTestId('fidelity').textContent).toBe('cinematic');
    });

    it('prevents cinematic when not available', async () => {
      mockDetectAndAssess.mockReturnValue(createMockAssessment(false));

      render(
        <RenderProfileProvider>
          <ProfileController />
        </RenderProfileProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('initialized').textContent).toBe('true');
      });

      expect(screen.getByTestId('fidelity').textContent).toBe('standard');

      act(() => {
        screen.getByText('Set Cinematic').click();
      });

      // Should still be standard since cinematic is not available
      expect(screen.getByTestId('fidelity').textContent).toBe('standard');
    });

    it('changes fidelity back to standard', async () => {
      mockDetectAndAssess.mockReturnValue(createMockAssessment(true));

      render(
        <RenderProfileProvider>
          <ProfileController />
        </RenderProfileProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('initialized').textContent).toBe('true');
      });

      // Start with cinematic (recommended)
      expect(screen.getByTestId('fidelity').textContent).toBe('cinematic');

      act(() => {
        screen.getByText('Set Standard').click();
      });

      expect(screen.getByTestId('fidelity').textContent).toBe('standard');
    });

    it('preserves animation mode when changing fidelity', async () => {
      mockDetectAndAssess.mockReturnValue(createMockAssessment(true));

      render(
        <RenderProfileProvider initialFidelity="standard" initialAnimation="off">
          <ProfileController />
        </RenderProfileProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('initialized').textContent).toBe('true');
      });

      expect(screen.getByTestId('animation').textContent).toBe('off');

      act(() => {
        screen.getByText('Set Cinematic').click();
      });

      // Animation should still be 'off'
      expect(screen.getByTestId('animation').textContent).toBe('off');
    });

    it('clamps maxAnisotropy to device capability', async () => {
      const assessment = createMockAssessment(true);
      assessment.capabilities.maxAnisotropy = 4; // Device only supports 4
      mockDetectAndAssess.mockReturnValue(assessment);

      render(
        <RenderProfileProvider initialFidelity="standard">
          <ProfileController />
        </RenderProfileProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('initialized').textContent).toBe('true');
      });

      act(() => {
        screen.getByText('Set Cinematic').click();
      });

      // PROFILE_CINEMATIC.maxAnisotropy is 8, but device only supports 4
      expect(screen.getByTestId('max-anisotropy').textContent).toBe('4');
    });
  });

  describe('setAnimation callback', () => {
    it('changes animation mode to realtime', async () => {
      render(
        <RenderProfileProvider initialAnimation="subtle">
          <ProfileController />
        </RenderProfileProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('initialized').textContent).toBe('true');
      });

      act(() => {
        screen.getByText('Set Realtime').click();
      });

      expect(screen.getByTestId('animation').textContent).toBe('realtime');
    });

    it('changes animation mode to off', async () => {
      render(
        <RenderProfileProvider initialAnimation="subtle">
          <ProfileController />
        </RenderProfileProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('initialized').textContent).toBe('true');
      });

      act(() => {
        screen.getByText('Set Off').click();
      });

      expect(screen.getByTestId('animation').textContent).toBe('off');
    });
  });

  describe('resetToAuto callback', () => {
    it('resets to recommended profile', async () => {
      mockDetectAndAssess.mockReturnValue(createMockAssessment(true));

      render(
        <RenderProfileProvider initialFidelity="standard">
          <ProfileController />
        </RenderProfileProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('initialized').textContent).toBe('true');
      });

      // Start with standard (override)
      expect(screen.getByTestId('fidelity').textContent).toBe('standard');

      act(() => {
        screen.getByText('Reset Auto').click();
      });

      // Should reset to cinematic (recommended)
      expect(screen.getByTestId('fidelity').textContent).toBe('cinematic');
    });

    it('preserves animation preference when resetting', async () => {
      mockDetectAndAssess.mockReturnValue(createMockAssessment(true));

      render(
        <RenderProfileProvider initialFidelity="standard" initialAnimation="off">
          <ProfileController />
        </RenderProfileProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('initialized').textContent).toBe('true');
      });

      act(() => {
        screen.getByText('Reset Auto').click();
      });

      // Animation should still be 'off'
      expect(screen.getByTestId('animation').textContent).toBe('off');
    });

    it('does nothing if assessment is null', async () => {
      // This tests the edge case where resetToAuto is called before detection
      mockDetectAndAssess.mockReturnValue(createMockAssessment(true));

      render(
        <RenderProfileProvider>
          <ProfileController />
        </RenderProfileProvider>
      );

      // Don't wait for initialization - immediately try to reset
      // The resetToAuto should handle null assessment gracefully
      act(() => {
        screen.getByText('Reset Auto').click();
      });

      // Should not throw, component should still be rendered
      expect(screen.getByTestId('fidelity')).toBeDefined();
    });
  });

  describe('profile values', () => {
    it('standard profile has correct sphere segments', async () => {
      mockDetectAndAssess.mockReturnValue(createMockAssessment(false));

      render(
        <RenderProfileProvider>
          <ProfileDisplay />
        </RenderProfileProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('initialized').textContent).toBe('true');
      });

      expect(screen.getByTestId('sphere-segments').textContent).toBe('32');
    });

    it('cinematic profile has correct sphere segments', async () => {
      mockDetectAndAssess.mockReturnValue(createMockAssessment(true));

      render(
        <RenderProfileProvider>
          <ProfileDisplay />
        </RenderProfileProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('initialized').textContent).toBe('true');
      });

      expect(screen.getByTestId('sphere-segments').textContent).toBe('128');
    });
  });
});

describe('Profile Constants', () => {
  it('PROFILE_STANDARD has expected values', () => {
    expect(PROFILE_STANDARD.fidelity).toBe('standard');
    expect(PROFILE_STANDARD.animation).toBe('subtle');
    expect(PROFILE_STANDARD.dpr).toBe(1);
    expect(PROFILE_STANDARD.enableShadows).toBe(false);
    expect(PROFILE_STANDARD.enableBloom).toBe(true);
    expect(PROFILE_STANDARD.sphereSegments).toBe(32);
    expect(PROFILE_STANDARD.textureTier).toBe('2k');
    expect(PROFILE_STANDARD.useCompressedTextures).toBe(false);
    expect(PROFILE_STANDARD.maxAnisotropy).toBe(1);
  });

  it('PROFILE_CINEMATIC has expected values', () => {
    expect(PROFILE_CINEMATIC.fidelity).toBe('cinematic');
    expect(PROFILE_CINEMATIC.animation).toBe('realtime');
    expect(PROFILE_CINEMATIC.dpr).toBe(1.5);
    expect(PROFILE_CINEMATIC.enableShadows).toBe(true);
    expect(PROFILE_CINEMATIC.enableBloom).toBe(true);
    expect(PROFILE_CINEMATIC.sphereSegments).toBe(128);
    expect(PROFILE_CINEMATIC.textureTier).toBe('4k');
    expect(PROFILE_CINEMATIC.useCompressedTextures).toBe(true);
    expect(PROFILE_CINEMATIC.maxAnisotropy).toBe(8);
  });
});
