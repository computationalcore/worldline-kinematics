/**
 * Cinematic planet renderer with PBR shaders.
 */

'use client';

import React, { useRef, useMemo } from 'react';
import { useFrame, useLoader, extend } from '@react-three/fiber';
import { Html, shaderMaterial } from '@react-three/drei';
import * as THREE from 'three';
import type { Mesh, Group, ShaderMaterial } from 'three';
import { useRenderProfile } from '../render-profile';
import { BODY_PHYSICAL } from '@worldline-kinematics/astro';

// ---------------------------------------------------------------------------
// Planet Physical Data Helpers
// ---------------------------------------------------------------------------

/**
 * Gets sidereal rotation period in seconds for a body.
 * Data sourced from @worldline-kinematics/astro (JPL SSD / NASA Fact Sheets).
 */
function getSiderealPeriodSeconds(name: string): number {
  const bodyData = BODY_PHYSICAL[name as keyof typeof BODY_PHYSICAL];
  if (!bodyData?.siderealRotationHours) return 86400; // Default to 1 day
  // BODY_PHYSICAL stores hours, convert to seconds
  return bodyData.siderealRotationHours * 3600;
}

/**
 * Gets axial tilt (obliquity) in degrees for a body.
 * Data sourced from @worldline-kinematics/astro (JPL SSD / NASA Fact Sheets).
 */
function getAxialTiltDeg(name: string): number {
  const bodyData = BODY_PHYSICAL[name as keyof typeof BODY_PHYSICAL];
  if (!bodyData) return 0;
  return bodyData.obliquityDeg ?? 0;
}

/**
 * Texture paths by planet.
 * Using 8k (8192x4096) textures where available for maximum quality.
 * Uranus and Neptune use 2k as 8k versions are not available.
 * Source: Solar System Scope (https://www.solarsystemscope.com/textures/)
 */
const TEXTURE_PATHS: Record<string, string> = {
  Mercury: '/textures/8k_mercury.jpg',
  Venus: '/textures/8k_venus_surface.jpg',
  Earth: '/textures/8k_earth_daymap.jpg',
  Mars: '/textures/8k_mars.jpg',
  Jupiter: '/textures/8k_jupiter.jpg',
  Saturn: '/textures/8k_saturn.jpg',
  Uranus: '/textures/2k_uranus.jpg', // 8k not available
  Neptune: '/textures/2k_neptune.jpg', // 8k not available
  Moon: '/textures/8k_moon.jpg',
};

/**
 * Earth texture paths (8k resolution).
 * Source: Solar System Scope (https://www.solarsystemscope.com/textures/)
 *
 * - day: Daylight surface map with terrain, oceans, vegetation
 * - night: City lights visible on the dark side
 * - clouds: Cloud layer overlay (optional, rendered as separate mesh)
 */
const EARTH_TEXTURES = {
  day: '/textures/8k_earth_daymap.jpg',
  night: '/textures/8k_earth_nightmap.jpg',
  clouds: '/textures/8k_earth_clouds.jpg',
};

// ---------------------------------------------------------------------------
// Earth Day/Night Shader (using drei shaderMaterial)
// ---------------------------------------------------------------------------

/**
 * EarthMaterial - Custom shader for realistic day/night rendering.
 *
 * Features:
 * - Day/night texture blending based on sun position
 * - Sigmoid function for smooth terminator transition
 * - Fresnel-based atmospheric rim lighting
 * - City lights visible on night side
 *
 * References:
 * - https://sangillee.com/2024-06-07-create-realistic-earth-with-shaders/
 * - https://matiasgf.dev/experiments/earth
 * - https://drei.docs.pmnd.rs/shaders/shader-material
 */
const EarthMaterial = shaderMaterial(
  // Uniforms with default values
  {
    uDayTexture: null,
    uNightTexture: null,
    uSunDirection: new THREE.Vector3(1, 0, 0),
  },
  // Vertex shader (includes logdepthbuf for logarithmic depth buffer support)
  /* glsl */ `
    #include <common>
    #include <logdepthbuf_pars_vertex>

    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vWorldPosition;

    void main() {
      vUv = uv;
      vNormal = normalize(mat3(modelMatrix) * normal);
      vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

      #include <logdepthbuf_vertex>
    }
  `,
  // Fragment shader (includes logdepthbuf for logarithmic depth buffer support)
  /* glsl */ `
    #include <common>
    #include <logdepthbuf_pars_fragment>

    uniform sampler2D uDayTexture;
    uniform sampler2D uNightTexture;
    uniform vec3 uSunDirection;

    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vWorldPosition;

    void main() {
      vec3 normal = normalize(vNormal);
      vec3 sunDir = normalize(uSunDirection);

      // Sun-facing factor: -1 (away) to +1 (facing)
      float cosAngle = dot(normal, sunDir);

      // Sigmoid for smooth terminator (sharpness = 10.0)
      float dayFactor = 1.0 / (1.0 + exp(-10.0 * cosAngle));

      // Sample textures
      vec4 dayColor = texture2D(uDayTexture, vUv);
      vec4 nightColor = texture2D(uNightTexture, vUv);

      // Boost city lights visibility
      nightColor.rgb *= 1.8;

      // Blend day/night
      vec3 color = mix(nightColor.rgb, dayColor.rgb, dayFactor);

      // Fresnel rim lighting (atmosphere effect)
      vec3 viewDir = normalize(cameraPosition - vWorldPosition);
      float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 3.0);
      vec3 rimLight = vec3(0.3, 0.6, 1.0) * fresnel * 0.15 * dayFactor;
      color += rimLight;

      gl_FragColor = vec4(color, 1.0);

      #include <logdepthbuf_fragment>
    }
  `
);

