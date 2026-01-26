/**
 * CMB (Cosmic Microwave Background) visualization components.
 */

// Placeholder components - to be implemented in M2 milestone

/** CMB backdrop component props */
export interface CMBBackdropProps {
  /** Opacity of the backdrop */
  opacity?: number;
}

/** Placeholder CMBBackdrop component */
export function CMBBackdrop(_props: CMBBackdropProps): null {
  // TODO: Implement subtle cosmic background sphere
  return null;
}

/** Drift vector component props */
export interface DriftVectorProps {
  /** Direction in galactic coordinates (l, b) in degrees */
  direction?: { l: number; b: number };
  /** Arrow scale */
  scale?: number;
}

/** Placeholder DriftVector component */
export function DriftVector(_props: DriftVectorProps): null {
  // TODO: Implement arrow showing motion direction relative to CMB
  return null;
}
