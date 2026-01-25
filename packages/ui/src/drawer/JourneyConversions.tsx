/**
 * Fun conversions showing distance in relatable terms.
 */

'use client';

import {
  moonRoundTrips,
  plutoTrips,
  lightYearProgress,
} from '@worldline-kinematics/core';
import type { JourneyConversionsProps } from './types';

/**
 * Format a number with appropriate precision.
 */
function formatNumber(n: number): string {
  if (n >= 1000000) {
    return `${(n / 1000000).toFixed(1)}M`;
  }
  if (n >= 1000) {
    return `${(n / 1000).toFixed(1)}K`;
  }
  if (n >= 100) {
    return Math.floor(n).toLocaleString();
  }
  if (n >= 1) {
    return n.toFixed(1);
  }
  return n.toFixed(3);
}

export function JourneyConversions({ totalDistanceKm }: JourneyConversionsProps) {
  const moonTrips = moonRoundTrips(totalDistanceKm);
  const pluto = plutoTrips(totalDistanceKm);
  const lyProgress = lightYearProgress(totalDistanceKm);

  return (
    <div className="px-3 py-2 border-t border-white/10">
      <div className="text-[9px] sm:text-[10px] text-neutral-500 uppercase tracking-wider mb-2">
        In Perspective
      </div>

      <div className="grid grid-cols-3 gap-2">
        {/* Moon round trips */}
        <div className="bg-white/5 rounded-lg p-2 text-center">
          <div className="text-lg sm:text-xl font-bold text-blue-400 tabular-nums">
            {formatNumber(moonTrips)}
          </div>
          <div className="text-[8px] sm:text-[9px] text-neutral-400 leading-tight">
            Moon round trips
          </div>
        </div>

        {/* Pluto passes */}
        <div className="bg-white/5 rounded-lg p-2 text-center">
          <div className="text-lg sm:text-xl font-bold text-purple-400 tabular-nums">
            {formatNumber(pluto)}
          </div>
          <div className="text-[8px] sm:text-[9px] text-neutral-400 leading-tight">
            Times to Pluto
          </div>
        </div>

        {/* Light-year progress */}
        <div className="bg-white/5 rounded-lg p-2 text-center">
          <div className="text-lg sm:text-xl font-bold text-amber-400 tabular-nums">
            {lyProgress < 0.01 ? '<0.01' : lyProgress.toFixed(2)}%
          </div>
          <div className="text-[8px] sm:text-[9px] text-neutral-400 leading-tight">
            of a light-year
          </div>
        </div>
      </div>
    </div>
  );
}