// Extend for JSX usage: <earthMaterial />
extend({ EarthMaterial });

// Standalone shader strings for use with standard shaderMaterial
// IMPORTANT: Include logdepthbuf chunks for compatibility with logarithmicDepthBuffer
const EARTH_VERTEX_SHADER = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_vertex>

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  void main() {
    vUv = uv;
    vNormal = normalize(mat3(modelMatrix) * normal);
    vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

    #include <logdepthbuf_vertex>
  }
`;

const EARTH_FRAGMENT_SHADER = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_fragment>

  uniform sampler2D uDayTexture;
  uniform sampler2D uNightTexture;
  uniform vec3 uSunDirection;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 sunDir = normalize(uSunDirection);

    // Sun-facing factor: -1 (away) to +1 (facing)
    float cosAngle = dot(normal, sunDir);

    // Sigmoid for smooth terminator (sharpness = 10.0)
    float dayFactor = 1.0 / (1.0 + exp(-10.0 * cosAngle));

    // Sample textures
    vec4 dayColor = texture2D(uDayTexture, vUv);
    vec4 nightColor = texture2D(uNightTexture, vUv);

    // Boost city lights visibility
    nightColor.rgb *= 1.8;

    // Blend day/night
    vec3 color = mix(nightColor.rgb, dayColor.rgb, dayFactor);

    // Fresnel rim lighting (atmosphere effect)
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 3.0);
    vec3 rimLight = vec3(0.3, 0.6, 1.0) * fresnel * 0.15 * dayFactor;
    color += rimLight;

    gl_FragColor = vec4(color, 1.0);

    #include <logdepthbuf_fragment>
  }
`;

// Type for EarthMaterial with uniforms as properties
type EarthMaterialImpl = THREE.ShaderMaterial & {
  uDayTexture: THREE.Texture | null;
  uNightTexture: THREE.Texture | null;
  uSunDirection: THREE.Vector3;
};

// Augment R3F's JSX types to include our custom material
declare module '@react-three/fiber' {
  interface ThreeElements {
    earthMaterial: {
      ref?: React.Ref<EarthMaterialImpl>;
      key?: React.Key;
      attach?: string;
      uDayTexture?: THREE.Texture | null;
      uNightTexture?: THREE.Texture | null;
      uSunDirection?: THREE.Vector3;
      // Standard material props
      depthWrite?: boolean;
      depthTest?: boolean;
      transparent?: boolean;
    };
  }
}

/**
 * Planet type categories for shader selection.
 */
type PlanetType = 'rocky' | 'earth' | 'gasGiant' | 'iceGiant' | 'moon';

const PLANET_TYPES: Record<string, PlanetType> = {
  Mercury: 'rocky',
  Venus: 'rocky',
  Earth: 'earth',
  Mars: 'rocky',
  Jupiter: 'gasGiant',
  Saturn: 'gasGiant',
  Uranus: 'iceGiant',
  Neptune: 'iceGiant',
  Moon: 'moon',
};

/**
 * Atmosphere properties per planet.
 */
const ATMOSPHERE_PROPS: Record<
  string,
  {
    color: [number, number, number];
    intensity: number;
    thickness: number;
    falloff: number;
  }
> = {
  Earth: { color: [0.3, 0.6, 1.0], intensity: 0.6, thickness: 0.02, falloff: 3.0 },
  Venus: { color: [0.9, 0.8, 0.5], intensity: 0.8, thickness: 0.04, falloff: 2.0 },
  Mars: { color: [0.8, 0.5, 0.3], intensity: 0.25, thickness: 0.01, falloff: 4.0 },
  Jupiter: { color: [0.9, 0.85, 0.7], intensity: 0.3, thickness: 0.03, falloff: 2.5 },
  Saturn: { color: [0.95, 0.9, 0.7], intensity: 0.25, thickness: 0.025, falloff: 2.5 },
  Uranus: { color: [0.5, 0.8, 0.9], intensity: 0.4, thickness: 0.03, falloff: 2.0 },
  Neptune: { color: [0.3, 0.5, 1.0], intensity: 0.5, thickness: 0.035, falloff: 2.0 },
};

// ---------------------------------------------------------------------------
// Quaternion-Based Orientation Helpers
// ---------------------------------------------------------------------------

/**
 * J2000 obliquity in radians (angle between ecliptic and equatorial planes).
 * Source: IAU 2006 Resolution B1
 */
const OBLIQUITY_J2000 = THREE.MathUtils.degToRad(23.439281);

/**
 * Computes a body orientation quaternion from north pole and rotation angle.
 * Used to align objects (like markers) with a planet's orientation.
 *
 * @param northPole North pole direction as [x, y, z] array
 * @param rotationAngleDeg Rotation angle in degrees (IAU W angle)
 * @param textureOffsetDeg Optional texture offset in degrees
 * @returns Quaternion as [x, y, z, w] array
 */
