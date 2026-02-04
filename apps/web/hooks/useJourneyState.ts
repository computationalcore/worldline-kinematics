/**
 * Hook for persisting journey drawer state to localStorage.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import type { DrawerState, SpeedUnit } from '@worldline-kinematics/ui';

const STORAGE_KEY = 'wk:journey-drawer';

interface JourneyDrawerState {
  drawerState: DrawerState;
  speedUnit: SpeedUnit;
}

const DEFAULT_STATE: JourneyDrawerState = {
  drawerState: 'peek',
  speedUnit: 'km/s',
};

/**
 * Load state from localStorage.
 */
function loadState(): JourneyDrawerState {
  if (typeof window === 'undefined') {
    return DEFAULT_STATE;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<JourneyDrawerState>;
      return {
        drawerState: parsed.drawerState ?? DEFAULT_STATE.drawerState,
        speedUnit: parsed.speedUnit ?? DEFAULT_STATE.speedUnit,
      };
    }
  } catch (_error) {
    // Clear corrupted state silently
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // localStorage removal also failed, ignore
    }
  }

  return DEFAULT_STATE;
}

/**
 * Save state to localStorage.
 */
function saveState(state: JourneyDrawerState): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage failed (quota exceeded, etc.) — ignore silently
  }
}

export interface UseJourneyStateReturn {
  drawerState: DrawerState;
  setDrawerState: (state: DrawerState) => void;
  speedUnit: SpeedUnit;
  setSpeedUnit: (unit: SpeedUnit) => void;
  cycleDrawerState: () => void;
}

/**
 * Hook for managing journey drawer state with localStorage persistence.
 */
export function useJourneyState(): UseJourneyStateReturn {
  const [state, setState] = useState<JourneyDrawerState>(DEFAULT_STATE);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    setState(loadState());
    setIsHydrated(true);
  }, []);

  // Save to localStorage when state changes
  useEffect(() => {
    if (isHydrated) {
      saveState(state);
    }
  }, [state, isHydrated]);

  const setDrawerState = useCallback((drawerState: DrawerState) => {
    setState((prev) => ({ ...prev, drawerState }));
  }, []);

  const setSpeedUnit = useCallback((speedUnit: SpeedUnit) => {
    setState((prev) => ({ ...prev, speedUnit }));
  }, []);

  const cycleDrawerState = useCallback(() => {
    setState((prev) => {
      const order: DrawerState[] = ['closed', 'peek', 'docked', 'expanded'];
      const currentIdx = order.indexOf(prev.drawerState);
      const nextIdx = (currentIdx + 1) % order.length;
      return { ...prev, drawerState: order[nextIdx] };
    });
  }, []);

  return {
    drawerState: state.drawerState,
    setDrawerState,
    speedUnit: state.speedUnit,
    setSpeedUnit,
    cycleDrawerState,
  };
}
