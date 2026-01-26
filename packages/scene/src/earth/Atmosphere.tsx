/**
 * Earth atmosphere glow effect.
 */

import { Sphere } from '@react-three/drei';

interface AtmosphereProps {
  /** Radius of the Earth (atmosphere will be slightly larger) */
  earthRadius?: number;
  /** Glow intensity (0-1) */
  intensity?: number;
}

/**
 * Atmospheric glow around Earth.
 */
export function Atmosphere({ earthRadius = 1, intensity = 0.3 }: AtmosphereProps) {
  return (
    <Sphere args={[earthRadius * 1.05, 32, 32]}>
      <meshBasicMaterial
        color="#4fc3f7"
        transparent
        opacity={intensity}
        depthWrite={false}
      />
    </Sphere>
  );
}
