/**
 * Types for the Journey Drawer components.
 */

import type { WorldlineState, AgeDuration } from '@worldline-kinematics/core';
import type { FrameInfo, FrameInfoWithPercentage, FrameId } from '../hooks/useFrameInfo';

// Re-export FrameInfo from the shared hooks module
export type { FrameInfo, FrameInfoWithPercentage, FrameId };

/**
 * Drawer visibility states.
 * - closed: completely hidden
 * - peek: HUD bar only (minimal)
 * - docked: HUD + breakdown rows
 * - expanded: full view with conversions and manual
 */
export type DrawerState = 'closed' | 'peek' | 'docked' | 'expanded';

/**
 * Speed unit preference.
 */
export type SpeedUnit = 'km/s' | 'km/h' | 'mph';

/**
 * Props for the main JourneyDrawer component.
 */
export interface JourneyDrawerProps {
  worldline: WorldlineState | null;
  age: AgeDuration | null;
  drawerState: DrawerState;
  onStateChange: (state: DrawerState) => void;
  speedUnit: SpeedUnit;
  onSpeedUnitChange: (unit: SpeedUnit) => void;
  onChangeBirthDate: () => void;
  locale?: string;
}

/**
 * Props for the HUD component.
 */
export interface JourneyHUDProps {
  age: AgeDuration | null;
  totalDistanceKm: number;
  currentSpeedKms: number;
  speedUnit: SpeedUnit;
  onSpeedUnitChange: (unit: SpeedUnit) => void;
  drawerState: DrawerState;
  onStateChange: (state: DrawerState) => void;
  locale?: string;
}

/**
 * Props for the breakdown component.
 */
export interface JourneyBreakdownProps {
  frames: FrameInfo[];
  speedUnit: SpeedUnit;
  locale?: string;
}

/**
 * Props for the conversions component.
 */
export interface JourneyConversionsProps {
  totalDistanceKm: number;
  locale?: string;
}
