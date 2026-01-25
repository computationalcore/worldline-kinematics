/**
 * Breakdown component showing distance and speed for each reference frame.
 */

'use client';

import { kmsToKmh, kmsToMph, formatCompact } from '@worldline-kinematics/core';
import type { JourneyBreakdownProps, SpeedUnit } from './types';

/**
 * Format speed based on selected unit.
 */
function formatSpeed(kms: number, unit: SpeedUnit): string {
  switch (unit) {
    case 'km/h':
      return `${formatCompact(kmsToKmh(kms), 0)}`;
    case 'mph':
      return `${formatCompact(kmsToMph(kms), 0)}`;
    default:
      return kms.toFixed(2);
  }
}

/**
 * Format distance for compact display.
 */
function formatDistance(km: number): { value: string; unit: string } {
  if (km >= 1e12) {
    return { value: (km / 1e12).toFixed(2), unit: 'T km' };
  }
  if (km >= 1e9) {
    return { value: (km / 1e9).toFixed(2), unit: 'B km' };
  }
  if (km >= 1e6) {
    return { value: (km / 1e6).toFixed(2), unit: 'M km' };
  }
  return { value: formatCompact(km, 0), unit: 'km' };
}

export function JourneyBreakdown({ frames, speedUnit }: JourneyBreakdownProps) {
  const unitLabel = speedUnit === 'km/s' ? 'km/s' : speedUnit;

  return (
    <div className="px-3 py-2 space-y-1.5">
      <div className="text-[9px] sm:text-[10px] text-neutral-500 uppercase tracking-wider mb-2">
        Distance by Reference Frame
      </div>

      {frames.map((frame) => {
        const dist = formatDistance(frame.distanceKm);
        return (
          <div
            key={frame.id}
            className="flex items-center justify-between py-1.5 px-2 bg-white/5 rounded-lg"
          >
            {/* Frame label */}
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-white truncate">{frame.label}</div>
              <div className="text-[9px] text-neutral-500 truncate">
                {frame.description}
              </div>
            </div>

            {/* Distance */}
            <div className="text-right mx-2 min-w-[70px]">
              <div
                className="text-sm font-semibold tabular-nums"
                style={{ color: frame.color }}
              >
                {dist.value}
              </div>
              <div className="text-[8px] text-neutral-500">{dist.unit}</div>
            </div>

            {/* Speed */}
            <div className="text-right min-w-[60px]">
              <div className="text-xs text-neutral-300 tabular-nums">
                {formatSpeed(frame.speedKms, speedUnit)}
              </div>
              <div className="text-[8px] text-neutral-500">{unitLabel}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
