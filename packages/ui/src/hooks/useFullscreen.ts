/**
 * Fullscreen management hook with cross-browser support.
 *
 * Provides a ref to attach to the fullscreen target element, current state,
 * and imperative enter/exit/toggle functions. Handles Safari prefixes and
 * proper cleanup on unmount.
 */

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

export interface FullscreenAPI {
  /** Ref to attach to the element that should become fullscreen */
  ref: React.RefObject<HTMLDivElement | null>;
  /** Whether the element is currently fullscreen */
  isFullscreen: boolean;
  /** Whether fullscreen is supported in this browser */
  isSupported: boolean;
  /** Enter fullscreen mode */
  enter: () => Promise<void>;
  /** Exit fullscreen mode */
  exit: () => Promise<void>;
  /** Toggle fullscreen mode */
  toggle: () => Promise<void>;
}

/**
 * Detects whether fullscreen API is available.
 * Checks both standard and webkit-prefixed versions.
 */
function isFullscreenSupported(): boolean {
  if (typeof document === 'undefined') return false;

  return !!(
    document.fullscreenEnabled ||
    (document as unknown as { webkitFullscreenEnabled?: boolean }).webkitFullscreenEnabled
  );
}

/**
 * Gets the current fullscreen element, handling vendor prefixes.
 */
function getFullscreenElement(): Element | null {
  if (typeof document === 'undefined') return null;

  return (
    document.fullscreenElement ||
    (document as unknown as { webkitFullscreenElement?: Element })
      .webkitFullscreenElement ||
    null
  );
}

/**
 * Subscribes to fullscreen change events across vendors.
 */
function subscribeToFullscreenChange(callback: () => void): () => void {
  if (typeof document === 'undefined') return () => {};

  document.addEventListener('fullscreenchange', callback);
  document.addEventListener('webkitfullscreenchange', callback);

  return () => {
    document.removeEventListener('fullscreenchange', callback);
    document.removeEventListener('webkitfullscreenchange', callback);
  };
}

/**
 * Hook for managing fullscreen state on a DOM element.
 *
 * Uses useSyncExternalStore for safe concurrent rendering and proper
 * subscription to the fullscreen API events.
 *
 * @returns Fullscreen API object
 */
export function useFullscreen(): FullscreenAPI {
  const ref = useRef<HTMLDivElement | null>(null);
  // Defer isSupported check to avoid hydration mismatch
  // Start with false on both server and client, then update on mount
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported(isFullscreenSupported());
  }, []);

  // Track which element we made fullscreen to correctly determine isFullscreen
  const fullscreenElementRef = useRef<Element | null>(null);

  // Use useSyncExternalStore for safe subscription to external state
  const isFullscreen = useSyncExternalStore(
    subscribeToFullscreenChange,
    () => {
      const current = getFullscreenElement();
      // Only return true if OUR element is fullscreen
      return current !== null && current === ref.current;
    },
    () => false // SSR snapshot
  );

  const enter = useCallback(async (): Promise<void> => {
    const element = ref.current;
    if (!element || !isSupported) return;

    try {
      // Standard API
      if (element.requestFullscreen) {
        await element.requestFullscreen();
        fullscreenElementRef.current = element;
        return;
      }

      // Safari prefix
      const webkitElement = element as unknown as {
        webkitRequestFullscreen?: () => Promise<void>;
      };
      if (webkitElement.webkitRequestFullscreen) {
        await webkitElement.webkitRequestFullscreen();
        fullscreenElementRef.current = element;
      }
    } catch {
      // User rejected or browser blocked - fail silently
      // Common in iframes or when document isn't focused
    }
  }, [isSupported]);

  const exit = useCallback(async (): Promise<void> => {
    if (!isSupported) return;

    try {
      // Standard API
      if (document.exitFullscreen) {
        await document.exitFullscreen();
        fullscreenElementRef.current = null;
        return;
      }

      // Safari prefix
      const webkitDocument = document as unknown as {
        webkitExitFullscreen?: () => Promise<void>;
      };
      if (webkitDocument.webkitExitFullscreen) {
        await webkitDocument.webkitExitFullscreen();
        fullscreenElementRef.current = null;
      }
    } catch {
      // Exit fullscreen failed - fail silently
    }
  }, [isSupported]);

  const toggle = useCallback(async (): Promise<void> => {
    if (isFullscreen) {
      await exit();
    } else {
      await enter();
    }
  }, [isFullscreen, enter, exit]);

  // Cleanup: exit fullscreen if component unmounts while fullscreen
  useEffect(() => {
    const element = ref.current;
    return () => {
      if (getFullscreenElement() === element) {
        document.exitFullscreen?.().catch(() => {});
      }
    };
  }, []);

  return {
    ref,
    isFullscreen,
    isSupported,
    enter,
    exit,
    toggle,
  };
}
