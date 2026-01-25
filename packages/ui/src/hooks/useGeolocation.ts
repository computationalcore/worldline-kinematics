/**
 * Hook for browser geolocation with privacy-first approach.
 */

import { useState, useCallback, useEffect } from 'react';

export interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  loading: boolean;
  error: string | null;
  source: 'gps' | 'ip' | 'manual' | null;
}

export interface UseGeolocationOptions {
  /** High accuracy mode (uses GPS, slower, more battery) */
  enableHighAccuracy?: boolean;
  /** Timeout in milliseconds */
  timeout?: number;
  /** Maximum age of cached position in milliseconds */
  maximumAge?: number;
}

const defaultOptions: UseGeolocationOptions = {
  enableHighAccuracy: false,
  timeout: 10000,
  maximumAge: 300000, // 5 minutes
};

/**
 * Hook for requesting user geolocation.
 * Only requests location when explicitly triggered - respects user privacy.
 */
export function useGeolocation(options: UseGeolocationOptions = {}) {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    loading: false,
    error: null,
    source: null,
  });

  // Track if geolocation is supported (only check on client to avoid hydration mismatch)
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported(typeof navigator !== 'undefined' && 'geolocation' in navigator);
  }, []);

  const mergedOptions = { ...defaultOptions, ...options };

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        error: 'Geolocation is not supported by your browser',
        loading: false,
      }));
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          loading: false,
          error: null,
          source: 'gps',
        });
      },
      (error) => {
        let errorMessage: string;
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission denied';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location unavailable';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out';
            break;
          default:
            errorMessage = 'Unknown error getting location';
        }
        setState((prev) => ({
          ...prev,
          error: errorMessage,
          loading: false,
        }));
      },
      {
        enableHighAccuracy: mergedOptions.enableHighAccuracy,
        timeout: mergedOptions.timeout,
        maximumAge: mergedOptions.maximumAge,
      }
    );
  }, [mergedOptions.enableHighAccuracy, mergedOptions.timeout, mergedOptions.maximumAge]);

  const clearLocation = useCallback(() => {
    setState({
      latitude: null,
      longitude: null,
      accuracy: null,
      loading: false,
      error: null,
      source: null,
    });
  }, []);

  return {
    ...state,
    requestLocation,
    clearLocation,
    isSupported,
  };
}
