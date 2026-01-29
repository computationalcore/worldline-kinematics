/**
 * User location marker component.
 * An elegant cosmic pin that marks the user's birthplace on Earth.
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
 * Exported for testing.
 */
export function latLonToPositionAndNormal(
  lat: number,
  lon: number,
  radius: number
): { position: THREE.Vector3; normal: THREE.Vector3 } {
  const latRad = lat * (Math.PI / 180);
  const lonRad = lon * (Math.PI / 180);

  const x = radius * Math.cos(latRad) * Math.cos(lonRad);
  const y = radius * Math.sin(latRad);
  const z = -radius * Math.cos(latRad) * Math.sin(lonRad);

  const position = new THREE.Vector3(x, y, z);
  const normal = position.clone().normalize();

  return { position, normal };
}

// Shader for the sleek beam with subtle gradient
const beamVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const beamFragmentShader = `
  uniform float uTime;
  varying vec2 vUv;

  void main() {
    // Subtle energy flow upward
    float flow = fract(vUv.y * 2.0 - uTime * 0.3);
    float flowBand = smoothstep(0.0, 0.1, flow) * smoothstep(0.3, 0.1, flow);

    // Color: warm gold/amber tones
    vec3 baseColor = vec3(1.0, 0.85, 0.4);
    vec3 tipColor = vec3(1.0, 0.6, 0.2);
    vec3 color = mix(baseColor, tipColor, vUv.y);

    // Add subtle flow highlight
    color += flowBand * 0.2;

    // Fade at edges and taper opacity toward tip
    float alpha = (0.7 + flowBand * 0.3) * (1.0 - vUv.y * 0.3);

    gl_FragColor = vec4(color, alpha);
  }
`;

/**
 * An elegant cosmic pin that marks the user's birthplace on Earth.
 * Features a sleek needle with a glowing orb tip and radiating pulse rings.
 */
export function UserMarker({
  latitude,
  longitude,
  earthRadius = 1,
  pillarHeight = 0.15,
}: UserMarkerProps) {
  const groupRef = useRef<Group>(null);
  const orbGlowRef = useRef<Mesh>(null);
  const orbCoreRef = useRef<Mesh>(null);
  const beamMaterialRef = useRef<THREE.ShaderMaterial>(null);
  // Refs for the 3 expanding pulse rings
  const pulseRing1Ref = useRef<Mesh>(null);
  const pulseRing2Ref = useRef<Mesh>(null);
  const pulseRing3Ref = useRef<Mesh>(null);

  const { position, quaternion } = useMemo(() => {
    const { position, normal } = latLonToPositionAndNormal(
      latitude,
      longitude,
      earthRadius
    );

    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);

    return { position, quaternion };
  }, [latitude, longitude, earthRadius]);

  // Scale relative to earth radius - keep it compact and elegant
  const needleRadius = earthRadius * 0.004;
  const orbSize = earthRadius * 0.012;

  // Beam shader material
  const beamMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: beamVertexShader,
      fragmentShader: beamFragmentShader,
      uniforms: {
        uTime: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
  }, []);

  // Animation loop
  useFrame((state) => {
    const time = state.clock.elapsedTime;

    // Update beam shader
    if (beamMaterial?.uniforms?.uTime) {
      beamMaterial.uniforms.uTime.value = time;
    }

    // Gentle orb pulse
    if (orbGlowRef.current) {
      const scale = 1 + Math.sin(time * 2) * 0.1;
      orbGlowRef.current.scale.setScalar(scale);
    }

    if (orbCoreRef.current) {
      const scale = 1 + Math.sin(time * 3) * 0.05;
      orbCoreRef.current.scale.setScalar(scale);
    }

    // Animate expanding pulse rings - each ring expands and fades out
    const pulseRefs = [pulseRing1Ref, pulseRing2Ref, pulseRing3Ref];
    const pulseDuration = 3; // seconds for full expansion cycle
    const maxScale = 8; // how far the rings expand

    pulseRefs.forEach((ref, index) => {
      if (ref.current) {
        // Stagger each ring by 1/3 of the cycle
        const offset = (index / 3) * pulseDuration;
        const progress = ((time + offset) % pulseDuration) / pulseDuration;

        // Scale from small to large
        const scale = 1 + progress * maxScale;
        ref.current.scale.setScalar(scale);

        // Fade out as it expands (starts visible, fades to transparent)
        const material = ref.current.material as THREE.MeshBasicMaterial;
        material.opacity = (1 - progress) * 0.5;
      }
    });
  });

  return (
    <group ref={groupRef} position={position} quaternion={quaternion}>
      {/* Expanding pulse rings - radiate outward from birthplace */}
      <mesh
        ref={pulseRing1Ref}
        rotation={[Math.PI / 2, 0, 0]}
        position={[0, earthRadius * 0.0003, 0]}
      >
        <ringGeometry args={[orbSize * 0.9, orbSize * 1.1, 64]} />
        <meshBasicMaterial
          color="#ffaa44"
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh
        ref={pulseRing2Ref}
        rotation={[Math.PI / 2, 0, 0]}
        position={[0, earthRadius * 0.0003, 0]}
      >
        <ringGeometry args={[orbSize * 0.9, orbSize * 1.1, 64]} />
        <meshBasicMaterial
          color="#ffaa44"
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh
        ref={pulseRing3Ref}
        rotation={[Math.PI / 2, 0, 0]}
        position={[0, earthRadius * 0.0003, 0]}
      >
        <ringGeometry args={[orbSize * 0.9, orbSize * 1.1, 64]} />
        <meshBasicMaterial
          color="#ffaa44"
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Static center dot at base */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, earthRadius * 0.0005, 0]}>
        <circleGeometry args={[orbSize * 0.4, 24]} />
        <meshBasicMaterial
          color="#ffdd88"
          transparent
          opacity={0.8}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Needle - thin elegant shaft */}
      <mesh position={[0, pillarHeight / 2, 0]}>
        <cylinderGeometry args={[needleRadius * 0.3, needleRadius, pillarHeight, 8]} />
        <primitive object={beamMaterial} attach="material" ref={beamMaterialRef} />
      </mesh>

      {/* Inner needle core - bright line */}
      <mesh position={[0, pillarHeight / 2, 0]}>
        <cylinderGeometry
          args={[needleRadius * 0.1, needleRadius * 0.2, pillarHeight, 6]}
        />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.95} />
      </mesh>

      {/* Orb - outer glow */}
      <mesh ref={orbGlowRef} position={[0, pillarHeight, 0]}>
        <sphereGeometry args={[orbSize * 1.5, 24, 24]} />
        <meshBasicMaterial
          color="#ff8833"
          transparent
          opacity={0.25}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Orb - mid layer */}
      <mesh position={[0, pillarHeight, 0]}>
        <sphereGeometry args={[orbSize, 24, 24]} />
        <meshBasicMaterial
          color="#ffaa44"
          transparent
          opacity={0.6}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Orb - bright core */}
      <mesh ref={orbCoreRef} position={[0, pillarHeight, 0]}>
        <sphereGeometry args={[orbSize * 0.5, 16, 16]} />
        <meshBasicMaterial color="#ffeecc" transparent opacity={0.95} />
      </mesh>

      {/* Orb - white hot center */}
      <mesh position={[0, pillarHeight, 0]}>
        <sphereGeometry args={[orbSize * 0.25, 12, 12]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    </group>
  );
}
