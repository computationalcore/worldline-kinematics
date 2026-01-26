/**
 * Earth globe component with Blue Marble textures.
 */

import { useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { Sphere } from '@react-three/drei';
import * as THREE from 'three';
import type { Mesh } from 'three';

interface EarthProps {
  /** Visual rotation speed multiplier (1 = real-time, higher = faster for demo) */
  rotationSpeedMultiplier?: number;
  /** Whether to show the atmosphere glow */
  showAtmosphere?: boolean;
  /** Whether to show cloud layer */
  showClouds?: boolean;
}

/**
 * Earth globe with Blue Marble texture and rotation animation.
 */
export function Earth({
  rotationSpeedMultiplier = 100,
  showAtmosphere = true,
  showClouds = true,
}: EarthProps) {
  const earthRef = useRef<Mesh>(null);
  const cloudsRef = useRef<Mesh>(null);

  // Load textures
  const [dayMap, cloudsMap] = useLoader(THREE.TextureLoader, [
    '/textures/earth_daymap.jpg',
    '/textures/earth_clouds.jpg',
  ]);

  // Configure texture settings for proper sphere mapping
  if (dayMap) {
    dayMap.colorSpace = THREE.SRGBColorSpace;
  }
  if (cloudsMap) {
    cloudsMap.colorSpace = THREE.SRGBColorSpace;
  }

  // Earth's angular velocity: 2pi radians per sidereal day
  // Sidereal day = 86164.0905 seconds
  const baseAngularVelocity = (2 * Math.PI) / 86164.0905;

  useFrame((_, delta) => {
    const rotation = baseAngularVelocity * delta * rotationSpeedMultiplier;

    if (earthRef.current) {
      earthRef.current.rotation.y += rotation;
    }

    // Clouds rotate slightly faster for visual interest
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y += rotation * 1.05;
    }
  });

  return (
    <group>
      {/* Earth sphere with day texture */}
      <mesh ref={earthRef}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial map={dayMap} roughness={0.9} metalness={0.1} />
      </mesh>

      {/* Cloud layer */}
      {showClouds && (
        <mesh ref={cloudsRef}>
          <sphereGeometry args={[1.01, 64, 64]} />
          <meshStandardMaterial
            map={cloudsMap}
            transparent
            opacity={0.4}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Subtle atmosphere rim glow - thin edge effect */}
      {showAtmosphere && (
        <Sphere args={[1.015, 64, 64]}>
          <shaderMaterial
            transparent
            depthWrite={false}
            side={THREE.BackSide}
            vertexShader={`
              varying vec3 vNormal;
              varying vec3 vWorldPosition;
              void main() {
                vNormal = normalize(normalMatrix * normal);
                vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
              }
            `}
            fragmentShader={`
              varying vec3 vNormal;
              varying vec3 vWorldPosition;
              void main() {
                vec3 viewDir = normalize(cameraPosition - vWorldPosition);
                float rim = 1.0 - max(dot(viewDir, vNormal), 0.0);
                rim = pow(rim, 3.0);
                vec3 color = vec3(0.3, 0.6, 1.0);
                float alpha = rim * 0.4;
                if (alpha < 0.01) discard;
                gl_FragColor = vec4(color, alpha);
              }
            `}
          />
        </Sphere>
      )}
    </group>
  );
}
