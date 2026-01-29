/**
 * Saturn rings component with physically accurate dimensions.
 *
 * Ring data from PDS Ring-Moon Systems Node:
 * https://pds-rings.seti.org/saturn/
 *
 * The rings are oriented to lie in Saturn's equatorial plane,
 * which is tilted 26.73 degrees from its orbital plane.
 */

'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { ShaderMaterial } from 'three';
import { useRenderProfile } from '../render-profile';

// ---------------------------------------------------------------------------
// Ring data from PDS
// ---------------------------------------------------------------------------

/**
 * Saturn ring boundaries in km from planet center.
 * Source: PDS Ring-Moon Systems Node
 */
const RING_DATA = {
  // D Ring (innermost, faint)
  D: { inner: 66900, outer: 74510, opacity: 0.1, color: '#8B7355' },
  // C Ring (Crepe Ring)
  C: { inner: 74658, outer: 92000, opacity: 0.3, color: '#9B8B7A' },
  // B Ring (brightest, most opaque)
  B: { inner: 92000, outer: 117580, opacity: 0.8, color: '#C4B8A8' },
  // Cassini Division (gap)
  cassiniDivision: { inner: 117580, outer: 122170, opacity: 0.05, color: '#2A2520' },
  // A Ring
  A: { inner: 122170, outer: 136775, opacity: 0.6, color: '#B8A898' },
  // F Ring (narrow, outer)
  F: { inner: 140180, outer: 140680, opacity: 0.4, color: '#A09080' },
} as const;

/**
 * Saturn's equatorial radius in km.
 * Source: NASA Planetary Fact Sheet
 */
const SATURN_RADIUS_KM = 58232;

/**
 * Saturn's axial tilt in degrees.
 */
const SATURN_AXIAL_TILT = 26.73;

// ---------------------------------------------------------------------------
// Ring shader for realistic appearance
// ---------------------------------------------------------------------------

const RING_VERTEX_SHADER = `
  varying vec2 vUv;
  varying vec3 vWorldPosition;
  varying vec3 vLocalPosition;
  varying vec3 vNormal;

  void main() {
    vUv = uv;
    // Use world-space normals for consistent lighting
    vNormal = normalize(mat3(modelMatrix) * normal);
    vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    // Pass local position for radial calculations (rings are in XY plane locally)
    vLocalPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/**
 * Ring fragment shader with:
 * - Radial opacity gradient based on ring structure
 * - Backlit transparency effect
 * - Sun illumination
 */
const RING_FRAGMENT_SHADER = `
  uniform vec3 uSunDirection;
  uniform float uInnerRadius;
  uniform float uOuterRadius;
  uniform vec3 uRingColor;
  uniform float uBaseOpacity;
  uniform sampler2D uRingTexture;
  uniform float uHasTexture;

  varying vec2 vUv;
  varying vec3 vWorldPosition;
  varying vec3 vLocalPosition;
  varying vec3 vNormal;

  void main() {
    // Calculate radial position using LOCAL coordinates (rings are in XY plane locally)
    // This ensures correct calculation regardless of Saturn's world position
    float r = length(vLocalPosition.xy);
    float radialPos = (r - uInnerRadius) / (uOuterRadius - uInnerRadius);

    // Discard if outside ring bounds
    if (radialPos < 0.0 || radialPos > 1.0) discard;

    // Base color from texture or uniform
    vec3 color = uRingColor;
    float alpha = uBaseOpacity;

    if (uHasTexture > 0.5) {
      vec4 texColor = texture2D(uRingTexture, vec2(radialPos, 0.5));
      color = texColor.rgb;
      alpha *= texColor.a;
    }

    // Sun illumination (both sides can be lit)
    float sunDot = abs(dot(vNormal, uSunDirection));
    float illumination = 0.3 + 0.7 * sunDot;

    // Backlit effect (rings glow when sun is behind them)
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    float backlit = max(0.0, -dot(viewDir, uSunDirection));
    backlit = pow(backlit, 2.0) * 0.3;

    // Final color
    vec3 finalColor = color * illumination + color * backlit;

    // Fade at edges for smoother look
    // Fix: smoothstep requires edge0 < edge1, use (1.0 - smoothstep) to invert
    float innerFade = smoothstep(0.0, 0.05, radialPos);
    float outerFade = 1.0 - smoothstep(0.95, 1.0, radialPos);
    float edgeFade = innerFade * outerFade;
    alpha *= edgeFade;

    if (alpha < 0.01) discard;

    gl_FragColor = vec4(finalColor, alpha);
  }