export function computeBodyQuaternion(
  northPole: [number, number, number],
  rotationAngleDeg: number,
  textureOffsetDeg = 0
): [number, number, number, number] {
  const pole = new THREE.Vector3(northPole[0], northPole[1], northPole[2]);
  const q = makeBodyQuaternion(pole, rotationAngleDeg, textureOffsetDeg);
  return [q.x, q.y, q.z, q.w];
}

/**
 * EQJ (J2000 equatorial) north pole direction in scene coordinates.
 * Scene uses ECL-to-Three convention where Y is ecliptic north.
 * EQJ north is tilted by obliquity from ecliptic north.
 */
const EQJ_NORTH_SCENE = new THREE.Vector3(
  0,
  Math.cos(OBLIQUITY_J2000),
  -Math.sin(OBLIQUITY_J2000)
).normalize();

/**
 * EQJ +X in scene coordinates (vernal equinox direction).
 * This direction survives EQJ→ECL and ECL→scene transforms as +X.
 */
const EQJ_X_SCENE = new THREE.Vector3(1, 0, 0);

/**
 * EQJ +Y axis in scene coordinates, computed robustly via cross product.
 * Y = Z × X in a right-handed basis (where Z is north).
 * This guarantees orthogonality and correct handedness.
 */
const EQJ_Y_SCENE = new THREE.Vector3()
  .crossVectors(EQJ_NORTH_SCENE, EQJ_X_SCENE)
  .normalize();

/**
 * Creates a quaternion that orients a body based on its north pole direction
 * and rotation angle W (from IAU rotation models: W = W0 + Wdot * d).
 *
 * This version properly defines the prime meridian reference by:
 * 1. Computing the node direction (intersection of EQJ equator and body equator planes)
 * 2. Using that as the reference for the W rotation angle
 * 3. Building a complete orthonormal basis
 *
 * This removes the arbitrary "twist" that setFromUnitVectors would introduce.
 *
 * @param northPoleScene North pole direction in scene coordinates (unit vector)
 * @param spinDeg Rotation angle W in degrees (prime meridian position from IAU model)
 * @param textureOffsetDeg Optional texture offset to align texture's 0-longitude (default: 0)
 * @returns Quaternion for the body orientation
 */
function makeBodyQuaternion(
  northPoleScene: THREE.Vector3,
  spinDeg: number,
  textureOffsetDeg = 0
): THREE.Quaternion {
  const pole = northPoleScene.clone().normalize();

  // Compute x0 (node direction) using EQJ basis to avoid catastrophic cancellation.
  // When pole ≈ EQJ_NORTH, cross(EQJ_NORTH, pole) subtracts nearly equal large terms.
  // Instead, project pole onto EQJ X/Y plane and construct x0 analytically:
  // In EQJ basis: Z × pole = (-py, px, 0), so x0 = -py*X + px*Y (normalized)
  const px = pole.dot(EQJ_X_SCENE);
  const py = pole.dot(EQJ_Y_SCENE);
  const r2 = px * px + py * py;

  const x0 = new THREE.Vector3();

  if (r2 < 1e-12) {
    // Truly degenerate: pole ~ EQJ north, alpha undefined.
    // Use IAU-conventional limiting direction for Earth-like cases (RA = 90°).
    x0.copy(EQJ_Y_SCENE);
  } else {
    const invR = 1 / Math.sqrt(r2);
    // x0 = normalize(Z × pole) = (-py * X + px * Y) / |projection|
    x0.copy(EQJ_X_SCENE).multiplyScalar(-py * invR);
    x0.addScaledVector(EQJ_Y_SCENE, px * invR);
  }

  // Ensure perfectly perpendicular to pole (cheap safety)
  x0.sub(pole.clone().multiplyScalar(x0.dot(pole))).normalize();

  // Force deterministic half-plane choice in near-degenerate region
  // to prevent 180° snaps when scrubbing time.
  // Earth-like poles have r2 ~ 1e-6 to 7e-6 due to precession; use 1e-4
  // for ample margin. No other planet has r2 below 0.2 (Mars is nearest at ~0.36).
  if (r2 < 1e-4 && x0.dot(EQJ_Y_SCENE) < 0) {
    x0.negate();
  }

  // Apply W rotation around the pole
  const W = THREE.MathUtils.degToRad(spinDeg + textureOffsetDeg);
  const qW = new THREE.Quaternion().setFromAxisAngle(pole, W);

  // x-axis of the body frame: prime meridian direction on the equator
  const xAxis = x0.clone().applyQuaternion(qW).normalize();

  // y-axis of the body frame: north pole
  const yAxis = pole;

  // z-axis: complete the right-handed basis
  const zAxis = new THREE.Vector3().crossVectors(xAxis, yAxis).normalize();

  // Build rotation matrix from basis vectors and convert to quaternion
  const m = new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis);
  return new THREE.Quaternion().setFromRotationMatrix(m);
}

/**
 * Computes orientation from either quaternion props or legacy tilt.
 * Returns either a quaternion array or rotation euler array.
 */
