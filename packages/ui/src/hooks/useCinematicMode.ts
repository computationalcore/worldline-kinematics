/**
 * Hook for cinematic mode (keyboard shortcuts and UI visibility).
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

export interface UseCinematicModeOptions {
  onToggleDrawer?: () => void;
  onPlayPause?: () => void;
}

export interface UseCinematicModeReturn {
  isUIHidden: boolean;
  setUIHidden: (hidden: boolean) => void;
  toggleUIHidden: () => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  togglePlayPause: () => void;
}

/**
 * Hook for managing cinematic mode with keyboard shortcuts.
 *
 * Keyboard shortcuts:
 * - H: Toggle UI visibility
 * - J: Toggle/cycle journey drawer
 * - Space: Play/pause time
 */
export function useCinematicMode(
  options: UseCinematicModeOptions = {}
): UseCinematicModeReturn {
  const [isUIHidden, setUIHidden] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);

  const toggleUIHidden = useCallback(() => {
    setUIHidden((prev) => !prev);
  }, []);

  const togglePlayPause = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'h':
          toggleUIHidden();
          break;
        case 'j':
          options.onToggleDrawer?.();
          break;
        case ' ':
          e.preventDefault();
          togglePlayPause();
          options.onPlayPause?.();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleUIHidden, togglePlayPause, options]);

  return {
    isUIHidden,
    setUIHidden,
    toggleUIHidden,
    isPlaying,
    setIsPlaying,
    togglePlayPause,
  };
}
