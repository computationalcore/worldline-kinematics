/**
 * Uncertainty evaluation helpers for frame computations.
 */

/**
 * Determines if an uncertainty is significant relative to the value.
 *
 * An uncertainty is considered significant when it exceeds a relative threshold
 * compared to the measured value. This is useful for deciding whether to
 * display uncertainty indicators in the UI.
 *
 * @param value The measured/computed value
 * @param sigma The 1-sigma uncertainty (optional)
 * @param relThresh Relative threshold (default 0.1% = 1e-3)
 * @returns true if sigma/value >= relThresh, false otherwise
 */
export function isSignificantUncertainty(
  value: number,
  sigma?: number,
  relThresh = 1e-3
): boolean {
  if (sigma === undefined || sigma === null || sigma === 0) return false;
  if (value === 0) return sigma !== 0;
  return Math.abs(sigma / value) >= relThresh;
}
