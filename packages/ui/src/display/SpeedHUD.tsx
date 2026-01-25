/**
 * Speed heads-up display component.
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { ReferenceFrame, FrameVelocity } from '@worldline-kinematics/core';
import { cn } from '../utils';

interface SpeedHUDProps {
  /** Current mode */
  mode: ReferenceFrame;
  /** Velocity data for current mode */
  velocity: FrameVelocity;
  /** Speed unit to display */
  unit?: 'km/s' | 'km/h' | 'mph';
  /** Additional CSS classes */
  className?: string;
}

const modeLabels: Record<ReferenceFrame, string> = {
  spin: 'Rotation Speed',
  orbit: 'Orbital Speed',
  galaxy: 'Galactic Speed',
  cmb: 'CMB Drift Speed',
};

/**
 * Formats speed value for display.
 */
function formatSpeed(kms: number, unit: 'km/s' | 'km/h' | 'mph'): string {
  switch (unit) {
    case 'km/h':
      return (kms * 3600).toLocaleString(undefined, { maximumFractionDigits: 0 });
    case 'mph':
      return ((kms * 3600) / 1.609344).toLocaleString(undefined, {
        maximumFractionDigits: 0,
      });
    default:
      return kms.toFixed(2);
  }
}

/**
 * HUD showing instantaneous speed in the current reference frame.
 */
export function SpeedHUD({ mode, velocity, unit = 'km/s', className }: SpeedHUDProps) {
  return (
    <div
      className={cn(
        'bg-neutral-900/80 backdrop-blur-md rounded-xl p-6 border border-neutral-800',
        className
      )}
    >
      <div className="text-sm text-neutral-400 mb-1">{modeLabels[mode]}</div>

      <AnimatePresence mode="wait">
        {/* Key on mode only to prevent velocity-change flicker */}
        <motion.div
          key={mode}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="flex items-baseline gap-2"
        >
          <span className="text-4xl font-bold text-white tabular-nums">
            {formatSpeed(velocity.velocityKms, unit)}
          </span>
          <span className="text-lg text-neutral-400">{unit}</span>
        </motion.div>
      </AnimatePresence>

      {velocity.hasSignificantUncertainty && velocity.uncertaintyKms && (
        <div className="mt-2 text-xs text-amber-500/80">
          Model uncertainty: ±{velocity.uncertaintyKms} km/s
        </div>
      )}
    </div>
  );
}
