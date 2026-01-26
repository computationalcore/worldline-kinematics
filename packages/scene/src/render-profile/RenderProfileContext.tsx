/**
 * React context for render profile configuration.
 *
 * Provides the current render profile to all scene components so they can
 * adapt their rendering quality without prop drilling.
 */

'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import {
  type RenderProfile,
  type VisualFidelity,
  type AnimationMode,
  type CapabilityAssessment,
  PROFILE_STANDARD,
  PROFILE_CINEMATIC,
} from './types';
import { detectAndAssess } from './detect-capabilities';

// ---------------------------------------------------------------------------
// Context types
// ---------------------------------------------------------------------------

interface RenderProfileContextValue {
  /** Current render profile */
  profile: RenderProfile;

  /** Capability assessment from GPU detection */
  assessment: CapabilityAssessment | null;

  /** Whether cinematic mode is available on this device */
  cinematicAvailable: boolean;

  /** Set visual fidelity (standard/cinematic) */
  setFidelity: (fidelity: VisualFidelity) => void;

  /** Set animation mode */
  setAnimation: (mode: AnimationMode) => void;

  /** Reset to auto-detected recommendation */
  resetToAuto: () => void;

  /** Whether the profile has been initialized (capabilities detected) */
  initialized: boolean;
}

const RenderProfileContext = createContext<RenderProfileContextValue | null>(null);

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Access the current render profile.
 * Must be used within a RenderProfileProvider.
 */
export function useRenderProfile(): RenderProfileContextValue {
  const ctx = useContext(RenderProfileContext);
  if (!ctx) {
    throw new Error('useRenderProfile must be used within a RenderProfileProvider');
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface RenderProfileProviderProps {
  children: ReactNode;

  /**
   * Initial fidelity override.
   * If not provided, auto-detection determines the initial value.
   */
  initialFidelity?: VisualFidelity;

  /**
   * Initial animation mode.
   * Defaults to 'subtle'.
   */
  initialAnimation?: AnimationMode;
}

/**
 * Provides render profile context to the component tree.
 *
 * On mount, detects GPU capabilities and sets the recommended profile.
 * User can override fidelity and animation settings.
 */
export function RenderProfileProvider({
  children,
  initialFidelity,
  initialAnimation = 'subtle',
}: RenderProfileProviderProps) {
  const [assessment, setAssessment] = useState<CapabilityAssessment | null>(null);
  const [profile, setProfile] = useState<RenderProfile>(() => ({
    ...PROFILE_STANDARD,
    animation: initialAnimation,
  }));
  const [initialized, setInitialized] = useState(false);

  // Detect capabilities on mount
  useEffect(() => {
    const detected = detectAndAssess();
    setAssessment(detected);

    // Apply recommended profile, respecting initial overrides
    const recommended = detected.recommendedProfile;
    setProfile({
      ...recommended,
      fidelity: initialFidelity ?? recommended.fidelity,
      animation: initialAnimation,
    });

    setInitialized(true);
  }, [initialFidelity, initialAnimation]);

  const cinematicAvailable = assessment?.cinematicFeasible ?? false;

  const setFidelity = useCallback(
    (fidelity: VisualFidelity) => {
      // Don't allow cinematic if not available
      if (fidelity === 'cinematic' && !cinematicAvailable) {
        return;
      }

      setProfile((prev) => {
        const base = fidelity === 'cinematic' ? PROFILE_CINEMATIC : PROFILE_STANDARD;
        return {
          ...base,
          animation: prev.animation, // Preserve animation mode
          // Apply capability-based adjustments
          maxAnisotropy: Math.min(
            base.maxAnisotropy,
            assessment?.capabilities.maxAnisotropy ?? 1
          ),
        };
      });
    },
    [cinematicAvailable, assessment]
  );

  const setAnimation = useCallback((mode: AnimationMode) => {
    setProfile((prev) => ({ ...prev, animation: mode }));
  }, []);

  const resetToAuto = useCallback(() => {
    if (assessment) {
      setProfile({
        ...assessment.recommendedProfile,
        animation: profile.animation, // Preserve animation preference
      });
    }
  }, [assessment, profile.animation]);

  const contextValue = useMemo<RenderProfileContextValue>(
    () => ({
      profile,
      assessment,
      cinematicAvailable,
      setFidelity,
      setAnimation,
      resetToAuto,
      initialized,
    }),
    [
      profile,
      assessment,
      cinematicAvailable,
      setFidelity,
      setAnimation,
      resetToAuto,
      initialized,
    ]
  );

  return (
    <RenderProfileContext.Provider value={contextValue}>
      {children}
    </RenderProfileContext.Provider>
  );
}
