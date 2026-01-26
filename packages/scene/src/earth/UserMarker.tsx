/**
 * User location marker component.
 * A glowing pillar that extends from Earth's surface along the normal vector.
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Group, Mesh } from 'three';

interface UserMarkerProps {
  /** Latitude in degrees (-90 to 90) */
  latitude: number;
  /** Longitude in degrees (-180 to 180) */
  longitude: number;
  /** Earth radius for positioning */
  earthRadius?: number;
  /** Pillar height above surface */
  pillarHeight?: number;
}

/**
 * Converts latitude/longitude to 3D position on a sphere.
 * Returns both position and the normal vector at that point.
 */
function latLonToPositionAndNormal(
  lat: number,
  lon: number,
  radius: number
): { position: THREE.Vector3; normal: THREE.Vector3 } {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);

  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);

  const position = new THREE.Vector3(x, y, z);
  // Normal is just the normalized position vector for a sphere centered at origin
  const normal = position.clone().normalize();

  return { position, normal };
}

/**
 * A glowing pillar that indicates the user's position on Earth.
 * The pillar extends outward along the surface normal vector.
 */
export function UserMarker({
  latitude,
  longitude,
  earthRadius = 1,
  pillarHeight = 0.2,
}: UserMarkerProps) {
  const groupRef = useRef<Group>(null);
  const glowRef = useRef<Mesh>(null);
  const beamRef = useRef<Mesh>(null);

  const { position, quaternion } = useMemo(() => {
    const { position, normal } = latLonToPositionAndNormal(
      latitude,
      longitude,
      earthRadius
    );

    // Calculate quaternion to rotate from Y-up to the normal direction
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);

    return { position, quaternion };
  }, [latitude, longitude, earthRadius]);

  // Pulsing and beam animation
  useFrame((state) => {
    const time = state.clock.elapsedTime;

    if (glowRef.current) {
      // Gentle breathing pulse
      const scale = 1 + Math.sin(time * 3) * 0.15;
      glowRef.current.scale.setScalar(scale);
    }

    if (beamRef.current) {
      // Shimmer effect on the beam
      const material = beamRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = 0.4 + Math.sin(time * 4) * 0.1;
    }
  });

  return (
    <group ref={groupRef} position={position} quaternion={quaternion}>
      {/* Base ring at surface */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
        <ringGeometry args={[0.015, 0.025, 32]} />
        <meshBasicMaterial
          color="#00ff88"
          transparent
          opacity={0.8}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Main pillar - cylinder extending outward */}
      <mesh position={[0, pillarHeight / 2, 0]}>
        <cylinderGeometry args={[0.008, 0.012, pillarHeight, 8]} />
        <meshBasicMaterial color="#00ff88" />
      </mesh>

      {/* Outer glow beam */}
      <mesh ref={beamRef} position={[0, pillarHeight / 2, 0]}>
        <cylinderGeometry args={[0.02, 0.03, pillarHeight, 16]} />
        <meshBasicMaterial color="#00ff88" transparent opacity={0.3} depthWrite={false} />
      </mesh>

      {/* Top sphere glow */}
      <mesh ref={glowRef} position={[0, pillarHeight, 0]}>
        <sphereGeometry args={[0.025, 16, 16]} />
        <meshBasicMaterial color="#00ff88" transparent opacity={0.8} />
      </mesh>

      {/* Inner bright core */}
      <mesh position={[0, pillarHeight, 0]}>
        <sphereGeometry args={[0.012, 16, 16]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    </group>
  );
}
