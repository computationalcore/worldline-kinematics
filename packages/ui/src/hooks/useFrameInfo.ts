/**
 * Hook and utilities for building frame information from worldline state.
 */

import { useMemo } from 'react';
import type { WorldlineState } from '@worldline-kinematics/core';
import { getUIContent, type UIContent } from '../i18n';

/**
 * Standard colors for each reference frame.
 * These colors are used consistently across the UI.
 */
export const FRAME_COLORS = {
  spin: '#10b981', // emerald-500
  orbit: '#3b82f6', // blue-500
  galaxy: '#8b5cf6', // violet-500
  cmb: '#f59e0b', // amber-500
} as const;

export type FrameId = keyof typeof FRAME_COLORS;

export interface FrameInfo {
  id: FrameId;
  label: string;
  description: string;
  distanceKm: number;
  speedKms: number;
  color: string;
}

export interface FrameInfoWithPercentage extends FrameInfo {
  percentage: number;
}

/**
 * Builds frame info array from worldline state.
 * Does not include percentages - use buildFrameInfoWithPercentages for that.
 */
export function buildFrameInfo(
  worldline: WorldlineState | null,
  translations: UIContent
): FrameInfo[] {
  if (!worldline) return [];

  return [
    {
      id: 'spin',
      label: translations.journey.frames.spin.label,
      description: translations.journey.frames.spin.description,
      distanceKm: worldline.distances.spin.distanceKm,
      speedKms: worldline.frames.spin.velocityKms,
      color: FRAME_COLORS.spin,
    },
    {
      id: 'orbit',
      label: translations.journey.frames.orbit.label,
      description: translations.journey.frames.orbit.description,
      distanceKm: worldline.distances.orbit.distanceKm,
      speedKms: worldline.frames.orbit.velocityKms,
      color: FRAME_COLORS.orbit,
    },
    {
      id: 'galaxy',
      label: translations.journey.frames.galaxy.label,
      description: translations.journey.frames.galaxy.description,
      distanceKm: worldline.distances.galaxy.distanceKm,
      speedKms: worldline.frames.galaxy.velocityKms,
      color: FRAME_COLORS.galaxy,
    },
    {
      id: 'cmb',
      label: translations.journey.frames.cmb.label,
      description: translations.journey.frames.cmb.description,
      distanceKm: worldline.distances.cmb.distanceKm,
      speedKms: worldline.frames.cmb.velocityKms,
      color: FRAME_COLORS.cmb,
    },
  ];
}

/**
 * Builds frame info array with percentage contribution for each frame.
 * Use this when you need to show the breakdown of total distance.
 */
export function buildFrameInfoWithPercentages(
  worldline: WorldlineState | null,
  translations: UIContent
): FrameInfoWithPercentage[] {
  if (!worldline) return [];

  const frames = buildFrameInfo(worldline, translations);
  const total = frames.reduce((sum, f) => sum + f.distanceKm, 0);

  return frames.map((frame) => ({
    ...frame,
    percentage: total > 0 ? (frame.distanceKm / total) * 100 : 0,
  }));
}

/**
 * Hook that builds and memoizes frame info from worldline state.
 * Automatically handles locale and translations.
 *
 * @param worldline Current worldline state
 * @param locale Locale for translations (default: 'en')
 * @param includePercentages Whether to include percentage calculations
 */
export function useFrameInfo(
  worldline: WorldlineState | null,
  locale?: string,
  includePercentages?: false
): FrameInfo[];
export function useFrameInfo(
  worldline: WorldlineState | null,
  locale: string | undefined,
  includePercentages: true
): FrameInfoWithPercentage[];
export function useFrameInfo(
  worldline: WorldlineState | null,
  locale = 'en',
  includePercentages = false
): FrameInfo[] | FrameInfoWithPercentage[] {
  const translations = useMemo(() => getUIContent(locale), [locale]);

  return useMemo(() => {
    if (includePercentages) {
      return buildFrameInfoWithPercentages(worldline, translations);
    }
    return buildFrameInfo(worldline, translations);
  }, [worldline, translations, includePercentages]);
}

/**
 * Computes total distance from all frames.
 */
export function computeTotalDistance(worldline: WorldlineState | null): number {
  if (!worldline) return 0;
  return (
    worldline.distances.spin.distanceKm +
    worldline.distances.orbit.distanceKm +
    worldline.distances.galaxy.distanceKm +
    worldline.distances.cmb.distanceKm
  );
}

/**
 * Computes total speed from all frames.
 */
export function computeTotalSpeed(worldline: WorldlineState | null): number {
  if (!worldline) return 0;
  return (
    worldline.frames.spin.velocityKms +
    worldline.frames.orbit.velocityKms +
    worldline.frames.galaxy.velocityKms +
    worldline.frames.cmb.velocityKms
  );
}
