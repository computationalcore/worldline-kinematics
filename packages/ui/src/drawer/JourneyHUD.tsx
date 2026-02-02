/**
 * HUD showing mission duration prominently.
 * Always visible when drawer is in peek/docked/expanded state.
 */

'use client';

import { cn } from '../utils';
import type { JourneyHUDProps, SpeedUnit } from './types';
import { getUIContent } from '../i18n';

const SPEED_UNITS: SpeedUnit[] = ['km/s', 'km/h', 'mph'];

export function JourneyHUD({
  age,
  speedUnit,
  onSpeedUnitChange,
  locale,
}: JourneyHUDProps) {
  const content = getUIContent(locale ?? 'en');
  const cycleUnit = () => {
    const idx = SPEED_UNITS.indexOf(speedUnit);
    const nextIdx = (idx + 1) % SPEED_UNITS.length;
    const nextUnit = SPEED_UNITS[nextIdx];
    if (nextUnit) {
      onSpeedUnitChange(nextUnit);
    }
  };

  const isPreBirth = age?.isPreBirth ?? false;

  // Format hours, minutes, seconds for detailed display
  const hours = age?.hours ?? 0;
  const minutes = age?.minutes ?? 0;
  const seconds = age?.seconds ?? 0;

  return (
    <div className="px-4 py-3 border-b border-white/10">
      {/* Mission Duration - prominent display */}
      <div className="text-center mb-2">
        <div className="text-[10px] text-neutral-400 uppercase tracking-wider mb-1">
          {content.journey.missionDuration}
        </div>
        <div
          className={cn(
            'font-bold tabular-nums',
            isPreBirth ? 'text-amber-400' : 'text-white'
          )}
        >
          {age ? (
            <div className="flex items-center justify-center gap-1">
              <span className="text-2xl">{age.years}</span>
              <span className="text-sm text-neutral-400">y</span>
              <span className="text-2xl">{age.months}</span>
              <span className="text-sm text-neutral-400">m</span>
              <span className="text-2xl">{age.days}</span>
              <span className="text-sm text-neutral-400">d</span>
              <span className="text-neutral-600 mx-1">|</span>
              <span className="text-lg text-neutral-300">
                {String(hours).padStart(2, '0')}
              </span>
              <span className="text-sm text-neutral-500">h</span>
              <span className="text-lg text-neutral-300">
                {String(minutes).padStart(2, '0')}
              </span>
              <span className="text-sm text-neutral-500">m</span>
              <span className="text-lg text-neutral-300">
                {String(seconds).padStart(2, '0')}
              </span>
              <span className="text-sm text-neutral-500">s</span>
            </div>
          ) : (
            <span className="text-xl">--y --m --d</span>
          )}
        </div>
      </div>

      {/* Speed unit toggle */}
      <div className="flex justify-center">
        <button
          onClick={cycleUnit}
          className="text-[10px] text-neutral-500 hover:text-neutral-300 transition-colors px-2 py-1 rounded hover:bg-white/5"
          title={content.journey.clickToChangeUnits}
        >
          {content.journey.unitsLabel} {speedUnit}
        </button>
      </div>
    </div>
  );
}
