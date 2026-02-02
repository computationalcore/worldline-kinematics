export { useFullscreen, type FullscreenAPI } from './useFullscreen';
export {
  useGeolocation,
  type GeolocationState,
  type UseGeolocationOptions,
} from './useGeolocation';
export {
  useCinematicMode,
  type UseCinematicModeOptions,
  type UseCinematicModeReturn,
} from './useCinematicMode';
export { useShareJourney } from './useShareJourney';
// FrameInfo and related types are exported from drawer/types.ts to avoid duplicate exports
export {
  useFrameInfo,
  buildFrameInfo,
  buildFrameInfoWithPercentages,
  computeTotalDistance,
  computeTotalSpeed,
  FRAME_COLORS,
} from './useFrameInfo';