function computeBodyOrientation(
  northPole?: [number, number, number],
  rotationAngleDeg?: number,
  textureOffsetDeg?: number,
  tiltRadians?: number
): {
  quaternion?: [number, number, number, number];
  rotation?: [number, number, number];
} {
  // Use quaternion-based orientation if north pole is provided
  if (northPole) {
    const poleVec = new THREE.Vector3(northPole[0], northPole[1], northPole[2]);
    const q = makeBodyQuaternion(poleVec, rotationAngleDeg ?? 0, textureOffsetDeg ?? 0);
    return { quaternion: [q.x, q.y, q.z, q.w] };
  }

  // Fall back to legacy euler rotation (X-axis tilt).
  // In eclToThreeJs convention: ecliptic plane = XZ, +Y = ecliptic north.
  // Earth's pole is tilted from ecliptic north toward the solstice direction.
  // A positive tilt about -X (negative rotation about X) gives (0, cos(ε), -sin(ε)).
  return { rotation: [-(tiltRadians ?? 0), 0, 0] };
}

// ---------------------------------------------------------------------------
// Atmosphere Shell Shader
// ---------------------------------------------------------------------------

const ATMOSPHERE_VERTEX = `
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  void main() {
    // Use world-space normals for consistent lighting
    vNormal = normalize(mat3(modelMatrix) * normal);
    vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/**
 * Atmospheric scattering shell shader.
 * Includes day/night modulation to avoid glow on the night side.
 *
 * Note: This shader is rendered with THREE.BackSide, meaning we see the
 * inside of the atmosphere sphere. The rim calculation uses abs() to
 * handle the inverted normals correctly.
 */
const ATMOSPHERE_FRAGMENT = `
  uniform vec3 uSunDirection;
  uniform vec3 uAtmosphereColor;
  uniform float uIntensity;
  uniform float uFalloff;

  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  void main() {
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    vec3 normal = normalize(vNormal);

    // Rim intensity for BackSide rendering:
    // - At limb: dot ≈ 0, so abs(dot) ≈ 0, rim ≈ 1 (glow at edges)
    // - At center: abs(dot) ≈ 1, rim ≈ 0 (no glow in center)
    // Using abs() handles both front and back face cases correctly.
    float cosAngle = dot(viewDir, normal);
    float rim = 1.0 - abs(cosAngle);
    rim = pow(rim, uFalloff);

    // Day/night factor based on sun direction.
    // normal points outward from sphere center (correct for lighting calc).
    // uSunDirection points from planet toward sun.
    vec3 sunDir = normalize(uSunDirection);
    float sun = dot(normal, sunDir);

    // Only show atmosphere on day side (sun > 0) with soft terminator
    // smoothstep(-0.1, 0.3, sun) transitions from night to day
    float daylight = smoothstep(-0.1, 0.3, sun);

    // Skip rendering on night side completely
    if (daylight < 0.01) discard;

    vec3 color = uAtmosphereColor;

    // Alpha modulated by both rim effect and daylight
    float alpha = rim * uIntensity * 0.8 * daylight;
    if (alpha < 0.005) discard;

    gl_FragColor = vec4(color, alpha);
  }
