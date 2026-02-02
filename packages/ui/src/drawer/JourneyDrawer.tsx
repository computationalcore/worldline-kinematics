/**
 * Non-modal journey drawer that shows cosmic journey statistics.
 * Allows 3D scene interaction while open.
 * Styled like a "Cosmic Odometer" showing your journey through space.
 */

'use client';

import { cn } from '../utils';
import { JourneyHUD } from './JourneyHUD';
import { JourneyBreakdown } from './JourneyBreakdown';
import { JourneyConversions } from './JourneyConversions';
import { SpacetimeIcon } from '../icons';
import type { JourneyDrawerProps, DrawerState } from './types';
import { getUIContent } from '../i18n';
import { formatDistanceCompactUnified } from '@worldline-kinematics/core';
import {
  useFrameInfo,
  computeTotalDistance,
  computeTotalSpeed,
} from '../hooks/useFrameInfo';

/**
 * Get drawer height class based on state.
 */
function getDrawerHeightClass(state: DrawerState): string {
  switch (state) {
    case 'closed':
      return 'max-h-0 opacity-0';
    case 'peek':
      return 'max-h-16';
    case 'docked':
      return 'max-h-80';
    case 'expanded':
      return 'max-h-[70vh]';
    default:
      return 'max-h-16';
  }
}

export function JourneyDrawer({
  worldline,
  age,
  drawerState,
  onStateChange,
  speedUnit,
  onSpeedUnitChange,
  onChangeBirthDate,
  locale,
}: JourneyDrawerProps) {
  const content = getUIContent(locale ?? 'en');
  const frames = useFrameInfo(worldline, locale);
  const totalDistanceKm = computeTotalDistance(worldline);
  const totalSpeedKms = computeTotalSpeed(worldline);

  const isPreBirth = age?.isPreBirth ?? false;

  if (drawerState === 'closed') {
    return null;
  }

  return (
    <div
      className={cn(
        // Positioning: fixed to bottom-right, full width on mobile
        'fixed bottom-14 sm:bottom-16',
        'left-2 right-2 sm:left-auto sm:right-4 sm:w-96',
        // Styling
        'bg-black/95 backdrop-blur-md',
        'rounded-xl border border-white/20',
        // Make sure clicks work
        'pointer-events-auto',
        // Z-index above scene but below modals
        'z-[150]',
        // Animation
        'transition-all duration-300 ease-out overflow-hidden',
        getDrawerHeightClass(drawerState)
      )}
    >
      {/* Header with title */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-gradient-to-r from-blue-500/10 to-purple-500/10">
        <div className="flex items-center gap-2">
          <SpacetimeIcon size="sm" id="drawer" />
          <div>
            <span className="text-base font-semibold text-white">
              {content.journey.title}
            </span>
            <p className="text-[10px] text-white/50">{content.journey.subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              if (drawerState === 'peek') onStateChange('docked');
              else if (drawerState === 'docked') onStateChange('expanded');
              else if (drawerState === 'expanded') onStateChange('peek');
            }}
            className="p-1.5 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
            title={
              drawerState === 'expanded'
                ? content.journey.collapse
                : content.journey.expand
            }
          >
            <svg
              className={cn(
                'w-4 h-4 transition-transform',
                drawerState === 'expanded' ? 'rotate-180' : ''
              )}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 15l7-7 7 7"
              />
            </svg>
          </button>
          <button
            onClick={() => onStateChange('closed')}
            className="p-1.5 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
            title={content.journey.close}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* HUD - always visible when drawer is open */}
      <JourneyHUD
        age={age}
        totalDistanceKm={totalDistanceKm}
        currentSpeedKms={totalSpeedKms}
        speedUnit={speedUnit}
        onSpeedUnitChange={onSpeedUnitChange}
        drawerState={drawerState}
        onStateChange={onStateChange}
        locale={locale}
      />

      {/* Content container with scroll */}
      <div className="overflow-y-auto max-h-[calc(70vh-8rem)]">
        {/* Pre-birth message */}
        {isPreBirth && (
          <div className="px-4 py-6 text-center">
            <div className="text-amber-400 text-sm font-medium mb-1">
              {content.journey.journeyNotStarted}
            </div>
            <div className="text-neutral-400 text-xs">
              {content.journey.journeyBeginsAtBirth}
            </div>
          </div>
        )}

        {/* Breakdown - visible in docked and expanded states */}
        {(drawerState === 'docked' || drawerState === 'expanded') && !isPreBirth && (
          <JourneyBreakdown frames={frames} speedUnit={speedUnit} locale={locale} />
        )}

        {/* Total distance highlight - visible in docked and expanded states */}
        {(drawerState === 'docked' || drawerState === 'expanded') && !isPreBirth && (
          <div className="mx-3 mb-3 p-3 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg border border-white/10">
            <div className="text-[10px] text-neutral-400 uppercase tracking-wider mb-1">
              {content.journey.totalDistanceTraveled}
            </div>
            <div className="text-xl font-bold text-white tabular-nums">
              {formatDistanceCompactUnified(totalDistanceKm, 'km')}
            </div>
            <div className="text-xs text-neutral-400 mt-1">
              {content.journey.travelingAt}{' '}
              <span className="text-emerald-400 font-medium">
                {totalSpeedKms.toFixed(2)} km/s
              </span>
            </div>
          </div>
        )}

        {/* Conversions - only in expanded state */}
        {drawerState === 'expanded' && !isPreBirth && (
          <JourneyConversions totalDistanceKm={totalDistanceKm} locale={locale} />
        )}

        {/* Footer actions - expanded only */}
        {drawerState === 'expanded' && (
          <div className="px-3 py-2 border-t border-white/10">
            <button
              onClick={onChangeBirthDate}
              className="w-full py-1.5 text-[10px] sm:text-xs text-neutral-400 hover:text-white transition-colors"
            >
              {content.journey.changeBirthDate}
            </button>
          </div>
        )}
      </div>

      {/* Privacy note - only in expanded state */}
      {drawerState === 'expanded' && (
        <div className="px-3 py-2 border-t border-white/10 bg-white/5">
          <p className="text-[9px] text-neutral-500 text-center">
            {content.journey.privacy}
          </p>
        </div>
      )}
    </div>
  );
}
