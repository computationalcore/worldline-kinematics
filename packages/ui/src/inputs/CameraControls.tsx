'use client';

/**
 * Camera controls UI component - joystick style.
 */

import { useRef, useEffect, useCallback } from 'react';

interface CameraControlsProps {
  /** Whether controls are visible */
  visible: boolean;
  /** Callback when a control action occurs */
  onControl: (action: CameraControlAction, active: boolean) => void;
  /** Additional CSS classes */
  className?: string;
}

export type CameraControlAction = 'zoomIn' | 'zoomOut' | 'left' | 'right' | 'up' | 'down';

/**
 * Joystick-style camera controls UI.
 */
export function CameraControls({
  visible,
  onControl,
  className = '',
}: CameraControlsProps) {
  const activeControls = useRef<Set<CameraControlAction>>(new Set());

  const startControl = useCallback(
    (control: CameraControlAction) => {
      if (!activeControls.current.has(control)) {
        activeControls.current.add(control);
        onControl(control, true);
      }
    },
    [onControl]
  );

  const stopControl = useCallback(
    (control: CameraControlAction) => {
      if (activeControls.current.has(control)) {
        activeControls.current.delete(control);
        onControl(control, false);
      }
    },
    [onControl]
  );

  const stopAllControls = useCallback(() => {
    activeControls.current.forEach((control) => {
      onControl(control, false);
    });
    activeControls.current.clear();
  }, [onControl]);

  // Create button props for continuous press support
  const createButtonProps = (control: CameraControlAction) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      startControl(control);
    },
    onPointerUp: () => stopControl(control),
    onPointerLeave: () => stopControl(control),
    onPointerCancel: () => stopControl(control),
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  });

  // Clean up on unmount or when hidden
  useEffect(() => {
    if (!visible) {
      stopAllControls();
    }
    return () => stopAllControls();
  }, [visible, stopAllControls]);

  if (!visible) {
    return null;
  }

  return (
    <div className={`flex items-end gap-2 sm:gap-3 ${className}`}>
      {/* Joystick - circular d-pad */}
      <div className="relative w-[72px] h-[72px] sm:w-24 sm:h-24">
        {/* Outer ring */}
        <div className="absolute inset-0 rounded-full bg-black/50 backdrop-blur-sm border border-white/20" />

        {/* Direction buttons */}
        <button
          {...createButtonProps('up')}
          className="absolute top-1 left-1/2 -translate-x-1/2 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white/10 hover:bg-white/25 active:bg-white/40 text-white/60 hover:text-white flex items-center justify-center transition-all touch-none select-none"
          aria-label="Tilt up"
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          >
            <path d="M18 15l-6-6-6 6" />
          </svg>
        </button>
        <button
          {...createButtonProps('down')}
          className="absolute bottom-1 left-1/2 -translate-x-1/2 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white/10 hover:bg-white/25 active:bg-white/40 text-white/60 hover:text-white flex items-center justify-center transition-all touch-none select-none"
          aria-label="Tilt down"
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
        <button
          {...createButtonProps('left')}
          className="absolute left-1 top-1/2 -translate-y-1/2 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white/10 hover:bg-white/25 active:bg-white/40 text-white/60 hover:text-white flex items-center justify-center transition-all touch-none select-none"
          aria-label="Rotate left"
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <button
          {...createButtonProps('right')}
          className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white/10 hover:bg-white/25 active:bg-white/40 text-white/60 hover:text-white flex items-center justify-center transition-all touch-none select-none"
          aria-label="Rotate right"
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>

        {/* Center space */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-white/5 border border-white/10" />
      </div>

      {/* Zoom slider - vertical */}
      <div className="flex flex-col items-center gap-1 bg-black/50 backdrop-blur-sm rounded-full py-2 px-1 border border-white/20">
        <button
          {...createButtonProps('zoomIn')}
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/10 hover:bg-white/25 active:bg-white/40 text-white/60 hover:text-white flex items-center justify-center transition-all touch-none select-none"
          aria-label="Zoom in"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
        <div className="w-px h-6 sm:h-8 bg-white/20" />
        <button
          {...createButtonProps('zoomOut')}
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/10 hover:bg-white/25 active:bg-white/40 text-white/60 hover:text-white flex items-center justify-center transition-all touch-none select-none"
          aria-label="Zoom out"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path d="M5 12h14" />
          </svg>
        </button>
      </div>
    </div>
  );
}