`;

// ---------------------------------------------------------------------------
// Planet Component
// ---------------------------------------------------------------------------

export interface PlanetProps {
  /** Planet name (determines textures and rendering style) */
  name: string;

  /** Position in scene coordinates */
  position: [number, number, number];

  /** Radius in scene units */
  radius: number;

  /** Fallback color if no texture available */
  color?: string;

  /** Sun position for lighting calculations (default: origin) */
  sunPosition?: [number, number, number];

  /** Whether to show the planet label */
  showLabel?: boolean;

  /** Label text (defaults to planet name) */
  label?: string;

  /** Whether this planet is currently selected/focused */
  highlighted?: boolean;

  /** Click handler */
  onClick?: () => void;

  /** Override axial tilt (degrees) */
  axialTilt?: number;

  /**
   * North pole direction in scene coordinates (unit vector).
   * From IAU rotation model via ephemeris provider.
   * If provided, overrides built-in axial tilt computation.
   */
  northPole?: [number, number, number];

  /**
   * Prime meridian rotation angle at epoch in degrees (IAU model: W = W0 + Wdot * d).
   * If provided, sets the exact rotation of the planet's surface features.
   */
  rotationAngleDeg?: number;

  /**
   * Texture offset in degrees to align texture's 0-longitude with IAU prime meridian.
   * Different texture sources may place their 0-longitude at different positions.
   */
  textureOffsetDeg?: number;

  /** Override rotation speed multiplier */
  rotationSpeedMultiplier?: number;

  /** Enable real-time cloud data for Earth (matteason/live-cloud-maps) */
  realtimeClouds?: boolean;

  /** Current epoch in milliseconds (used for real-time cloud determination) */
  epochMs?: number;

  /** Show the rotation axis as a line through the poles */
  showRotationAxis?: boolean;
}

/**
 * Planet component with cinematic rendering.
 */
/**
 * Rotation axis visualization component.
 * Renders a line through the planet's poles with markers at north and south.
 */
function RotationAxis({
  radius,
  northPole,
  tiltRadians,
}: {
  radius: number;
  northPole?: [number, number, number];
  tiltRadians: number;
}) {
  // Axis extends 1.5x radius beyond the planet surface
  const axisLength = radius * 2.5;

  // Calculate axis direction
  const axisDirection = useMemo(() => {
    if (northPole) {
      return new THREE.Vector3(northPole[0], northPole[1], northPole[2]).normalize();
    }
    // Fallback: use tilt angle (rotation around -X axis from Y-up)
    // This matches the fallback rotation in computeBodyOrientation: [-(tiltRadians), 0, 0]
    // Rotating (0, 1, 0) by -ε around X gives (0, cos(ε), -sin(ε))
    return new THREE.Vector3(
      0,
      Math.cos(tiltRadians),
      -Math.sin(tiltRadians)
    ).normalize();
  }, [northPole, tiltRadians]);

  // North and south pole positions
  const northPos = axisDirection.clone().multiplyScalar(axisLength);
  const southPos = axisDirection.clone().multiplyScalar(-axisLength);

  return (
    <group>
      {/* Main axis line */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[
              new Float32Array([
                southPos.x,
                southPos.y,
                southPos.z,
                northPos.x,
                northPos.y,
                northPos.z,
              ]),
              3,
            ]}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#ffffff" opacity={0.4} transparent linewidth={1} />
      </line>

      {/* North pole marker (small cone pointing outward) */}
      <group position={[northPos.x, northPos.y, northPos.z]}>
        <mesh
          quaternion={new THREE.Quaternion().setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            axisDirection
          )}
        >
          <coneGeometry args={[radius * 0.08, radius * 0.2, 8]} />
          <meshBasicMaterial color="#4488ff" opacity={0.8} transparent />
        </mesh>
      </group>

      {/* South pole marker (small sphere) */}
      <mesh position={[southPos.x, southPos.y, southPos.z]}>
        <sphereGeometry args={[radius * 0.05, 8, 8]} />
        <meshBasicMaterial color="#ff8844" opacity={0.6} transparent />
      </mesh>

      {/* "N" label at north pole */}
      <Html
        position={[northPos.x * 1.15, northPos.y * 1.15, northPos.z * 1.15]}
        center
        style={{ pointerEvents: 'none' }}
      >
        <div className="text-[8px] text-blue-400/80 font-bold">N</div>
      </Html>
    </group>
  );
}

export function Planet({
  name,
  position,
  radius,
  color = '#888888',
  sunPosition = [0, 0, 0],
  showLabel = true,
  label,
  highlighted = false,
  onClick,
  axialTilt,
  rotationSpeedMultiplier = 1,
  realtimeClouds = false,
  epochMs,
  northPole,
  rotationAngleDeg,
  textureOffsetDeg,
  showRotationAxis = false,
}: PlanetProps) {
  const { profile, initialized } = useRenderProfile();

  const isCinematic = initialized && profile.fidelity === 'cinematic';
  const isAnimated = profile.animation !== 'off';
  const planetType = PLANET_TYPES[name] || 'rocky';
  const isEarth = name === 'Earth';
  const hasAtmosphere = ATMOSPHERE_PROPS[name] !== undefined;

  // Get texture path - always provide a valid path for the hook
  const texturePath = TEXTURE_PATHS[name] || '/textures/2k_moon.jpg';

  // Sun direction: vector pointing FROM planet TOWARD the Sun.
  // Used by shaders to determine which surfaces face the Sun (daytime).
  const sunDirection = useMemo(() => {
    return new THREE.Vector3(
      sunPosition[0] - position[0],
      sunPosition[1] - position[1],
      sunPosition[2] - position[2]
    ).normalize();
  }, [sunPosition, position]);

  // Atmosphere properties - memoize to avoid recreating Vector3 on every render
  const atmosphereProps = ATMOSPHERE_PROPS[name];
  const atmosphereColor = useMemo(() => {
    return atmosphereProps
      ? new THREE.Vector3(...atmosphereProps.color)
      : new THREE.Vector3(0.5, 0.5, 0.5);
  }, [atmosphereProps]);

  // Axial tilt (legacy fallback when northPole not provided)
  const tiltRadians = useMemo(() => {
    const tilt = axialTilt ?? getAxialTiltDeg(name);
    return (tilt * Math.PI) / 180;
  }, [name, axialTilt]);

  // Compute body orientation (quaternion if northPole provided, else legacy rotation)
  // Extract north pole components for stable dependency tracking
  const npX = northPole?.[0];
  const npY = northPole?.[1];
  const npZ = northPole?.[2];

  const bodyOrientation = useMemo(() => {
    return computeBodyOrientation(
      northPole,
      rotationAngleDeg,
      textureOffsetDeg,
      tiltRadians
    );
  }, [northPole, npX, npY, npZ, rotationAngleDeg, textureOffsetDeg, tiltRadians]);

  // Rotation animation
  const siderealPeriod = getSiderealPeriodSeconds(name);
  // Let the profile be the single source of truth for segments
  // (do not multiply for cinematic - that defeats adaptive quality)
  const segments = profile.sphereSegments;

  // Render a standard (non-cinematic) planet
  if (!isCinematic) {
    return (
      <>
        <StandardPlanet
          name={name}
          position={position}
          radius={radius}
          color={color}
          texturePath={texturePath}
          sunDirection={sunDirection}
          atmosphereColor={atmosphereColor}
          atmosphereProps={atmosphereProps}
          tiltRadians={tiltRadians}
          bodyOrientation={bodyOrientation}
          segments={segments}
          siderealPeriod={siderealPeriod}
          isAnimated={isAnimated}
          rotationSpeedMultiplier={rotationSpeedMultiplier}
          animationMode={profile.animation}
          showLabel={showLabel}
          label={label}
          highlighted={highlighted}
          onClick={onClick}
          realtimeClouds={realtimeClouds}
          epochMs={epochMs}
        />
        {showRotationAxis && (
          <group position={position}>
            <RotationAxis
              radius={radius}
              northPole={northPole}
              tiltRadians={tiltRadians}
            />
          </group>
        )}
      </>
    );
  }

  // Render a cinematic planet
  return (
    <>
      <CinematicPlanetInner
        name={name}
        position={position}
        radius={radius}
        color={color}
        texturePath={texturePath}
        planetType={planetType}
        isEarth={isEarth}
        hasAtmosphere={hasAtmosphere}
        sunDirection={sunDirection}
        atmosphereColor={atmosphereColor}
        atmosphereProps={atmosphereProps}
        tiltRadians={tiltRadians}
        bodyOrientation={bodyOrientation}
        segments={segments}
        siderealPeriod={siderealPeriod}
        isAnimated={isAnimated}
        rotationSpeedMultiplier={rotationSpeedMultiplier}
        animationMode={profile.animation}
        showLabel={showLabel}
        label={label}
        highlighted={highlighted}
        onClick={onClick}
        realtimeClouds={realtimeClouds}
        epochMs={epochMs}
      />
      {showRotationAxis && (
        <group position={position}>
          <RotationAxis radius={radius} northPole={northPole} tiltRadians={tiltRadians} />
        </group>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Standard Planet (non-cinematic)
// ---------------------------------------------------------------------------

interface StandardPlanetProps {
  name: string;
  position: [number, number, number];
  radius: number;
  color: string;
  texturePath: string;
  sunDirection: THREE.Vector3;
  atmosphereColor: THREE.Vector3;
  atmosphereProps?: {
    color: [number, number, number];
    intensity: number;
    thickness: number;
    falloff: number;
  };
  tiltRadians: number;
  bodyOrientation: {
    quaternion?: [number, number, number, number];
    rotation?: [number, number, number];
  };
  segments: number;
  siderealPeriod: number;
  isAnimated: boolean;
  rotationSpeedMultiplier: number;
  animationMode: string;
  showLabel: boolean;
  label?: string;
  highlighted: boolean;
  onClick?: () => void;
  realtimeClouds?: boolean;
  epochMs?: number;
}

function StandardPlanet({
  name,
  position,
  radius,
  color: _color,
  texturePath,
  sunDirection,
  atmosphereColor,
  atmosphereProps,
  tiltRadians: _tiltRadians,
  bodyOrientation,
  segments,
  siderealPeriod,
  isAnimated,
  rotationSpeedMultiplier,
  animationMode,
  showLabel,
  label,
  highlighted,
  onClick,
  realtimeClouds,
  epochMs,
}: StandardPlanetProps) {
  const groupRef = useRef<Group>(null);
  const meshRef = useRef<Mesh>(null);

  // Check if this is Earth - render with special shaders
  const isEarth = name === 'Earth';

  // These props are kept for API compatibility but not used in standard mode
  // Standard mode uses MeshStandardMaterial which gets lighting from the scene
  void _color;

  // Load texture
  const texture = useLoader(THREE.TextureLoader, texturePath);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 16;

  // If this is Earth, render with special Earth shaders (even in standard mode)
  if (isEarth) {
    return (
      <EarthPlanet
        position={position}
        radius={radius}
        texturePath={texturePath}
        sunDirection={sunDirection}
        atmosphereColor={atmosphereColor}
        atmosphereProps={atmosphereProps}
        bodyOrientation={bodyOrientation}
        segments={segments}
        siderealPeriod={siderealPeriod}
        isAnimated={isAnimated}
        rotationSpeedMultiplier={rotationSpeedMultiplier}
        animationMode={animationMode}
        showLabel={showLabel}
        label={label}
        highlighted={highlighted}
        onClick={onClick}
        realtimeClouds={realtimeClouds}
        epochMs={epochMs}
      />
    );
  }

  // Apply orientation: quaternion if available, otherwise legacy rotation
  const orientationProps = bodyOrientation.quaternion
    ? { quaternion: bodyOrientation.quaternion }
    : { rotation: bodyOrientation.rotation };

  return (
    <group ref={groupRef} position={position}>
      <group {...orientationProps}>
        <mesh
          ref={meshRef}
          renderOrder={0}
          onClick={(e) => {
            e.stopPropagation();
            onClick?.();
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            document.body.style.cursor = 'pointer';
          }}
          onPointerOut={() => {
            document.body.style.cursor = 'auto';
          }}
        >
          <sphereGeometry args={[radius, segments, segments]} />
          <meshStandardMaterial map={texture} roughness={0.9} metalness={0.0} />
        </mesh>
      </group>

      {showLabel && (
        <Html position={[0, radius + 0.08, 0]} center style={{ pointerEvents: 'none' }}>
          <div
            className={`text-[8px] whitespace-nowrap ${highlighted ? 'text-blue-300 font-bold' : 'text-white/50'}`}
          >
            {label ?? name}
          </div>
        </Html>
      )}
    </group>
  );
}

// ---------------------------------------------------------------------------
// Cinematic Planet (full shaders)
// ---------------------------------------------------------------------------

interface CinematicPlanetInnerProps extends StandardPlanetProps {
  planetType: PlanetType;
  isEarth: boolean;
  hasAtmosphere: boolean;
  realtimeClouds?: boolean;
  epochMs?: number;
}

function CinematicPlanetInner({
  name,
  position,
  radius,
  color: _color,
  texturePath,
  planetType,
  isEarth,
  hasAtmosphere,
  sunDirection,
  atmosphereColor,
  atmosphereProps,
  tiltRadians: _tiltRadians,
  bodyOrientation,
  segments,
  siderealPeriod: _siderealPeriod,
  isAnimated: _isAnimated,
  rotationSpeedMultiplier: _rotationSpeedMultiplier,
  animationMode: _animationMode,
  showLabel,
  label,
  highlighted,
  onClick,
  realtimeClouds,
  epochMs,
}: CinematicPlanetInnerProps) {
  const groupRef = useRef<Group>(null);
  const meshRef = useRef<Mesh>(null);
  const atmosphereShaderRef = useRef<ShaderMaterial>(null);

  // These props are kept for API compatibility but not used in cinematic mode
  void _color;
  void _siderealPeriod;
  void _isAnimated;
  void _rotationSpeedMultiplier;
  void _animationMode;
  void planetType; // May be used later for differentiated rendering

  // Load main texture
  const texture = useLoader(THREE.TextureLoader, texturePath);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 16;

  // Atmosphere shader uniforms
  const atmosphereUniforms = useMemo(
    () => ({
      uSunDirection: { value: sunDirection.clone() },
      uAtmosphereColor: { value: atmosphereColor },
      uIntensity: { value: atmosphereProps?.intensity ?? 0.3 },
      uFalloff: { value: atmosphereProps?.falloff ?? 3.0 },
    }),
    [atmosphereColor, atmosphereProps, sunDirection]
  );
  // Update sun direction in useFrame for smooth animation
  useFrame(() => {
    if (atmosphereShaderRef.current?.uniforms?.uSunDirection) {
      atmosphereShaderRef.current.uniforms.uSunDirection.value.copy(sunDirection);
    }
  });

  // If this is Earth, render with special Earth shaders
  if (isEarth) {
    return (
      <EarthPlanet
        position={position}
        radius={radius}
        texturePath={texturePath}
        sunDirection={sunDirection}
        atmosphereColor={atmosphereColor}
        atmosphereProps={atmosphereProps}
        bodyOrientation={bodyOrientation}
        segments={segments}
        siderealPeriod={_siderealPeriod}
        isAnimated={_isAnimated}
        rotationSpeedMultiplier={_rotationSpeedMultiplier}
        animationMode={_animationMode}
        showLabel={showLabel}
        label={label}
        highlighted={highlighted}
        onClick={onClick}
        realtimeClouds={realtimeClouds}
        epochMs={epochMs}
      />
    );
  }

  // Apply orientation: quaternion if available, otherwise legacy rotation
  const orientationProps = bodyOrientation.quaternion
    ? { quaternion: bodyOrientation.quaternion }
    : { rotation: bodyOrientation.rotation };

  return (
    <group ref={groupRef} position={position}>
      <group {...orientationProps}>
        {/* Main planet sphere using MeshStandardMaterial for proper PBR lighting */}
        <mesh
          ref={meshRef}
          renderOrder={0}
          onClick={(e) => {
            e.stopPropagation();
            onClick?.();
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            document.body.style.cursor = 'pointer';
          }}
          onPointerOut={() => {
            document.body.style.cursor = 'auto';
          }}
        >
          <sphereGeometry args={[radius, segments, segments]} />
          <meshStandardMaterial map={texture} roughness={0.85} metalness={0.0} />
        </mesh>

        {/* Atmosphere shell (for planets with atmosphere) - single transparent layer */}
        {hasAtmosphere && (
          <mesh renderOrder={100}>
            <sphereGeometry args={[radius * 1.02, segments, segments]} />
            <shaderMaterial
              ref={atmosphereShaderRef}
              vertexShader={ATMOSPHERE_VERTEX}
              fragmentShader={ATMOSPHERE_FRAGMENT}
              uniforms={atmosphereUniforms}
              transparent
              depthWrite={false}
              side={THREE.BackSide}
            />
          </mesh>
        )}
      </group>

      {showLabel && (
        <Html position={[0, radius + 0.08, 0]} center style={{ pointerEvents: 'none' }}>
          <div
            className={`text-[8px] whitespace-nowrap ${highlighted ? 'text-blue-300 font-bold' : 'text-white/50'}`}
          >
            {label ?? name}
          </div>
        </Html>
      )}
    </group>
  );
}

// ---------------------------------------------------------------------------
// Earth Planet (special treatment with day/night/clouds)
// ---------------------------------------------------------------------------

interface EarthPlanetProps {
  position: [number, number, number];
  radius: number;
  texturePath: string;
  sunDirection: THREE.Vector3;
  atmosphereColor: THREE.Vector3;
  atmosphereProps?: {
    color: [number, number, number];
    intensity: number;
    thickness: number;
    falloff: number;
  };
  bodyOrientation: {
    quaternion?: [number, number, number, number];
    rotation?: [number, number, number];
  };
  segments: number;
  siderealPeriod: number;
  isAnimated: boolean;
  rotationSpeedMultiplier: number;
  animationMode: string;
  showLabel: boolean;
  label?: string;
  highlighted: boolean;
  onClick?: () => void;
  /** Enable real-time cloud data from matteason/live-cloud-maps */
  realtimeClouds?: boolean;
  /** Current epoch in milliseconds (used to determine if "now-ish" for real-time clouds) */
  epochMs?: number;
}

function EarthPlanet({
  position,
  radius,
  sunDirection,
  atmosphereColor,
  atmosphereProps,
  bodyOrientation,
  segments,
  siderealPeriod: _siderealPeriod,
  isAnimated: _isAnimated,
  rotationSpeedMultiplier: _rotationSpeedMultiplier,
  animationMode: _animationMode,
  showLabel,
  label,
  highlighted,
  onClick,
  realtimeClouds: _realtimeClouds,
  epochMs: _epochMs,
}: EarthPlanetProps) {
  const groupRef = useRef<Group>(null);
  const meshRef = useRef<Mesh>(null);
  const atmosphereShaderRef = useRef<ShaderMaterial>(null);

  // These props are kept for API compatibility but not used
  void _siderealPeriod;
  void _isAnimated;
  void _rotationSpeedMultiplier;
  void _animationMode;
  void _realtimeClouds;
  void _epochMs;

  // Load Earth textures (day and night for day/night blending)
  const dayTexture = useLoader(THREE.TextureLoader, EARTH_TEXTURES.day);
  const nightTexture = useLoader(THREE.TextureLoader, EARTH_TEXTURES.night);

  // Configure textures for best quality
  dayTexture.colorSpace = THREE.SRGBColorSpace;
  dayTexture.anisotropy = 16;
  nightTexture.colorSpace = THREE.SRGBColorSpace;
  nightTexture.anisotropy = 16;

  // Refs for shader materials (to update uniforms per frame)
  const earthShaderRef = useRef<ShaderMaterial>(null);

  // Earth day/night shader uniforms
  const earthUniforms = useMemo(
    () => ({
      uDayTexture: { value: dayTexture },
      uNightTexture: { value: nightTexture },
      uSunDirection: { value: sunDirection.clone() },
    }),
    [dayTexture, nightTexture, sunDirection]
  );

  // Atmosphere shader uniforms
  const atmosphereUniforms = useMemo(
    () => ({
      uSunDirection: { value: sunDirection.clone() },
      uAtmosphereColor: { value: atmosphereColor },
      uIntensity: { value: atmosphereProps?.intensity ?? 0.5 },
      uFalloff: { value: atmosphereProps?.falloff ?? 3.0 },
    }),
    [atmosphereColor, atmosphereProps, sunDirection]
  );

  // Update sun direction each frame for smooth animation
  useFrame(() => {
    // Update Earth shader sun direction
    if (earthShaderRef.current?.uniforms?.uSunDirection) {
      earthShaderRef.current.uniforms.uSunDirection.value.copy(sunDirection);
    }
    // Update atmosphere shader sun direction
    if (atmosphereShaderRef.current?.uniforms?.uSunDirection) {
      atmosphereShaderRef.current.uniforms.uSunDirection.value.copy(sunDirection);
    }
  });

  // Apply orientation: quaternion if available, otherwise legacy rotation
  const orientationProps = bodyOrientation.quaternion
    ? { quaternion: bodyOrientation.quaternion }
    : { rotation: bodyOrientation.rotation };

  return (
    <group ref={groupRef} position={position}>
      <group {...orientationProps}>
        {/* Main Earth sphere with day/night shader */}
        <mesh
          ref={meshRef}
          renderOrder={0}
          onClick={(e) => {
            e.stopPropagation();
            onClick?.();
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            document.body.style.cursor = 'pointer';
          }}
          onPointerOut={() => {
            document.body.style.cursor = 'auto';
          }}
        >
          <sphereGeometry args={[radius, segments, segments]} />
          <shaderMaterial
            ref={earthShaderRef}
            vertexShader={EARTH_VERTEX_SHADER}
            fragmentShader={EARTH_FRAGMENT_SHADER}
            uniforms={earthUniforms}
            depthWrite={true}
            depthTest={true}
            transparent={false}
            side={THREE.FrontSide}
          />
        </mesh>

        {/* Atmosphere shell with day/night aware glow */}
        <mesh renderOrder={100}>
          <sphereGeometry args={[radius * 1.02, segments, segments]} />
          <shaderMaterial
            ref={atmosphereShaderRef}
            vertexShader={ATMOSPHERE_VERTEX}
            fragmentShader={ATMOSPHERE_FRAGMENT}
            uniforms={atmosphereUniforms}
            transparent
            depthWrite={false}
            side={THREE.BackSide}
          />
        </mesh>
      </group>

      {showLabel && (
        <Html position={[0, radius + 0.08, 0]} center style={{ pointerEvents: 'none' }}>
          <div
            className={`text-[8px] whitespace-nowrap ${highlighted ? 'text-blue-300 font-bold' : 'text-white/50'}`}
          >
            {label ?? 'Earth'}
          </div>
        </Html>
      )}
    </group>
  );
}