`;

// ---------------------------------------------------------------------------
// Ring Segment Component (prevents uniform churn)
// ---------------------------------------------------------------------------

interface RingSegmentProps {
  innerRadius: number;
  outerRadius: number;
  ring: { opacity: number; color: string };
  sunDirection: THREE.Vector3;
  segments: number;
  renderOrder: number;
}

/**
 * Individual ring segment with memoized uniforms.
 * Updates sunDirection in useFrame to prevent material recreation.
 */
function RingSegment({
  innerRadius,
  outerRadius,
  ring,
  sunDirection,
  segments,
  renderOrder,
}: RingSegmentProps) {
  const shaderRef = useRef<ShaderMaterial>(null);

  // Memoize color to avoid creating new Color object on every render
  const ringColor = useMemo(() => new THREE.Color(ring.color), [ring.color]);

  // Create uniforms
  const uniforms = useMemo(
    () => ({
      uSunDirection: { value: sunDirection.clone() },
      uInnerRadius: { value: innerRadius },
      uOuterRadius: { value: outerRadius },
      uRingColor: { value: ringColor },
      uBaseOpacity: { value: ring.opacity },
      uRingTexture: { value: null },
      uHasTexture: { value: 0.0 },
    }),
    [innerRadius, outerRadius, ringColor, ring.opacity, sunDirection]
  );

  // Update sunDirection in useFrame for smooth animation
  useFrame(() => {
    const u = shaderRef.current?.uniforms?.uSunDirection;
    if (u) {
      u.value.copy(sunDirection);
    }
  });

  return (
    <mesh rotation={[Math.PI / 2, 0, 0]} renderOrder={renderOrder}>
      <ringGeometry args={[innerRadius, outerRadius, segments]} />
      <shaderMaterial
        ref={shaderRef}
        vertexShader={RING_VERTEX_SHADER}
        fragmentShader={RING_FRAGMENT_SHADER}
        uniforms={uniforms}
        transparent
        side={THREE.DoubleSide}
        depthWrite={false}
        polygonOffset
        polygonOffsetFactor={-2}
        polygonOffsetUnits={-2}
      />
    </mesh>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface SaturnRingsProps {
  /** Saturn's radius in scene units */
  saturnRadius: number;

  /** Saturn's position in scene coordinates */
  position?: [number, number, number];

  /** Sun position for lighting (default: origin) */
  sunPosition?: [number, number, number];

  /** Whether to apply Saturn's axial tilt */
  applyTilt?: boolean;

  /** Override axial tilt in degrees */
  tiltDegrees?: number;

  /**
   * Quaternion for ring orientation (from Saturn's body orientation).
   * When provided, overrides tilt-based rotation to ensure rings are coplanar
   * with Saturn's equatorial plane.
   */
  quaternion?: [number, number, number, number];
}

/**
 * Saturn's ring system with physically accurate proportions.
 *
 * In standard mode: Simple ring geometry with gradient.
 * In cinematic mode: Multiple ring components with proper opacity and lighting.
 */
export function SaturnRings({
  saturnRadius,
  position = [0, 0, 0],
  sunPosition = [0, 0, 0],
  applyTilt = true,
  tiltDegrees,
  quaternion,
}: SaturnRingsProps) {
  const { profile, initialized } = useRenderProfile();
  const groupRef = useRef<THREE.Group>(null);

  const isCinematic = initialized && profile.fidelity === 'cinematic';

  // Calculate scale factor from km to scene units
  const kmToScene = saturnRadius / SATURN_RADIUS_KM;

  // Sun direction for lighting
  const sunDirection = useMemo(() => {
    return new THREE.Vector3(
      sunPosition[0] - position[0],
      sunPosition[1] - position[1],
      sunPosition[2] - position[2]
    ).normalize();
  }, [sunPosition, position]);

  // Axial tilt (legacy fallback when quaternion not provided)
  const tiltRadians = useMemo(() => {
    const tilt = tiltDegrees ?? SATURN_AXIAL_TILT;
    return applyTilt ? (tilt * Math.PI) / 180 : 0;
  }, [tiltDegrees, applyTilt]);

  // Orientation props: use quaternion if provided, otherwise legacy tilt
  // Negative rotation to match Planet.tsx fallback: [-ε, 0, 0] gives pole (0, cos(ε), -sin(ε))
  const orientationProps = quaternion
    ? { quaternion: quaternion }
    : { rotation: [-tiltRadians, 0, 0] as [number, number, number] };

  const segments = Math.max(64, profile.sphereSegments);

  if (isCinematic) {
    // Cinematic: render each ring component separately using RingSegment
    // to prevent uniform churn and flickering
    return (
      <group ref={groupRef} position={position} {...orientationProps}>
        {Object.entries(RING_DATA).map(([name, ring], idx) => {
          const innerRadius = ring.inner * kmToScene;
          const outerRadius = ring.outer * kmToScene;
          return (
            <RingSegment
              key={name}
              innerRadius={innerRadius}
              outerRadius={outerRadius}
              ring={ring}
              sunDirection={sunDirection}
              segments={segments}
              renderOrder={10 + idx}
            />
          );
        })}
      </group>
    );
  }

  // Standard: simple combined ring
  const innerRadius = RING_DATA.C.inner * kmToScene;
  const outerRadius = RING_DATA.A.outer * kmToScene;

  return (
    <group ref={groupRef} position={position} {...orientationProps}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[innerRadius, outerRadius, segments]} />
        <meshStandardMaterial
          color="#c9b896"
          side={THREE.DoubleSide}
          transparent
          opacity={0.7}
          roughness={0.8}
        />
      </mesh>
    </group>
  );
}
