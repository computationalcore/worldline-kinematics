/**
 * Fun conversions showing distance in relatable terms.
 */

'use client';

import {
  moonRoundTrips,
  plutoTrips,
  lightYearProgress,
  formatNumberCompact,
} from '@worldline-kinematics/core';
import type { JourneyConversionsProps } from './types';
import { getUIContent } from '../i18n';

export function JourneyConversions({ totalDistanceKm, locale }: JourneyConversionsProps) {
  const content = getUIContent(locale ?? 'en');
  const moonTrips = moonRoundTrips(totalDistanceKm);
  const pluto = plutoTrips(totalDistanceKm);
  const lyProgress = lightYearProgress(totalDistanceKm);

  return (
    <div className="px-3 py-2 border-t border-white/10">
      <div className="text-[9px] sm:text-[10px] text-neutral-500 uppercase tracking-wider mb-2">
        {content.journey.inPerspective}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {/* Moon round trips */}
        <div className="bg-white/5 rounded-lg p-2 text-center">
          <div className="text-lg sm:text-xl font-bold text-blue-400 tabular-nums">
            {formatNumberCompact(moonTrips)}
          </div>
          <div className="text-[8px] sm:text-[9px] text-neutral-400 leading-tight">
            {content.journey.moonRoundTrips}
          </div>
        </div>

        {/* Pluto passes */}
        <div className="bg-white/5 rounded-lg p-2 text-center">
          <div className="text-lg sm:text-xl font-bold text-purple-400 tabular-nums">
            {formatNumberCompact(pluto)}
          </div>
          <div className="text-[8px] sm:text-[9px] text-neutral-400 leading-tight">
            {content.journey.timesToPluto}
          </div>
        </div>

        {/* Light-year progress */}
        <div className="bg-white/5 rounded-lg p-2 text-center">
          <div className="text-lg sm:text-xl font-bold text-amber-400 tabular-nums">
            {lyProgress < 0.01 ? '<0.01' : lyProgress.toFixed(2)}%
          </div>
          <div className="text-[8px] sm:text-[9px] text-neutral-400 leading-tight">
            {content.journey.ofALightYear}
          </div>
        </div>
      </div>
    </div>
  );
}
