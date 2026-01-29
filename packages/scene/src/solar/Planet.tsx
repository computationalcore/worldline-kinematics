/**
 * Cinematic planet renderer with PBR shaders.
 */

'use client';

import { useRef, useMemo } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { Html } from '@react-three/drei';
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
 * Additional Earth textures (8k resolution).
 */
const EARTH_TEXTURES = {
  day: '/textures/8k_earth_daymap.jpg',
  night: '/textures/8k_earth_nightmap.jpg',
  clouds: '/textures/8k_earth_clouds.jpg',
};

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
 * EQJ +Y axis in scene coordinates (RA = 90° on the equator).
 *
 * For the IAU rotation model, the reference direction for W is effectively:
 *   x0 ∝ Z_ref × pole
 * which points toward RA = α + 90° (where α is the pole's right ascension).
 *
 * For Earth (pole ≈ EQJ north, α ≈ 0°), Z_ref × pole degenerates to zero length.
 * The limiting direction is RA = 90°, i.e. EQJ +Y (not EQJ +X).
 *
 * Derivation: EQJ +Y = (0, 1, 0)
 *   -> ECL (rotate by +ε about X): (0, cos(ε), sin(ε))
 *   -> Scene (x, z, -y): (0, sin(ε), -cos(ε))
 */
const EQJ_Y_SCENE = new THREE.Vector3(
  0,
  Math.sin(OBLIQUITY_J2000),
  -Math.cos(OBLIQUITY_J2000)
).normalize();

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

  // Compute node direction: intersection of EQJ equator plane and body equator plane.
  // This is perpendicular to both north poles.
  let x0 = new THREE.Vector3().crossVectors(EQJ_NORTH_SCENE, pole);

  // Detect near-alignment (Earth-like) and use stable limiting direction.
  // When pole is nearly aligned with EQJ north, the cross product becomes
  // numerically unstable - tiny changes in pole direction can flip x0 by 180°.
  // dot > 0.9999 means within ~0.8° of alignment.
  const aligned = Math.abs(pole.dot(EQJ_NORTH_SCENE)) > 0.9999;

  if (aligned || x0.lengthSq() < 1e-12) {
    // Degenerate case: pole ~ aligned with EQJ north (Earth).
    // The IAU W angle is referenced to RA = α + 90°. For Earth α ≈ 0° => RA ≈ 90°.
    // So the correct stable fallback is EQJ +Y (not EQJ +X).
    x0 = EQJ_Y_SCENE.clone();
    // Project onto the plane perpendicular to pole
    x0.sub(pole.clone().multiplyScalar(x0.dot(pole)));
  }
  x0.normalize();

  // Apply the W rotation around the pole
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

  // Sun direction (computed early for use in shaders)
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
}

function StandardPlanet({
  name,
  position,
  radius,
  color: _color,
  texturePath,
  sunDirection: _sunDirection,
  atmosphereColor: _atmosphereColor,
  atmosphereProps: _atmosphereProps,
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
}: StandardPlanetProps) {
  const groupRef = useRef<Group>(null);
  const meshRef = useRef<Mesh>(null);

  // These props are kept for API compatibility but not used in standard mode
  // Standard mode uses MeshStandardMaterial which gets lighting from the scene
  void _color;
  void _siderealPeriod;
  void _isAnimated;
  void _rotationSpeedMultiplier;
  void _animationMode;
  void _sunDirection;
  void _atmosphereColor;
  void _atmosphereProps;

  // Load texture
  const texture = useLoader(THREE.TextureLoader, texturePath);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 16;

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
          castShadow
          receiveShadow
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
          castShadow
          receiveShadow
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

  // Load Earth day texture
  const dayTexture = useLoader(THREE.TextureLoader, EARTH_TEXTURES.day);
  dayTexture.colorSpace = THREE.SRGBColorSpace;
  dayTexture.anisotropy = 16;

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
  // Update sun direction in useFrame for smooth animation
  useFrame(() => {
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
        {/* Main Earth sphere - MeshStandardMaterial for proper PBR lighting and shadows */}
        <mesh
          ref={meshRef}
          renderOrder={0}
          castShadow
          receiveShadow
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
          <meshStandardMaterial map={dayTexture} roughness={0.8} metalness={0.0} />
        </mesh>

        {/* Atmosphere shell - single transparent overlay */}
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
