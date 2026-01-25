/**
 * Non-modal journey drawer that shows cosmic journey statistics.
 * Allows 3D scene interaction while open.
 * Styled like a "Cosmic Odometer" showing your journey through space.
 */

'use client';

import { useMemo } from 'react';
import { cn } from '../utils';
import { JourneyHUD } from './JourneyHUD';
import { JourneyBreakdown } from './JourneyBreakdown';
import { JourneyConversions } from './JourneyConversions';
import type { JourneyDrawerProps, FrameInfo, DrawerState } from './types';

/**
 * Build frame info array from worldline state.
 * Labels match the Cosmic Odometer style.
 */
function buildFrameInfo(worldline: JourneyDrawerProps['worldline']): FrameInfo[] {
  if (!worldline) return [];

  return [
    {
      id: 'spin',
      label: '1. Rotated (Spin)',
      description: 'Distance from Earth spinning',
      distanceKm: worldline.distances.spin.distanceKm,
      speedKms: worldline.frames.spin.velocityKms,
      color: '#10b981', // emerald-500
    },
    {
      id: 'orbit',
      label: '2. Orbited Sun',
      description: 'Earth racing around the Sun',
      distanceKm: worldline.distances.orbit.distanceKm,
      speedKms: worldline.frames.orbit.velocityKms,
      color: '#3b82f6', // blue-500
    },
    {
      id: 'galaxy',
      label: '3. Solar System Travel',
      description: 'Sun moving around the Milky Way',
      distanceKm: worldline.distances.galaxy.distanceKm,
      speedKms: worldline.frames.galaxy.velocityKms,
      color: '#8b5cf6', // violet-500
    },
    {
      id: 'cmb',
      label: '4. Galactic Travel',
      description: 'Galaxy moving relative to CMB',
      distanceKm: worldline.distances.cmb.distanceKm,
      speedKms: worldline.frames.cmb.velocityKms,
      color: '#f59e0b', // amber-500
    },
  ];
}

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
}: JourneyDrawerProps) {
  const frames = useMemo(() => buildFrameInfo(worldline), [worldline]);

  // Calculate totals
  const totalDistanceKm = worldline
    ? worldline.distances.spin.distanceKm +
      worldline.distances.orbit.distanceKm +
      worldline.distances.galaxy.distanceKm +
      worldline.distances.cmb.distanceKm
    : 0;

  // Sum of all speeds for "traveling at" display
  const totalSpeedKms = worldline
    ? worldline.frames.spin.velocityKms +
      worldline.frames.orbit.velocityKms +
      worldline.frames.galaxy.velocityKms +
      worldline.frames.cmb.velocityKms
    : 0;

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
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-gradient-to-r from-blue-500/10 to-purple-500/10">
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 text-blue-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="text-base font-semibold text-white">Your Journey</span>
        </div>
        <button
          onClick={() => {
            if (drawerState === 'peek') onStateChange('docked');
            else if (drawerState === 'docked') onStateChange('expanded');
            else if (drawerState === 'expanded') onStateChange('peek');
          }}
          className="p-1.5 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
          title={drawerState === 'expanded' ? 'Collapse' : 'Expand'}
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
      />

      {/* Content container with scroll */}
      <div className="overflow-y-auto max-h-[calc(70vh-8rem)]">
        {/* Pre-birth message */}
        {isPreBirth && (
          <div className="px-4 py-6 text-center">
            <div className="text-amber-400 text-sm font-medium mb-1">
              Journey Not Yet Started
            </div>
            <div className="text-neutral-400 text-xs">
              Your cosmic journey begins at birth
            </div>
          </div>
        )}

        {/* Breakdown - visible in docked and expanded states */}
        {(drawerState === 'docked' || drawerState === 'expanded') && !isPreBirth && (
          <JourneyBreakdown frames={frames} speedUnit={speedUnit} />
        )}

        {/* Total distance highlight - visible in docked and expanded states */}
        {(drawerState === 'docked' || drawerState === 'expanded') && !isPreBirth && (
          <div className="mx-3 mb-3 p-3 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg border border-white/10">
            <div className="text-[10px] text-neutral-400 uppercase tracking-wider mb-1">
              Total Distance Traveled
            </div>
            <div className="text-xl font-bold text-white tabular-nums">
              {totalDistanceKm >= 1e12
                ? `${(totalDistanceKm / 1e12).toFixed(2)} T km`
                : totalDistanceKm >= 1e9
                  ? `${(totalDistanceKm / 1e9).toFixed(2)} B km`
                  : `${(totalDistanceKm / 1e6).toFixed(2)} M km`}
            </div>
            <div className="text-xs text-neutral-400 mt-1">
              Traveling at:{' '}
              <span className="text-emerald-400 font-medium">
                {totalSpeedKms.toFixed(2)} km/s
              </span>
            </div>
          </div>
        )}

        {/* Conversions - only in expanded state */}
        {drawerState === 'expanded' && !isPreBirth && (
          <JourneyConversions totalDistanceKm={totalDistanceKm} />
        )}

        {/* Footer actions - expanded only */}
        {drawerState === 'expanded' && (
          <div className="px-3 py-2 border-t border-white/10">
            <button
              onClick={onChangeBirthDate}
              className="w-full py-1.5 text-[10px] sm:text-xs text-neutral-400 hover:text-white transition-colors"
            >
              Change birth date
            </button>
          </div>
        )}
      </div>

      {/* Privacy note - only in expanded state */}
      {drawerState === 'expanded' && (
        <div className="px-3 py-2 border-t border-white/10 bg-white/5">
          <p className="text-[9px] text-neutral-500 text-center">
            All calculations run locally. Your data never leaves your browser.
          </p>
        </div>
      )}
    </div>
  );
}
