/**
 * Fullscreen-safe scene wrapper with overlay system.
 *
 * This component solves the "controls disappear in fullscreen" problem by
 * establishing a single DOM element that:
 * 1. Becomes the fullscreen target
 * 2. Contains both the 3D canvas AND all overlay UI
 * 3. Uses CSS layers (z-index) to stack overlays above canvas
 *
 * Architecture:
 * ```
 * SceneShell (fullscreen target, fills viewport)
 * +-- Canvas Layer (absolute, no z-index - allows Scene overlays to show)
 * |   +-- Scene (with internal overlays at z-50)
 * +-- Overlay Layer (absolute, z-[100], pointer-events-none container)
 *     +-- Top bar (title, controls)
 *     +-- Corners (HUD, buttons)
 *     +-- Bottom (mode selector, anchored with safe-area)
 * ```
 *
 * All overlay children receive pointer-events-auto so they remain interactive.
 */

'use client';

import { createContext, useContext, type ReactNode, type CSSProperties } from 'react';
import { useFullscreen } from '@worldline-kinematics/ui';

// ---------------------------------------------------------------------------
// Context for nested components to access fullscreen state
// ---------------------------------------------------------------------------

interface SceneShellContextValue {
  isFullscreen: boolean;
  toggleFullscreen: () => Promise<void>;
  isSupported: boolean;
}

const SceneShellContext = createContext<SceneShellContextValue | null>(null);

/**
 * Hook to access SceneShell context from child components.
 * Throws if used outside SceneShell.
 */
export function useSceneShell(): SceneShellContextValue {
  const ctx = useContext(SceneShellContext);
  if (!ctx) {
    throw new Error('useSceneShell must be used within a SceneShell');
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Overlay slot components
// ---------------------------------------------------------------------------

interface OverlaySlotProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/**
 * Top-left overlay slot.
 * Use for scene options, settings panels.
 */
export function OverlayTopLeft({ children, className = '', style }: OverlaySlotProps) {
  return (
    <div
      className={`pointer-events-auto absolute left-4 top-4 ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}

/**
 * Top-center overlay slot.
 * Use for title, header information.
 */
export function OverlayTopCenter({ children, className = '', style }: OverlaySlotProps) {
  return (
    <div
      className={`pointer-events-auto absolute left-1/2 top-4 -translate-x-1/2 ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}

/**
 * Top-right overlay slot.
 * Use for HUD, speed display.
 */
export function OverlayTopRight({ children, className = '', style }: OverlaySlotProps) {
  return (
    <div
      className={`pointer-events-auto absolute right-4 top-4 ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}

/**
 * Bottom-left overlay slot.
 * Use for info labels, fullscreen button.
 */
export function OverlayBottomLeft({ children, className = '', style }: OverlaySlotProps) {
  return (
    <div
      className={`pointer-events-auto absolute bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}

/**
 * Bottom-center overlay slot with safe-area handling.
 * Use for mode selector, primary controls.
 * Respects device safe areas (notches, home indicators).
 */
export function OverlayBottomCenter({
  children,
  className = '',
  style,
}: OverlaySlotProps) {
  return (
    <div
      className={`pointer-events-auto absolute bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}

/**
 * Bottom-right overlay slot.
 * Use for body selector, secondary controls.
 */
export function OverlayBottomRight({
  children,
  className = '',
  style,
}: OverlaySlotProps) {
  return (
    <div
      className={`pointer-events-auto absolute bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Fullscreen toggle button
// ---------------------------------------------------------------------------

interface FullscreenButtonProps {
  className?: string;
}

/**
 * Fullscreen toggle button that automatically uses SceneShell context.
 * Renders expand icon when not fullscreen, compress icon when fullscreen.
 */
export function FullscreenButton({ className = '' }: FullscreenButtonProps) {
  const { isFullscreen, toggleFullscreen, isSupported } = useSceneShell();

  if (!isSupported) return null;

  return (
    <button
      onClick={toggleFullscreen}
      className={`bg-black/70 backdrop-blur-sm p-2 rounded-lg border border-white/20
                  text-white/70 hover:text-white hover:bg-black/80 transition-colors ${className}`}
      title={isFullscreen ? 'Exit fullscreen (Esc)' : 'Enter fullscreen'}
      aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
    >
      {isFullscreen ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="4 14 10 14 10 20" />
          <polyline points="20 10 14 10 14 4" />
          <line x1="14" y1="10" x2="21" y2="3" />
          <line x1="3" y1="21" x2="10" y2="14" />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="15 3 21 3 21 9" />
          <polyline points="9 21 3 21 3 15" />
          <line x1="21" y1="3" x2="14" y2="10" />
          <line x1="3" y1="21" x2="10" y2="14" />
        </svg>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main SceneShell component
// ---------------------------------------------------------------------------

interface SceneShellProps {
  /**
   * 3D canvas content (R3F Canvas or similar).
   * Rendered in the canvas layer behind overlays.
   */
  children: ReactNode;

  /**
   * Overlay UI elements.
   * Should use OverlayTopLeft, OverlayBottomCenter, etc. for positioning.
   */
  overlay?: ReactNode;

  /**
   * Additional classes for the shell container.
   * Useful for controlling height from parent.
   */
  className?: string;

  /**
   * Inline styles for the shell container.
   */
  style?: CSSProperties;
}

/**
 * Fullscreen-safe scene wrapper.
 *
 * Wraps a 3D canvas with an overlay system that remains visible in fullscreen.
 * The shell element itself becomes the fullscreen target, containing both
 * canvas and overlay children.
 *
 * @example
 * ```tsx
 * <SceneShell
 *   className="h-[60vh]"
 *   overlay={
 *     <>
 *       <OverlayTopRight>
 *         <SpeedHUD mode={mode} velocity={velocity} />
 *       </OverlayTopRight>
 *       <OverlayBottomCenter>
 *         <ModeSelector value={mode} onChange={setMode} />
 *       </OverlayBottomCenter>
 *       <OverlayBottomLeft>
 *         <FullscreenButton />
 *       </OverlayBottomLeft>
 *     </>
 *   }
 * >
 *   <Canvas>
 *     <SceneContent ... />
 *   </Canvas>
 * </SceneShell>
 * ```
 */
export function SceneShell({
  children,
  overlay,
  className = '',
  style,
}: SceneShellProps) {
  const { ref, isFullscreen, toggle, isSupported } = useFullscreen();

  const contextValue: SceneShellContextValue = {
    isFullscreen,
    toggleFullscreen: toggle,
    isSupported,
  };

  return (
    <SceneShellContext.Provider value={contextValue}>
      <div
        ref={ref}
        className={`relative overflow-hidden bg-[#050508] ${className}`}
        style={{
          // Ensure proper containment for absolute children
          contain: 'layout',
          ...style,
        }}
      >
        {/*
          Canvas layer - fills container.
          No z-index here to avoid creating a stacking context that would trap
          the Scene's internal overlays (SpeedHUD, SceneOptionsPanel, etc.)
        */}
        <div className="absolute inset-0">{children}</div>

        {/*
          Overlay layer - sits above everything including Scene's internal overlays.
          z-[100] ensures it's above Scene's overlays (which use z-10/z-20 internally).
          pointer-events-none allows clicks to pass through to the scene.
        */}
        <div className="pointer-events-none absolute inset-0 z-[100]">{overlay}</div>
      </div>
    </SceneShellContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Re-exports for convenience
// ---------------------------------------------------------------------------

export { useFullscreen } from '@worldline-kinematics/ui';
