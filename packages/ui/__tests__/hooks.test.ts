/**
 * Tests for UI hooks.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCinematicMode } from '../src/hooks/useCinematicMode';
import { useFullscreen } from '../src/hooks/useFullscreen';
import { useGeolocation } from '../src/hooks/useGeolocation';
import {
  FRAME_COLORS,
  buildFrameInfo,
  buildFrameInfoWithPercentages,
  useFrameInfo,
  computeTotalDistance,
  computeTotalSpeed,
} from '../src/hooks/useFrameInfo';
import { getUIContent } from '../src/i18n';
import type { WorldlineState } from '@worldline-kinematics/core';

describe('useCinematicMode', () => {
  describe('initial state', () => {
    it('starts with UI visible', () => {
      const { result } = renderHook(() => useCinematicMode());
      expect(result.current.isUIHidden).toBe(false);
    });

    it('starts playing', () => {
      const { result } = renderHook(() => useCinematicMode());
      expect(result.current.isPlaying).toBe(true);
    });
  });

  describe('toggle functions', () => {
    it('toggleUIHidden toggles UI visibility', () => {
      const { result } = renderHook(() => useCinematicMode());

      act(() => {
        result.current.toggleUIHidden();
      });
      expect(result.current.isUIHidden).toBe(true);

      act(() => {
        result.current.toggleUIHidden();
      });
      expect(result.current.isUIHidden).toBe(false);
    });

    it('setUIHidden sets UI visibility directly', () => {
      const { result } = renderHook(() => useCinematicMode());

      act(() => {
        result.current.setUIHidden(true);
      });
      expect(result.current.isUIHidden).toBe(true);

      act(() => {
        result.current.setUIHidden(false);
      });
      expect(result.current.isUIHidden).toBe(false);
    });

    it('togglePlayPause toggles playing state', () => {
      const { result } = renderHook(() => useCinematicMode());

      act(() => {
        result.current.togglePlayPause();
      });
      expect(result.current.isPlaying).toBe(false);

      act(() => {
        result.current.togglePlayPause();
      });
      expect(result.current.isPlaying).toBe(true);
    });

    it('setIsPlaying sets playing state directly', () => {
      const { result } = renderHook(() => useCinematicMode());

      act(() => {
        result.current.setIsPlaying(false);
      });
      expect(result.current.isPlaying).toBe(false);

      act(() => {
        result.current.setIsPlaying(true);
      });
      expect(result.current.isPlaying).toBe(true);
    });
  });

  describe('keyboard shortcuts', () => {
    it('H key toggles UI visibility', () => {
      const { result } = renderHook(() => useCinematicMode());

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'h' }));
      });
      expect(result.current.isUIHidden).toBe(true);

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'H' }));
      });
      expect(result.current.isUIHidden).toBe(false);
    });

    it('Space key toggles play/pause', () => {
      const { result } = renderHook(() => useCinematicMode());

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
      });
      expect(result.current.isPlaying).toBe(false);
    });

    it('J key calls onToggleDrawer callback', () => {
      const onToggleDrawer = vi.fn();
      renderHook(() => useCinematicMode({ onToggleDrawer }));

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'j' }));
      });
      expect(onToggleDrawer).toHaveBeenCalledTimes(1);
    });

    it('Space key calls onPlayPause callback', () => {
      const onPlayPause = vi.fn();
      renderHook(() => useCinematicMode({ onPlayPause }));

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
      });
      expect(onPlayPause).toHaveBeenCalledTimes(1);
    });

    it('ignores key events from input elements', () => {
      const { result } = renderHook(() => useCinematicMode());

      // Create an input element and set it as the target
      const input = document.createElement('input');
      const event = new KeyboardEvent('keydown', { key: 'h' });
      Object.defineProperty(event, 'target', { value: input });

      act(() => {
        window.dispatchEvent(event);
      });
      expect(result.current.isUIHidden).toBe(false);
    });

    it('ignores key events from textarea elements', () => {
      const { result } = renderHook(() => useCinematicMode());

      const textarea = document.createElement('textarea');
      const event = new KeyboardEvent('keydown', { key: 'h' });
      Object.defineProperty(event, 'target', { value: textarea });

      act(() => {
        window.dispatchEvent(event);
      });
      expect(result.current.isUIHidden).toBe(false);
    });

    it('ignores key events from select elements', () => {
      const { result } = renderHook(() => useCinematicMode());

      const select = document.createElement('select');
      const event = new KeyboardEvent('keydown', { key: 'h' });
      Object.defineProperty(event, 'target', { value: select });

      act(() => {
        window.dispatchEvent(event);
      });
      expect(result.current.isUIHidden).toBe(false);
    });
  });

  describe('cleanup', () => {
    it('removes event listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
      const { unmount } = renderHook(() => useCinematicMode());

      unmount();
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function)
      );

      removeEventListenerSpy.mockRestore();
    });
  });
});

describe('useFullscreen', () => {
  describe('initial state', () => {
    it('returns a ref object', () => {
      const { result } = renderHook(() => useFullscreen());
      expect(result.current.ref).toBeDefined();
      expect(result.current.ref.current).toBeNull();
    });

    it('starts not fullscreen', () => {
      const { result } = renderHook(() => useFullscreen());
      expect(result.current.isFullscreen).toBe(false);
    });

    it('checks support after mount', async () => {
      const { result, rerender } = renderHook(() => useFullscreen());

      // Initially false (SSR safety)
      expect(result.current.isSupported).toBe(false);

      // After useEffect runs
      await act(async () => {
        rerender();
      });

      // jsdom doesn't support fullscreen, so this should still be false
      expect(result.current.isSupported).toBe(false);
    });
  });

  describe('API methods', () => {
    it('enter does nothing when not supported', async () => {
      const { result } = renderHook(() => useFullscreen());

      await act(async () => {
        await result.current.enter();
      });

      expect(result.current.isFullscreen).toBe(false);
    });

    it('exit does nothing when not supported', async () => {
      const { result } = renderHook(() => useFullscreen());

      await act(async () => {
        await result.current.exit();
      });

      expect(result.current.isFullscreen).toBe(false);
    });

    it('toggle does nothing when not supported', async () => {
      const { result } = renderHook(() => useFullscreen());

      await act(async () => {
        await result.current.toggle();
      });

      expect(result.current.isFullscreen).toBe(false);
    });
  });
});

describe('useGeolocation', () => {
  const mockGeolocation = {
    getCurrentPosition: vi.fn(),
    watchPosition: vi.fn(),
    clearWatch: vi.fn(),
  };

  beforeEach(() => {
    vi.stubGlobal('navigator', { geolocation: mockGeolocation });
    mockGeolocation.getCurrentPosition.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('initial state', () => {
    it('starts with null coordinates', () => {
      const { result } = renderHook(() => useGeolocation());

      expect(result.current.latitude).toBeNull();
      expect(result.current.longitude).toBeNull();
      expect(result.current.accuracy).toBeNull();
    });

    it('starts not loading', () => {
      const { result } = renderHook(() => useGeolocation());
      expect(result.current.loading).toBe(false);
    });

    it('starts with no error', () => {
      const { result } = renderHook(() => useGeolocation());
      expect(result.current.error).toBeNull();
    });

    it('starts with null source', () => {
      const { result } = renderHook(() => useGeolocation());
      expect(result.current.source).toBeNull();
    });
  });

  describe('requestLocation', () => {
    it('sets loading true when requesting', () => {
      const { result } = renderHook(() => useGeolocation());

      act(() => {
        result.current.requestLocation();
      });

      expect(result.current.loading).toBe(true);
    });

    it('calls navigator.geolocation.getCurrentPosition', () => {
      const { result } = renderHook(() => useGeolocation());

      act(() => {
        result.current.requestLocation();
      });

      expect(mockGeolocation.getCurrentPosition).toHaveBeenCalledTimes(1);
    });

    it('updates state on successful position', () => {
      const { result } = renderHook(() => useGeolocation());

      act(() => {
        result.current.requestLocation();
      });

      // Get the success callback
      const successCallback = mockGeolocation.getCurrentPosition.mock.calls[0][0];

      act(() => {
        successCallback({
          coords: {
            latitude: 40.7128,
            longitude: -74.006,
            accuracy: 100,
          },
        });
      });

      expect(result.current.latitude).toBe(40.7128);
      expect(result.current.longitude).toBe(-74.006);
      expect(result.current.accuracy).toBe(100);
      expect(result.current.loading).toBe(false);
      expect(result.current.source).toBe('gps');
    });

    it('handles permission denied error', () => {
      const { result } = renderHook(() => useGeolocation());

      act(() => {
        result.current.requestLocation();
      });

      const errorCallback = mockGeolocation.getCurrentPosition.mock.calls[0][1];

      act(() => {
        errorCallback({
          code: 1, // PERMISSION_DENIED
          PERMISSION_DENIED: 1,
        });
      });

      expect(result.current.error).toBe('Location permission denied');
      expect(result.current.loading).toBe(false);
    });

    it('handles position unavailable error', () => {
      const { result } = renderHook(() => useGeolocation());

      act(() => {
        result.current.requestLocation();
      });

      const errorCallback = mockGeolocation.getCurrentPosition.mock.calls[0][1];

      act(() => {
        errorCallback({
          code: 2, // POSITION_UNAVAILABLE
          POSITION_UNAVAILABLE: 2,
        });
      });

      expect(result.current.error).toBe('Location unavailable');
    });

    it('handles timeout error', () => {
      const { result } = renderHook(() => useGeolocation());

      act(() => {
        result.current.requestLocation();
      });

      const errorCallback = mockGeolocation.getCurrentPosition.mock.calls[0][1];

      act(() => {
        errorCallback({
          code: 3, // TIMEOUT
          TIMEOUT: 3,
        });
      });

      expect(result.current.error).toBe('Location request timed out');
    });

    it('handles unknown error', () => {
      const { result } = renderHook(() => useGeolocation());

      act(() => {
        result.current.requestLocation();
      });

      const errorCallback = mockGeolocation.getCurrentPosition.mock.calls[0][1];

      act(() => {
        errorCallback({
          code: 99, // Unknown
        });
      });

      expect(result.current.error).toBe('Unknown error getting location');
    });
  });

  describe('clearLocation', () => {
    it('clears all location data', () => {
      const { result } = renderHook(() => useGeolocation());

      // First set some data
      act(() => {
        result.current.requestLocation();
      });

      const successCallback = mockGeolocation.getCurrentPosition.mock.calls[0][0];
      act(() => {
        successCallback({
          coords: {
            latitude: 40.7128,
            longitude: -74.006,
            accuracy: 100,
          },
        });
      });

      // Now clear it
      act(() => {
        result.current.clearLocation();
      });

      expect(result.current.latitude).toBeNull();
      expect(result.current.longitude).toBeNull();
      expect(result.current.accuracy).toBeNull();
      expect(result.current.source).toBeNull();
    });
  });

  describe('options', () => {
    it('passes options to getCurrentPosition', () => {
      const options = {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      };

      const { result } = renderHook(() => useGeolocation(options));

      act(() => {
        result.current.requestLocation();
      });

      const passedOptions = mockGeolocation.getCurrentPosition.mock.calls[0][2];
      expect(passedOptions.enableHighAccuracy).toBe(true);
      expect(passedOptions.timeout).toBe(5000);
      expect(passedOptions.maximumAge).toBe(0);
    });

    it('uses default options when not provided', () => {
      const { result } = renderHook(() => useGeolocation());

      act(() => {
        result.current.requestLocation();
      });

      const passedOptions = mockGeolocation.getCurrentPosition.mock.calls[0][2];
      expect(passedOptions.enableHighAccuracy).toBe(false);
      expect(passedOptions.timeout).toBe(10000);
      expect(passedOptions.maximumAge).toBe(300000);
    });
  });

  describe('geolocation not supported', () => {
    beforeEach(() => {
      vi.stubGlobal('navigator', {});
    });

    it('sets error when geolocation is not supported', () => {
      const { result } = renderHook(() => useGeolocation());

      act(() => {
        result.current.requestLocation();
      });

      expect(result.current.error).toBe('Geolocation is not supported by your browser');
      expect(result.current.loading).toBe(false);
    });
  });
});

// Mock WorldlineState for testing
const createMockWorldline = (
  spinDistance = 1_000_000,
  orbitDistance = 28_000_000_000,
  galaxyDistance = 200_000_000_000,
  cmbDistance = 350_000_000_000
): WorldlineState => ({
  birthInstant: new Date('1990-01-01'),
  latitudeDeg: 45,
  durationSeconds: 1_000_000_000,
  frames: {
    spin: { velocityKms: 0.465, accelerationKms2: 0, tangentialDirectionDeg: 90 },
    orbit: { velocityKms: 29.78, accelerationKms2: 0, tangentialDirectionDeg: 0 },
    galaxy: { velocityKms: 220, accelerationKms2: 0, tangentialDirectionDeg: 0 },
    cmb: { velocityKms: 369.82, accelerationKms2: 0, tangentialDirectionDeg: 0 },
  },
  distances: {
    spin: { distanceKm: spinDistance, circumnavigations: 0 },
    orbit: { distanceKm: orbitDistance, orbits: 0 },
    galaxy: { distanceKm: galaxyDistance, galacticOrbits: 0 },
    cmb: { distanceKm: cmbDistance, lightYears: 0 },
  },
});

describe('FRAME_COLORS', () => {
  it('contains all four frame colors', () => {
    expect(FRAME_COLORS.spin).toBe('#10b981');
    expect(FRAME_COLORS.orbit).toBe('#3b82f6');
    expect(FRAME_COLORS.galaxy).toBe('#8b5cf6');
    expect(FRAME_COLORS.cmb).toBe('#f59e0b');
  });

  it('has exactly 4 colors', () => {
    expect(Object.keys(FRAME_COLORS)).toHaveLength(4);
  });
});

describe('buildFrameInfo', () => {
  const translations = getUIContent('en');

  it('returns empty array for null worldline', () => {
    const result = buildFrameInfo(null, translations);
    expect(result).toEqual([]);
  });

  it('returns four frames with correct structure', () => {
    const worldline = createMockWorldline();
    const result = buildFrameInfo(worldline, translations);

    expect(result).toHaveLength(4);
    expect(result.map((f) => f.id)).toEqual(['spin', 'orbit', 'galaxy', 'cmb']);
  });

  it('populates correct distances and speeds', () => {
    const worldline = createMockWorldline(100, 200, 300, 400);
    const result = buildFrameInfo(worldline, translations);

    expect(result[0]!.distanceKm).toBe(100);
    expect(result[0]!.speedKms).toBe(0.465);
    expect(result[1]!.distanceKm).toBe(200);
    expect(result[1]!.speedKms).toBe(29.78);
    expect(result[2]!.distanceKm).toBe(300);
    expect(result[2]!.speedKms).toBe(220);
    expect(result[3]!.distanceKm).toBe(400);
    expect(result[3]!.speedKms).toBe(369.82);
  });

  it('uses correct colors from FRAME_COLORS', () => {
    const worldline = createMockWorldline();
    const result = buildFrameInfo(worldline, translations);

    expect(result[0]!.color).toBe(FRAME_COLORS.spin);
    expect(result[1]!.color).toBe(FRAME_COLORS.orbit);
    expect(result[2]!.color).toBe(FRAME_COLORS.galaxy);
    expect(result[3]!.color).toBe(FRAME_COLORS.cmb);
  });

  it('uses translated labels and descriptions', () => {
    const worldline = createMockWorldline();
    const result = buildFrameInfo(worldline, translations);

    expect(result[0]!.label).toBe(translations.journey.frames.spin.label);
    expect(result[0]!.description).toBe(translations.journey.frames.spin.description);
    expect(result[1]!.label).toBe(translations.journey.frames.orbit.label);
    expect(result[2]!.label).toBe(translations.journey.frames.galaxy.label);
    expect(result[3]!.label).toBe(translations.journey.frames.cmb.label);
  });
});

describe('buildFrameInfoWithPercentages', () => {
  const translations = getUIContent('en');

  it('returns empty array for null worldline', () => {
    const result = buildFrameInfoWithPercentages(null, translations);
    expect(result).toEqual([]);
  });

  it('calculates correct percentages', () => {
    // Create worldline with known percentages
    const worldline = createMockWorldline(10, 20, 30, 40);
    const result = buildFrameInfoWithPercentages(worldline, translations);

    // Total = 100, so percentages should match distances
    expect(result[0]!.percentage).toBe(10);
    expect(result[1]!.percentage).toBe(20);
    expect(result[2]!.percentage).toBe(30);
    expect(result[3]!.percentage).toBe(40);
  });

  it('percentages sum to 100', () => {
    const worldline = createMockWorldline();
    const result = buildFrameInfoWithPercentages(worldline, translations);

    const totalPercentage = result.reduce((sum, f) => sum + f.percentage, 0);
    expect(totalPercentage).toBeCloseTo(100, 10);
  });

  it('handles zero total distance gracefully', () => {
    const worldline = createMockWorldline(0, 0, 0, 0);
    const result = buildFrameInfoWithPercentages(worldline, translations);

    // All percentages should be 0 when total is 0
    expect(result.every((f) => f.percentage === 0)).toBe(true);
  });
});

describe('useFrameInfo', () => {
  it('returns empty array for null worldline', () => {
    const { result } = renderHook(() => useFrameInfo(null));
    expect(result.current).toEqual([]);
  });

  it('returns frame info for valid worldline', () => {
    const worldline = createMockWorldline();
    const { result } = renderHook(() => useFrameInfo(worldline));

    expect(result.current).toHaveLength(4);
    expect(result.current[0]!.id).toBe('spin');
  });

  it('returns frame info with percentages when includePercentages is true', () => {
    const worldline = createMockWorldline();
    const { result } = renderHook(() => useFrameInfo(worldline, 'en', true));

    expect(result.current).toHaveLength(4);
    expect(result.current[0]).toHaveProperty('percentage');
  });

  it('memoizes result when worldline does not change', () => {
    const worldline = createMockWorldline();
    const { result, rerender } = renderHook(() => useFrameInfo(worldline));

    const firstResult = result.current;
    rerender();
    const secondResult = result.current;

    expect(firstResult).toBe(secondResult);
  });

  it('uses different translations based on locale', () => {
    const worldline = createMockWorldline();
    const { result: enResult } = renderHook(() => useFrameInfo(worldline, 'en'));
    const { result: ptResult } = renderHook(() => useFrameInfo(worldline, 'pt'));

    // Labels should be different for different locales
    expect(enResult.current[0]!.label).not.toBe(ptResult.current[0]!.label);
  });
});

describe('computeTotalDistance', () => {
  it('returns 0 for null worldline', () => {
    expect(computeTotalDistance(null)).toBe(0);
  });

  it('sums all frame distances', () => {
    const worldline = createMockWorldline(10, 20, 30, 40);
    expect(computeTotalDistance(worldline)).toBe(100);
  });

  it('handles large distances correctly', () => {
    const worldline = createMockWorldline(
      1_000_000,
      28_000_000_000,
      200_000_000_000,
      350_000_000_000
    );
    expect(computeTotalDistance(worldline)).toBe(578_001_000_000);
  });
});

describe('computeTotalSpeed', () => {
  it('returns 0 for null worldline', () => {
    expect(computeTotalSpeed(null)).toBe(0);
  });

  it('sums all frame speeds', () => {
    const worldline = createMockWorldline();
    // 0.465 + 29.78 + 220 + 369.82 = 620.065
    expect(computeTotalSpeed(worldline)).toBeCloseTo(620.065, 3);
  });
});
