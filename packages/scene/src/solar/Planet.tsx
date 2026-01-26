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

// ---------------------------------------------------------------------------
// Planet Physical Data
// ---------------------------------------------------------------------------

/**
 * Sidereal rotation periods in seconds.
 * Source: NASA Planetary Fact Sheets
 * https://nssdc.gsfc.nasa.gov/planetary/factsheet/
 */
const SIDEREAL_PERIODS: Record<string, number> = {
  Mercury: 5067031.68, // 58.646 days
  Venus: -20996798.4, // -243.018 days (retrograde)
  Earth: 86164.0905, // 23h 56m 4.0905s
  Mars: 88642.6848, // 24h 37m 22.6848s
  Jupiter: 35730, // 9h 55m 30s (mean)
  Saturn: 38362.4, // 10h 39m 22.4s (mean)
  Uranus: -62063.712, // -17h 14m 23.712s (retrograde)
  Neptune: 57996, // 16h 6m 36s
  Moon: 2360591.5, // 27.32 days (synchronous)
};

/**
 * Axial tilts in degrees.
 * Source: NASA Planetary Fact Sheets
 */
const AXIAL_TILTS: Record<string, number> = {
  Mercury: 0.034,
  Venus: 177.4, // Nearly upside down
  Earth: 23.44,
  Mars: 25.19,
  Jupiter: 3.13,
  Saturn: 26.73,
  Uranus: 97.77, // Rolls on its side
  Neptune: 28.32,
  Moon: 6.68,
};

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
 * Vernal equinox direction (shared by EQJ and ECL frames) in scene coordinates.
 * This is the +X axis in both frames.
 */
const EQJ_X_SCENE = new THREE.Vector3(1, 0, 0);

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

  if (x0.lengthSq() < 1e-12) {
    // Degenerate case: pole is nearly aligned with EQJ north (Earth-like).
    // Use vernal equinox direction projected onto body equator plane.
    x0 = EQJ_X_SCENE.clone();
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

  // Fall back to legacy euler rotation (Z-axis tilt only)
  return { rotation: [0, 0, tiltRadians ?? 0] };
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

    // Rim intensity (atmosphere visible at edges)
    float rim = 1.0 - max(dot(viewDir, vNormal), 0.0);
    rim = pow(rim, uFalloff);

    // Day/night factor
    float dayFactor = dot(vNormal, uSunDirection);
    float daySide = smoothstep(-0.3, 0.5, dayFactor);

    // Scatter color varies with angle to sun
    vec3 dayColor = uAtmosphereColor;
    vec3 twilightColor = uAtmosphereColor * vec3(1.2, 0.8, 0.6); // Warmer at terminator
    vec3 nightColor = uAtmosphereColor * 0.1;

    vec3 color = mix(nightColor, mix(twilightColor, dayColor, smoothstep(0.0, 0.3, dayFactor)), daySide);

    float alpha = rim * uIntensity * (0.3 + daySide * 0.7);
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
    // Fallback: use tilt angle (rotation around X axis from Y-up)
    return new THREE.Vector3(0, Math.cos(tiltRadians), Math.sin(tiltRadians)).normalize();
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
    const tilt = axialTilt ?? AXIAL_TILTS[name] ?? 0;
    return (tilt * Math.PI) / 180;
  }, [name, axialTilt]);

  // Compute body orientation (quaternion if northPole provided, else legacy rotation)
  const bodyOrientation = useMemo(() => {
    return computeBodyOrientation(
      northPole,
      rotationAngleDeg,
      textureOffsetDeg,
      tiltRadians
    );
  }, [northPole, rotationAngleDeg, textureOffsetDeg, tiltRadians]);

  // Rotation animation
  const siderealPeriod = SIDEREAL_PERIODS[name] ?? 86400;
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

  // Atmosphere shader uniforms - stable configuration
  const atmosphereUniforms = useMemo(
    () => ({
      uSunDirection: { value: sunDirection.clone() },
      uAtmosphereColor: { value: atmosphereColor },
      uIntensity: { value: atmosphereProps?.intensity ?? 0.3 },
      uFalloff: { value: atmosphereProps?.falloff ?? 3.0 },
    }),
    [atmosphereColor, atmosphereProps]
  );
  // Update sun direction in useFrame to avoid uniform churn
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

  // Atmosphere shader uniforms - simple, stable configuration
  const atmosphereUniforms = useMemo(
    () => ({
      uSunDirection: { value: sunDirection.clone() },
      uAtmosphereColor: { value: atmosphereColor },
      uIntensity: { value: atmosphereProps?.intensity ?? 0.5 },
      uFalloff: { value: atmosphereProps?.falloff ?? 3.0 },
    }),
    [atmosphereColor, atmosphereProps]
  );
  // Update sun direction in useFrame to avoid uniform churn
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
