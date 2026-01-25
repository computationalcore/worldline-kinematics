/**
 * Visual fidelity toggle component.
 *
 * Allows users to switch between Standard and Cinematic rendering modes.
 * Shows availability status and GPU capability information.
 */

'use client';

import { cn } from '../utils';

type VisualFidelity = 'standard' | 'cinematic';

interface FidelityToggleProps {
  /** Current fidelity setting */
  value: VisualFidelity;

  /** Callback when fidelity changes */
  onChange: (fidelity: VisualFidelity) => void;

  /** Whether cinematic mode is available on this device */
  cinematicAvailable: boolean;

  /** Optional reason why cinematic is unavailable */
  unavailableReason?: string;

  /** Additional CSS classes */
  className?: string;
}

/**
 * Toggle between Standard and Cinematic visual fidelity.
 * Note: Cinematic mode is currently disabled (Coming Soon).
 */
export function FidelityToggle({
  value: _value,
  onChange: _onChange,
  cinematicAvailable: _cinematicAvailable,
  unavailableReason: _unavailableReason,
  className,
}: FidelityToggleProps) {
  // Cinematic mode is disabled - always show Standard as selected
  void _value;
  void _onChange;
  void _cinematicAvailable;
  void _unavailableReason;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="text-[9px] text-white/40 uppercase tracking-wider">
        Visual Quality
      </div>

      <div className="flex gap-1 bg-black/50 rounded-lg p-1">
        {/* Standard option - always selected */}
        <button
          type="button"
          className="flex-1 px-3 py-2 rounded-md text-xs font-medium bg-neutral-700 text-white"
        >
          Standard
        </button>

        {/* Cinematic option - disabled with Coming Soon */}
        <button
          type="button"
          disabled
          className="flex-1 px-3 py-2 rounded-md text-xs font-medium text-neutral-600 cursor-not-allowed"
          title="Coming Soon"
        >
          Cinematic
          <span className="ml-1 text-[8px] text-amber-500/70">(Soon)</span>
        </button>
      </div>

      {/* Active mode description */}
      <div className="text-[9px] text-neutral-500">
        Optimized for performance on all devices
      </div>
    </div>
  );
}
