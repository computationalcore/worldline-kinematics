/**
 * Breakdown component showing distance and speed for each reference frame.
 */

'use client';

import {
  formatSpeedWithUnit,
  formatDistanceCompactUnified,
} from '@worldline-kinematics/core';
import type { JourneyBreakdownProps } from './types';
import { getUIContent } from '../i18n';

export function JourneyBreakdown({ frames, speedUnit, locale }: JourneyBreakdownProps) {
  const content = getUIContent(locale ?? 'en');

  return (
    <div className="px-3 py-2 space-y-1.5">
      <div className="text-[9px] sm:text-[10px] text-neutral-500 uppercase tracking-wider mb-2">
        {content.journey.breakdownTitle}
      </div>

      {frames.map((frame) => (
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
              {formatDistanceCompactUnified(frame.distanceKm, 'km')}
            </div>
          </div>

          {/* Speed */}
          <div className="text-right min-w-[60px]">
            <div className="text-xs text-neutral-300 tabular-nums">
              {formatSpeedWithUnit(frame.speedKms, speedUnit)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
