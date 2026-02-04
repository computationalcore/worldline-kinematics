/**
 * 3D scene component with mode-based visualization.
 * Uses real planetary positions from astronomy-engine.
 * Features:
 * - Accurate orbital inclinations for all planets
 * - Moon with accurate position and orbit
 * - Time-based sun lighting
 * - Animated transitions between views
 */

'use client';

import { Canvas, useLoader, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Line, Html } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import {
  Suspense,
  useMemo,
  useState,
  useRef,
  useCallback,
  useEffect,
  createContext,
  useContext,
} from 'react';
import * as THREE from 'three';
import {
  Earth,
  UserMarker,
  RenderProfileProvider,
  Sun as FidelitySun,
  SaturnRings as FidelitySaturnRings,
  Planet as CinematicPlanet,
  computeBodyQuaternion,
} from '@worldline-kinematics/scene';
import type { ReferenceFrame } from '@worldline-kinematics/core';
import {
  formatLightTime,
  DateSlider,
  type DateSliderViewMode,
  LanguageSwitcher,
} from '@worldline-kinematics/ui';
import {
  getPlanetPositionsWithPreset,
  getMoonPositionWithPreset,
  ORBITAL_ELEMENTS,
  RENDER_PRESETS,
  type PlanetPosition,
  type MoonPosition,
  type PresetName,
} from '../utils/planetaryPositions';
import { useLocaleContext } from '../contexts/LocaleContext';
import {
  ORBITAL_VELOCITIES,
  PLANET_INFO,
  ROTATION_SPEEDS_KMH,
  BODY_ORDER,
  PRESET_INFO,
  VISIBLE_PRESETS,
  PlanetSelector,
  VisualModeInfoModal,
  type SelectedBody,
} from './scene/index';
import { getAppContent } from '../i18n';
import { IS_DEVELOPMENT } from '../config';
import { SpacetimeTitle } from './SpacetimeTitle';
import { MobileSettingsSheet } from './MobileSettingsSheet';

// Translation context for components that need localized content
type AppContent = ReturnType<typeof getAppContent>;
const ContentContext = createContext<AppContent | null>(null);

function useContent(): AppContent {
  const content = useContext(ContentContext);
  if (!content) {
    throw new Error('useContent must be used within ContentContext.Provider');
  }
  return content;
}

/** Methods exposed by Scene for external control */
export interface SceneHandle {
  /** Prepare the scene for share screenshot (focus on Earth at birth date). Returns true if changes were made. */
  prepareForShare: () => boolean;
}

interface SceneProps {
  mode: ReferenceFrame;
  latitude: number;
  longitude?: number;
  birthDate?: Date | null;
  showBirthMarker?: boolean;
  onEditBirthData?: () => void;
  /** Birth place name (e.g., "Rio de Janeiro, Brazil") for display */
  birthPlaceName?: string | null;
  /** Called when the scene is fully loaded and ready to display */
  onReady?: () => void;
  /** Called with the canvas element for screenshot capture */
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
  /** Ref to expose scene control methods */
  sceneRef?: React.RefObject<SceneHandle | null>;
}

// Enable THREE.js asset caching only in production for better performance on revisits
// In development, disable caching to properly test loading behavior
THREE.Cache.enabled = !IS_DEVELOPMENT;

/**
 * Computes the expected subsolar longitude for a given UTC time.
 * The subsolar point is where the Sun is directly overhead.
 *
 * At UTC noon (12:00), the subsolar point is approximately at longitude 0 (Greenwich).
 * The subsolar point moves westward at 15 degrees per hour as Earth rotates eastward.
 *
 * @param date UTC date/time
 * @returns Subsolar longitude in degrees (-180 to 180)
 */
function computeExpectedSubsolarLongitude(date: Date): number {
  const utcHours =
    date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  // At 12:00 UTC, subsolar longitude = 0
  // Each hour after noon, longitude decreases by 15 degrees (moves westward)
  // Each hour before noon, longitude increases by 15 degrees (moves eastward)
  let longitude = (12 - utcHours) * 15;
  // Normalize to -180 to 180
  while (longitude > 180) longitude -= 360;
  while (longitude < -180) longitude += 360;
  return longitude;
}

/**
 * Tracks WebGL asset loading and notifies when complete.
 * Must be used inside a Canvas context.
 *
 * Subscribes directly to THREE's DefaultLoadingManager in an effect
 * to avoid state updates during render. Waits for textures to both
 * START and FINISH loading before signaling ready.
 */
function SceneLoadingTracker({ onReady }: { onReady: () => void }) {
  const hasCalledReady = useRef(false);
  const hasLoadingStarted = useRef(false);
  const pendingItems = useRef(0);
  const totalItemsLoaded = useRef(0);

  useEffect(() => {
    const manager = THREE.DefaultLoadingManager;

    const originalOnStart = manager.onStart;
    const originalOnLoad = manager.onLoad;
    const originalOnProgress = manager.onProgress;
    const originalOnError = manager.onError;

    const signalReady = () => {
      if (hasCalledReady.current) return;
      hasCalledReady.current = true;

      // Double requestAnimationFrame to ensure the frame has painted
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          onReady();
        });
      });
    };

    // Track when each item starts loading
    manager.onStart = (url, loaded, total) => {
      hasLoadingStarted.current = true;
      pendingItems.current = total - loaded;
      originalOnStart?.(url, loaded, total);
    };

    // Track progress to know how many items are pending
    manager.onProgress = (url, loaded, total) => {
      hasLoadingStarted.current = true;
      pendingItems.current = total - loaded;
      totalItemsLoaded.current = loaded;
      originalOnProgress?.(url, loaded, total);
    };

    // Track when all loading completes
    manager.onLoad = () => {
      originalOnLoad?.();
      pendingItems.current = 0;

      // Only signal ready if loading actually started
      // This prevents premature ready when no textures were queued yet
      if (hasLoadingStarted.current) {
        signalReady();
      }
    };

    // Also handle errors - don't block forever if a texture fails
    manager.onError = (url) => {
      originalOnError?.(url);
      // Continue anyway after error
    };

    // Poll to check if loading is truly complete
    // We need to wait for loading to START first, then for it to complete
    // Minimum wait time ensures textures have a chance to begin loading
    const MIN_WAIT_MS = 1000; // Wait at least 1 second for loading to start
    const startTime = Date.now();

    const pollInterval = setInterval(() => {
      if (hasCalledReady.current) {
        clearInterval(pollInterval);
        return;
      }

      const elapsed = Date.now() - startTime;

      // Don't check until minimum time has passed
      if (elapsed < MIN_WAIT_MS) {
        return;
      }

      // If loading has started AND all items are loaded, we're ready
      if (hasLoadingStarted.current && pendingItems.current === 0) {
        // Wait one more cycle to be sure nothing else is queued
        setTimeout(() => {
          if (hasCalledReady.current) return;
          if (pendingItems.current === 0) {
            signalReady();
          }
        }, 200);
      }

      // Fallback: if no loading started after 3 seconds, assume no textures
      // and signal ready (shouldn't happen in normal operation)
      if (!hasLoadingStarted.current && elapsed > 3000) {
        signalReady();
      }
    }, 100);

    // Cleanup
    return () => {
      manager.onStart = originalOnStart;
      manager.onLoad = originalOnLoad;
      manager.onProgress = originalOnProgress;
      manager.onError = originalOnError;
      clearInterval(pollInterval);
    };
  }, [onReady]);

  return null;
}

/**
 * Sun wrapper that uses the fidelity-aware Sun component.
 * In Standard mode: Textured sphere with basic material.
 * In Cinematic mode: Animated procedural surface with corona.
 *
 * The position prop supports floating-origin rendering.
 */
function Sun({
  size = 0.25,
  position = [0, 0, 0] as [number, number, number],
  onClick,
  highlight = false,
  showLabel = false,
}: {
  size?: number;
  position?: [number, number, number];
  onClick?: () => void;
  highlight?: boolean;
  showLabel?: boolean;
}) {
  const content = useContent();
  return (
    <group position={position}>
      <mesh
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
        <sphereGeometry args={[size, 1, 1]} />
        <meshBasicMaterial visible={false} />
      </mesh>
      <FidelitySun radius={size} />
      {/* No decay - light reaches all planets regardless of scale mode */}
      <pointLight intensity={3} decay={0} color="#fff8e0" />

      {/* Clickable label */}
      {showLabel && (
        <Html position={[0, size + 0.08, 0]} center style={{ pointerEvents: 'auto' }}>
          <div
            className="flex flex-col items-center gap-0.5 cursor-pointer"
            onClick={onClick}
          >
            <div
              className={`text-[6px] sm:text-[8px] whitespace-nowrap hover:text-yellow-300 transition-colors ${highlight ? 'text-yellow-300 font-bold' : 'text-white/50'}`}
            >
              {content.planets.Sun}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

/**
 * Asteroid belt visualization using instanced points.
 * Main belt: 2.06 - 3.27 AU (between Mars and Jupiter)
 * Kuiper belt: 30 - 50 AU (beyond Neptune)
 *
 * The center prop supports floating-origin rendering.
 */
function AsteroidBelt({
  innerRadius,
  outerRadius,
  center = [0, 0, 0] as [number, number, number],
  count = 2000,
  color = '#888888',
  opacity = 0.6,
  pointSize = 0.01,
}: {
  innerRadius: number;
  outerRadius: number;
  center?: [number, number, number];
  count?: number;
  color?: string;
  opacity?: number;
  pointSize?: number;
}) {
  const points = useMemo(() => {
    const positions: number[] = [];
    for (let i = 0; i < count; i++) {
      // Random radius between inner and outer
      const r = innerRadius + Math.random() * (outerRadius - innerRadius);
      // Random angle around the sun
      const theta = Math.random() * Math.PI * 2;
      // Small vertical spread (asteroid belt has ~20 deg inclination spread)
      const y = (Math.random() - 0.5) * 0.3 * (r / outerRadius);

      positions.push(
        center[0] + r * Math.cos(theta),
        center[1] + y,
        center[2] + r * Math.sin(theta)
      );
    }
    return new Float32Array(positions);
  }, [innerRadius, outerRadius, count, center]);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[points, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={pointSize}
        transparent
        opacity={opacity}
        sizeAttenuation
      />
    </points>
  );
}

// formatLightTime is now imported from @worldline-kinematics/ui

/**
 * Saturn's rings wrapper that uses the fidelity-aware SaturnRings component.
 * In Standard mode: Simple combined ring.
 * In Cinematic mode: Multiple ring components (D, C, B, Cassini Division, A, F)
 *                    with physically accurate dimensions from PDS data.
 *
 * When orientation data (northPole + rotationAngleDeg) is provided, the rings
 * are oriented using the same quaternion as Saturn's body, ensuring coplanarity.
 */
function SaturnRingsWrapper({
  planetSize,
  planetPosition,
  sunPosition = [0, 0, 0],
  northPole,
  rotationAngleDeg,
}: {
  planetSize: number;
  planetPosition: [number, number, number];
  sunPosition?: [number, number, number];
  northPole?: [number, number, number];
  rotationAngleDeg?: number;
}) {
  // Compute quaternion if orientation data is available
  const quaternion = northPole
    ? computeBodyQuaternion(northPole, rotationAngleDeg ?? 0, 0)
    : undefined;

  return (
    <FidelitySaturnRings
      saturnRadius={planetSize}
      position={planetPosition}
      sunPosition={sunPosition}
      applyTilt={!quaternion}
      quaternion={quaternion}
    />
  );
}

/**
 * Planet wrapper that uses the cinematic Planet component from the scene package.
 * Adds additional UI overlays for orbital speed and distance information.
 * Now includes accurate IAU rotation model orientation data.
 */
function Planet({
  position,
  name,
  color,
  size,
  sunPosition = [0, 0, 0],
  showLabel = true,
  highlight = false,
  showSpeed = false,
  showDistance = false,
  showRotationAxis = false,
  onClick,
}: {
  position: PlanetPosition;
  name: string;
  color: string;
  size: number;
  sunPosition?: [number, number, number];
  showLabel?: boolean;
  highlight?: boolean;
  showSpeed?: boolean;
  showDistance?: boolean;
  showRotationAxis?: boolean;
  onClick?: () => void;
}) {
  const content = useContent();
  const translatedName = content.planets[name as keyof typeof content.planets] || name;
  const orbitalSpeed = ORBITAL_VELOCITIES[name];

  // Format AU distance with appropriate precision
  const auDisplay =
    position.distanceAU < 10
      ? position.distanceAU.toFixed(3)
      : position.distanceAU.toFixed(2);

  return (
    <group>
      {/* Use the cinematic Planet component from scene package with accurate orientation */}
      <CinematicPlanet
        name={name}
        position={[position.x, position.y, position.z]}
        radius={size}
        color={color}
        sunPosition={sunPosition}
        showLabel={false} // We'll render our own label with extra info
        onClick={onClick}
        northPole={position.northPole}
        rotationAngleDeg={position.rotationAngleDeg}
        textureOffsetDeg={position.textureOffsetDeg}
        showRotationAxis={showRotationAxis && highlight} // Show axis on highlighted/selected planet when enabled
      />

      {/* Saturn rings - uses fidelity-aware component with body orientation */}
      {name === 'Saturn' && (
        <SaturnRingsWrapper
          planetSize={size}
          planetPosition={[position.x, position.y, position.z]}
          sunPosition={sunPosition}
          northPole={position.northPole}
          rotationAngleDeg={position.rotationAngleDeg}
        />
      )}

      {/* Custom label with orbital speed and distance info - clickable */}
      {showLabel && (
        <Html
          position={[position.x, position.y + size + 0.08, position.z]}
          center
          style={{ pointerEvents: 'auto' }}
        >
          <div
            className="flex flex-col items-center gap-0.5 cursor-pointer"
            onClick={onClick}
          >
            <div
              className={`text-[6px] sm:text-[8px] whitespace-nowrap hover:text-blue-300 transition-colors ${highlight ? 'text-blue-300 font-bold' : 'text-white/50'}`}
            >
              {translatedName}
            </div>
            {showSpeed && orbitalSpeed && (
              <div className="text-[5px] sm:text-[7px] text-orange-400/80 whitespace-nowrap">
                {orbitalSpeed.toFixed(1)} km/s
              </div>
            )}
            {showDistance && (
              <div className="flex flex-col items-center gap-0.5 mt-0.5">
                <div className="text-[5px] sm:text-[7px] text-cyan-400/80 whitespace-nowrap">
                  {auDisplay} {content.units.au}
                </div>
                <div className="text-[5px] sm:text-[6px] text-white/40 whitespace-nowrap">
                  {content.planetInfo.light}: {formatLightTime(position.distanceAU)}
                </div>
              </div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}

// Body quaternion computation is now imported from @worldline-kinematics/scene
// via computeBodyQuaternion - removes duplicate OBLIQUITY_J2000, EQJ_NORTH_SCENE

/**
 * Moon sphere with texture.
 * Uses proper orientation data for correct texture alignment.
 */
function Moon({
  position,
  earthPosition,
  size,
  onClick,
  highlight = false,
  showRotationAxis = false,
}: {
  position: MoonPosition;
  earthPosition: PlanetPosition;
  size: number;
  onClick?: () => void;
  highlight?: boolean;
  showRotationAxis?: boolean;
}) {
  const content = useContent();
  const moonTexture = useLoader(THREE.TextureLoader, '/textures/2k_moon.jpg');
  moonTexture.colorSpace = THREE.SRGBColorSpace;

  // Moon position is relative to Earth
  const absolutePos = {
    x: earthPosition.x + position.x,
    y: earthPosition.y + position.y,
    z: earthPosition.z + position.z,
  };

  // Compute orientation from ephemeris data or fallback to legacy tilt
  const { northDir, quaternion } = useMemo(() => {
    if (position.northPole) {
      const pole = new THREE.Vector3(
        position.northPole[0],
        position.northPole[1],
        position.northPole[2]
      );
      // Use computeBodyQuaternion from @worldline-kinematics/scene
      const qArr = computeBodyQuaternion(
        position.northPole,
        position.rotationAngleDeg ?? 0
      );
      return {
        northDir: pole.clone().normalize(),
        quaternion: new THREE.Quaternion(qArr[0], qArr[1], qArr[2], qArr[3]),
      };
    }

    // Fallback: legacy tilt (6.68 degrees)
    const moonTiltRadians = (6.68 * Math.PI) / 180;
    const fallbackNorth = new THREE.Vector3(
      0,
      Math.cos(moonTiltRadians),
      Math.sin(moonTiltRadians)
    ).normalize();
    return {
      northDir: fallbackNorth,
      quaternion: null,
    };
  }, [position.northPole, position.rotationAngleDeg]);

  const axisLength = size * 2.5;
  const northPos = northDir.clone().multiplyScalar(axisLength);
  const southPos = northDir.clone().multiplyScalar(-axisLength);

  return (
    <group position={[absolutePos.x, absolutePos.y, absolutePos.z]}>
      <group quaternion={quaternion ?? undefined}>
        <mesh
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
          <sphereGeometry args={[size, 32, 32]} />
          <meshStandardMaterial map={moonTexture} roughness={0.9} metalness={0} />
        </mesh>
      </group>

      {/* Rotation axis visualization */}
      {showRotationAxis && (
        <group>
          {/* Axis line */}
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

          {/* North pole marker */}
          <mesh
            position={[northPos.x, northPos.y, northPos.z]}
            quaternion={new THREE.Quaternion().setFromUnitVectors(
              new THREE.Vector3(0, 1, 0),
              northDir
            )}
          >
            <coneGeometry args={[size * 0.08, size * 0.2, 8]} />
            <meshBasicMaterial color="#4488ff" opacity={0.8} transparent />
          </mesh>

          {/* South pole marker */}
          <mesh position={[southPos.x, southPos.y, southPos.z]}>
            <sphereGeometry args={[size * 0.05, 8, 8]} />
            <meshBasicMaterial color="#ff8844" opacity={0.6} transparent />
          </mesh>

          {/* N label */}
          <Html
            position={[northPos.x * 1.15, northPos.y * 1.15, northPos.z * 1.15]}
            center
            style={{ pointerEvents: 'none' }}
          >
            <div className="text-[8px] text-blue-400/80 font-bold">N</div>
          </Html>
        </group>
      )}

      {/* Label - clickable */}
      <Html position={[0, size + 0.05, 0]} center style={{ pointerEvents: 'auto' }}>
        <div
          className={`text-[8px] whitespace-nowrap cursor-pointer hover:text-blue-300 transition-colors ${highlight ? 'text-blue-300 font-bold' : 'text-white/50'}`}
          onClick={onClick}
        >
          {content.planets.Moon}
        </div>
      </Html>
    </group>
  );
}

/**
 * Velocity trajectory arrow.
 */
function TrajectoryArrow({
  start,
  direction,
  length,
  color,
  label,
}: {
  start: THREE.Vector3;
  direction: THREE.Vector3;
  length: number;
  color: string;
  label?: string;
}) {
  const end = start.clone().add(direction.clone().normalize().multiplyScalar(length));

  return (
    <group>
      <Line points={[start, end]} color={color} lineWidth={2} />
      <mesh
        position={end}
        quaternion={new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          direction.clone().normalize()
        )}
      >
        <coneGeometry args={[0.03, 0.1, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>
      {label && (
        <Html
          position={
            end
              .clone()
              .add(direction.clone().normalize().multiplyScalar(0.3))
              .toArray() as [number, number, number]
          }
          center
          style={{ pointerEvents: 'none' }}
        >
          <div
            className="bg-black/80 px-2 py-1 rounded text-[10px] whitespace-nowrap border"
            style={{ color, borderColor: color }}
          >
            {label}
          </div>
        </Html>
      )}
    </group>
  );
}

/**
 * Galactic center visualization.
 */
function GalacticCenter({ position }: { position: [number, number, number] }) {
  const content = useContent();
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshBasicMaterial color="#fff8e0" />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshBasicMaterial color="#ffcc66" transparent opacity={0.3} />
      </mesh>
      <Html position={[0, 0.8, 0]} center style={{ pointerEvents: 'none' }}>
        <div className="text-[9px] text-amber-300/80 whitespace-nowrap">
          {content.scene.galacticCenter}
        </div>
      </Html>
    </group>
  );
}

/**
 * Speed display HUD.
 */
function SpeedHUD({
  speed,
  unit,
  label,
  color,
}: {
  speed: number;
  unit: string;
  label: string;
  color: string;
}) {
  return (
    <div
      className="absolute top-4 right-4 bg-black/70 backdrop-blur-sm px-2 py-1.5 sm:px-4 sm:py-3 rounded-lg border"
      style={{ borderColor: color }}
    >
      <div
        className="text-[7px] sm:text-[10px] uppercase tracking-wider mb-0.5 sm:mb-1"
        style={{ color }}
      >
        {label}
      </div>
      <div className="text-base sm:text-2xl font-bold text-white">
        {speed.toFixed(2)}{' '}
        <span className="text-[9px] sm:text-sm font-normal text-white/60">{unit}</span>
      </div>
    </div>
  );
}

/**
 * Orbit path that passes through the planet's actual position.
 *
 * Uses a direct geometric construction to guarantee the orbit passes through
 * the planet's position. The orbit is a circle centered on the Sun, with radius
 * equal to the Sun-planet distance, in a plane that contains both the Sun and planet.
 *
 * Construction:
 * 1. u1 = normalized direction from Sun to planet (radial)
 * 2. u2 = tangent direction perpendicular to u1, mostly in XZ plane
 * 3. Circle: Sun + r * (cos(θ) * u1 + sin(θ) * u2)
 *
 * At θ=0, this gives exactly the planet's position.
 */
function OrbitFromElements({
  planetName,
  planetPosition,
  sunPosition = [0, 0, 0],
  color = '#ffffff',
  opacity = 0.15,
  lineWidth = 1,
}: {
  planetName: string;
  /** Planet position in floating-origin coordinates */
  planetPosition: [number, number, number];
  sunPosition?: [number, number, number];
  color?: string;
  opacity?: number;
  lineWidth?: number;
}) {
  const el = ORBITAL_ELEMENTS[planetName];

  const points = useMemo(() => {
    // No orbital elements for this planet
    if (!el) return [];

    const pts: THREE.Vector3[] = [];

    // Planet position relative to Sun (in floating-origin coords)
    const P = new THREE.Vector3(
      planetPosition[0] - sunPosition[0],
      planetPosition[1] - sunPosition[1],
      planetPosition[2] - sunPosition[2]
    );

    // Orbit radius = distance from Sun to planet
    const r = P.length();
    if (r <= 0.0001) return pts;

    // u1 = radial direction (from Sun to planet)
    const u1 = P.clone().normalize();

    // u2 = tangent direction, perpendicular to u1
    // We want u2 to be mostly horizontal (in XZ plane) for visual stability
    // Use cross product with Y-up to get a horizontal tangent
    const up = new THREE.Vector3(0, 1, 0);
    let u2 = new THREE.Vector3().crossVectors(up, u1);

    // Handle case when planet is directly above/below Sun (u1 parallel to up)
    if (u2.lengthSq() < 0.0001) {
      u2 = new THREE.Vector3().crossVectors(new THREE.Vector3(1, 0, 0), u1);
    }
    u2.normalize();

    // u3 completes the orthonormal basis (normal to orbital plane)
    // const u3 = new THREE.Vector3().crossVectors(u1, u2);

    // Sun position offset
    const sunOffset = new THREE.Vector3(sunPosition[0], sunPosition[1], sunPosition[2]);

    // Draw circle: center + r * (cos(θ) * u1 + sin(θ) * u2)
    // At θ=0: center + r * u1 = center + P = planet position ✓
    for (let n = 0; n <= 256; n++) {
      const theta = (n / 256) * Math.PI * 2;
      const point = new THREE.Vector3()
        .addScaledVector(u1, Math.cos(theta) * r)
        .addScaledVector(u2, Math.sin(theta) * r)
        .add(sunOffset);
      pts.push(point);
    }
    return pts;
  }, [el, planetPosition, sunPosition]);

  if (points.length === 0) return null;
  return (
    <Line
      points={points}
      color={color}
      lineWidth={lineWidth}
      opacity={opacity}
      transparent
    />
  );
}

/**
 * Motion trail behind a planet showing orbital direction.
 * Creates a fading trail of small spheres behind the planet.
 * Uses the same geometric construction as OrbitFromElements.
 */
function MotionTrail({
  planet,
  sunPosition,
  color,
  trailLength = 8,
}: {
  planet: PlanetPosition;
  sunPosition: [number, number, number];
  color: string;
  trailLength?: number;
}) {
  const elements = ORBITAL_ELEMENTS[planet.name];

  // Trail points going backwards from planet position
  const trailPoints = useMemo(() => {
    if (!elements) return [];

    const points: { pos: THREE.Vector3; opacity: number; scale: number }[] = [];

    // Planet position relative to Sun (same as OrbitFromElements)
    const P = new THREE.Vector3(
      planet.x - sunPosition[0],
      planet.y - sunPosition[1],
      planet.z - sunPosition[2]
    );

    const r = P.length();
    if (r <= 0.0001) return points;

    // u1 = radial direction (from Sun to planet)
    const u1 = P.clone().normalize();

    // u2 = tangent direction, perpendicular to u1
    const up = new THREE.Vector3(0, 1, 0);
    let u2 = new THREE.Vector3().crossVectors(up, u1);
    if (u2.lengthSq() < 0.0001) {
      u2 = new THREE.Vector3().crossVectors(new THREE.Vector3(1, 0, 0), u1);
    }
    u2.normalize();

    // Sun position offset
    const sunOffset = new THREE.Vector3(sunPosition[0], sunPosition[1], sunPosition[2]);

    // At theta=0, we're at the planet position
    // Trail goes backwards (negative theta for counterclockwise orbit when viewed from above)
    for (let i = 1; i <= trailLength; i++) {
      const theta = -(i * 0.08); // Small steps backward
      const trailPos = new THREE.Vector3()
        .addScaledVector(u1, Math.cos(theta) * r)
        .addScaledVector(u2, Math.sin(theta) * r)
        .add(sunOffset);

      points.push({
        pos: trailPos,
        opacity: 0.6 - (i / trailLength) * 0.5,
        scale: 1 - (i / trailLength) * 0.6,
      });
    }
    return points;
  }, [planet.x, planet.y, planet.z, sunPosition, elements, trailLength]);

  if (!elements || trailPoints.length === 0) return null;

  return (
    <group>
      {trailPoints.map((point, idx) => (
        <mesh key={idx} position={point.pos} renderOrder={-10 - idx}>
          <sphereGeometry args={[planet.size * point.scale * 0.4, 8, 8]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={point.opacity}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Simple flat orbit for galaxy mode.
 */
function FlatOrbitPath({
  radius,
  color = '#ffffff',
  opacity = 0.15,
  lineWidth = 1,
}: {
  radius: number;
  color?: string;
  opacity?: number;
  lineWidth?: number;
}) {
  const points = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let n = 0; n <= 128; n++) {
      const angle = (n / 128) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
    }
    return pts;
  }, [radius]);

  return (
    <Line
      points={points}
      color={color}
      lineWidth={lineWidth}
      opacity={opacity}
      transparent
    />
  );
}

/**
 * Solar system with all planets.
 * showOrbits: show planet orbit lines and motion trails
 * showBelts: show asteroid and Kuiper belts
 * showDistances: show real AU distances and light travel time
 * date: the date for planet position calculations
 * preset: the render preset (replaces separate distance/size scales)
 * onPlanetClick: callback when a planet is clicked (for two-way binding)
 *
 * FLOATING-ORIGIN CENTERING:
 * The selected body is always centered at the origin. All other bodies are
 * offset relative to it. This provides camera stability when simulation time
 * changes - the camera target (origin) never moves, only the surrounding
 * bodies move around it.
 */
function SolarSystemWithOrbits({
  showOrbits = true,
  showTrails = true,
  showBelts = false,
  showDistances = false,
  showAxes = false,
  selectedPlanet = 'Earth',
  preset = 'schoolModel' as PresetName,
  date,
  onPlanetClick,
  showBirthMarker = false,
  birthLatitude = 0,
  birthLongitude = 0,
}: {
  showOrbits?: boolean;
  showTrails?: boolean;
  showBelts?: boolean;
  showDistances?: boolean;
  showAxes?: boolean;
  selectedPlanet?: string;
  preset?: PresetName;
  date: Date;
  onPlanetClick?: (name: string) => void;
  showBirthMarker?: boolean;
  birthLatitude?: number;
  birthLongitude?: number;
}) {
  const rawPlanets = useMemo(
    () => getPlanetPositionsWithPreset(date, preset),
    [date, preset]
  );
  const rawMoonPos = useMemo(
    () => getMoonPositionWithPreset(date, preset),
    [date, preset]
  );

  // Floating-origin: find the selected body's position and offset everything
  // Special handling for Moon - compute its absolute position from Earth + Moon offset
  const rawEarth = rawPlanets.find((p) => p.name === 'Earth');
  const centerOffset = useMemo(() => {
    if (selectedPlanet === 'Moon' && rawEarth) {
      // Moon's absolute position = Earth position + Moon's relative position
      return {
        x: rawEarth.x + rawMoonPos.x,
        y: rawEarth.y + rawMoonPos.y,
        z: rawEarth.z + rawMoonPos.z,
      };
    }
    const centerBody =
      rawPlanets.find((p) => p.name === selectedPlanet) ||
      rawPlanets.find((p) => p.name === 'Sun');
    return centerBody
      ? { x: centerBody.x, y: centerBody.y, z: centerBody.z }
      : { x: 0, y: 0, z: 0 };
  }, [selectedPlanet, rawPlanets, rawMoonPos, rawEarth]);

  // Apply floating-origin offset to all planets
  const planets = useMemo(() => {
    return rawPlanets.map((p) => ({
      ...p,
      x: p.x - centerOffset.x,
      y: p.y - centerOffset.y,
      z: p.z - centerOffset.z,
    }));
  }, [rawPlanets, centerOffset.x, centerOffset.y, centerOffset.z]);

  const earthPos = planets.find((p) => p.name === 'Earth')!;

  // Moon position is relative to Earth, so we need to adjust for floating origin
  const moonPos = useMemo(() => {
    return rawMoonPos; // Moon position is already relative to Earth, no need to offset
  }, [rawMoonPos]);

  // Get Sun data from the floating-origin-adjusted planets array
  const sunData = planets.find((p) => p.name === 'Sun');
  const sunSize = sunData?.size || 0.25;
  // Sun position in floating-origin coordinates (0,0,0 when Sun is selected, otherwise offset)
  const sunPos: [number, number, number] = sunData
    ? [sunData.x, sunData.y, sunData.z]
    : [0, 0, 0];

  // Get the mapping for belt calculations
  const mapping = RENDER_PRESETS[preset];
  const isLogScale = mapping.distanceScale.kind === 'log10';

  // Calculate asteroid belt radii based on preset's distance scale
  const beltRadii = useMemo(() => {
    const { distanceScale } = mapping;
    const scaleAu = (au: number) => {
      if (distanceScale.kind === 'linear') {
        return au * distanceScale.auToScene;
      } else if (distanceScale.kind === 'log10') {
        return Math.log10(1 + au * distanceScale.scale) * distanceScale.multiplier;
      } else if (distanceScale.kind === 'piecewise') {
        if (au <= distanceScale.innerRadiusAu) {
          return au * distanceScale.innerScale;
        }
        const innerScaled = distanceScale.innerRadiusAu * distanceScale.innerScale;
        const outerPart = au - distanceScale.innerRadiusAu;
        return (
          innerScaled +
          Math.log10(1 + outerPart * distanceScale.outerLogScale) *
            distanceScale.outerMultiplier
        );
      }
      return au * 3;
    };
    return {
      mainBeltInner: scaleAu(2.06),
      mainBeltOuter: scaleAu(3.27),
      kuiperBeltInner: scaleAu(30),
      kuiperBeltOuter: scaleAu(50),
    };
  }, [mapping]);

  return (
    <>
      {/* Point light at Sun position for realistic day/night illumination */}
      <pointLight position={sunPos} intensity={2} decay={0} />

      {/* Sun positioned using floating-origin coordinates */}
      <Sun
        size={sunSize}
        position={sunPos}
        onClick={() => onPlanetClick?.('Sun')}
        highlight={selectedPlanet === 'Sun'}
        showLabel={true}
      />

      {/* Main Asteroid Belt (between Mars and Jupiter) - centered on Sun */}
      {showBelts && (
        <AsteroidBelt
          innerRadius={beltRadii.mainBeltInner}
          outerRadius={beltRadii.mainBeltOuter}
          center={sunPos}
          count={3000}
          color="#8B7355"
          opacity={0.5}
          pointSize={0.008}
        />
      )}

      {/* Kuiper Belt (beyond Neptune) - centered on Sun, only visible for presets with log/piecewise scale */}
      {showBelts && (isLogScale || mapping.distanceScale.kind === 'piecewise') && (
        <AsteroidBelt
          innerRadius={beltRadii.kuiperBeltInner}
          outerRadius={beltRadii.kuiperBeltOuter}
          center={sunPos}
          count={2000}
          color="#6B8E9F"
          opacity={0.3}
          pointSize={0.012}
        />
      )}

      {/* Planet orbit paths - only when showOrbits is true (filter out Sun) */}
      {/* Orbits derived from planet's actual position to ensure planet is on the line */}
      {/* Orbits are centered on the Sun's floating-origin position */}
      {showOrbits &&
        planets
          .filter((p) => p.name !== 'Sun')
          .map((planet) => {
            const elements = ORBITAL_ELEMENTS[planet.name];
            const isEarth = planet.name === 'Earth';
            // Thinner lines in Scholar mode where orbits are compressed
            const isScholar = preset === 'schoolModel';
            const baseLineWidth = isScholar ? 0.5 : 1;
            const earthLineWidth = isScholar ? 0.8 : 1.5;
            const baseOpacity = isScholar ? 0.12 : 0.2;
            const earthOpacity = isScholar ? 0.35 : 0.5;
            return (
              <OrbitFromElements
                key={`orbit-${planet.name}`}
                planetName={planet.name}
                planetPosition={[planet.x, planet.y, planet.z]}
                sunPosition={sunPos}
                color={isEarth ? '#4488cc' : elements?.color || planet.color}
                opacity={isEarth ? earthOpacity : baseOpacity}
                lineWidth={isEarth ? earthLineWidth : baseLineWidth}
              />
            );
          })}

      {/* Motion trails - only when showOrbits and showTrails are true (filter out Sun) */}
      {showOrbits &&
        showTrails &&
        planets
          .filter((p) => p.name !== 'Sun')
          .map((planet) => {
            const elements = ORBITAL_ELEMENTS[planet.name];
            return (
              <MotionTrail
                key={`trail-${planet.name}`}
                planet={planet}
                sunPosition={sunPos}
                color={elements?.color || planet.color}
                trailLength={planet.name === 'Earth' ? 12 : 8}
              />
            );
          })}

      {/* Moon orbit - only when showOrbits is true */}
      {showOrbits &&
        (() => {
          // Moon's distance from Earth
          const moonDist = Math.sqrt(
            moonPos.x * moonPos.x + moonPos.y * moonPos.y + moonPos.z * moonPos.z
          );
          if (moonDist < 0.001) return null;

          // Moon's angle in XZ plane relative to Earth
          const moonAngleXZ = Math.atan2(moonPos.z, moonPos.x);
          // Derive inclination from Moon's actual Y position
          const sinI = Math.abs(moonPos.y) < 0.0001 ? 0 : moonPos.y / moonDist;
          const cosI = Math.sqrt(1 - sinI * sinI);
          // Ascending node 90 degrees behind Moon
          const omega = moonAngleXZ - Math.PI / 2;
          const cosO = Math.cos(omega);
          const sinO = Math.sin(omega);

          const orbitPoints = Array.from({ length: 65 }, (_, i) => {
            const u = (i / 64) * Math.PI * 2;
            const cosU = Math.cos(u);
            const sinU = Math.sin(u);
            return new THREE.Vector3(
              moonDist * (cosO * cosU - sinO * cosI * sinU),
              moonDist * sinI * sinU,
              moonDist * (sinO * cosU + cosO * cosI * sinU)
            );
          });

          // Thinner Moon orbit in Scholar mode
          const moonLineWidth = preset === 'schoolModel' ? 0.3 : 0.5;
          const moonOpacity = preset === 'schoolModel' ? 0.15 : 0.25;
          return (
            <group position={[earthPos.x, earthPos.y, earthPos.z]}>
              {/* Moon orbit line */}
              <Line
                points={orbitPoints}
                color="#aaaaaa"
                lineWidth={moonLineWidth}
                opacity={moonOpacity}
                transparent
              />
            </group>
          );
        })()}

      {/* Planets */}
      {/* Planets (filter out Sun since it's rendered separately) */}
      {planets
        .filter((p) => p.name !== 'Sun')
        .map((planet) => (
          <Planet
            key={planet.name}
            position={planet}
            name={planet.name}
            color={planet.color}
            size={planet.size}
            sunPosition={sunPos}
            showLabel={true}
            highlight={planet.name === selectedPlanet}
            showSpeed={showOrbits}
            showDistance={showDistances}
            showRotationAxis={showAxes}
            onClick={() => onPlanetClick?.(planet.name)}
          />
        ))}

      {/* Moon */}
      <Moon
        position={moonPos}
        earthPosition={earthPos}
        size={moonPos.size}
        onClick={() => onPlanetClick?.('Moon')}
        highlight={selectedPlanet === 'Moon'}
        showRotationAxis={showAxes && selectedPlanet === 'Moon'}
      />

      {/* Birth location marker on Earth - only when Earth is selected and marker is enabled */}
      {showBirthMarker && selectedPlanet === 'Earth' && earthPos.northPole && (
        <group
          position={[earthPos.x, earthPos.y, earthPos.z]}
          quaternion={computeBodyQuaternion(
            earthPos.northPole,
            earthPos.rotationAngleDeg ?? 0,
            earthPos.textureOffsetDeg ?? 0
          )}
        >
          <UserMarker
            latitude={birthLatitude}
            longitude={birthLongitude}
            earthRadius={earthPos.size}
            pillarHeight={earthPos.size * 0.3}
          />
        </group>
      )}

      {/* Debug display - subsolar longitude diagnostic (requires NEXT_PUBLIC_DEBUG=true) */}
      {process.env.NEXT_PUBLIC_DEBUG === 'true' && selectedPlanet === 'Earth' && (
        <Html position={[0, -earthPos.size * 2.5, 0]} center>
          <div className="bg-black/80 text-white text-xs p-2 rounded font-mono whitespace-nowrap">
            <div>UTC: {date.toISOString().slice(0, 19)}Z</div>
            <div>
              Expected subsolar lon: {computeExpectedSubsolarLongitude(date).toFixed(1)}°
            </div>
            <div>
              Earth W (rotation): {earthPos.rotationAngleDeg?.toFixed(1) ?? 'N/A'}°
            </div>
            <div>
              Sun pos: [{sunPos[0].toFixed(2)}, {sunPos[1].toFixed(2)},{' '}
              {sunPos[2].toFixed(2)}]
            </div>
          </div>
        </Html>
      )}
    </>
  );
}

/**
 * Monitors WebGL context loss/restoration events for debugging.
 * Logs events to console to help diagnose GPU memory issues.
 */
function WebGLContextMonitor() {
  const { gl } = useThree();

  useEffect(() => {
    const canvas = gl.domElement;

    const onLost = (e: Event) => {
      e.preventDefault();
      // WebGL context loss is a critical error worth logging
      // eslint-disable-next-line no-console
      console.error('[WebGL] Context lost - GPU memory pressure or driver issue');
    };

    const onRestored = () => {
      // eslint-disable-next-line no-console
      console.warn('[WebGL] Context restored');
    };

    canvas.addEventListener('webglcontextlost', onLost);
    canvas.addEventListener('webglcontextrestored', onRestored);

    return () => {
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
    };
  }, [gl]);

  return null;
}

/**
 * Dynamic camera clipping controller.
 * Updates near/far planes based on target body radius to prevent clipping issues.
 */
function CameraClipController({ near, far }: { near: number; far: number }) {
  const { camera } = useThree();

  useEffect(() => {
    if ('near' in camera && 'far' in camera) {
      const perspCam = camera as THREE.PerspectiveCamera;
      perspCam.near = near;
      perspCam.far = far;
      perspCam.updateProjectionMatrix();
    }
  }, [camera, near, far]);

  return null;
}

/**
 * Animated camera with cinematic "star flight" transitions.
 * Smooth acceleration and deceleration for immersive travel effect.
 */
function AnimatedCamera({
  targetPosition,
  targetLookAt,
  fov,
}: {
  targetPosition: [number, number, number];
  targetLookAt: [number, number, number];
  fov: number;
}) {
  const { camera } = useThree();
  const animationProgress = useRef(1); // 0 = start, 1 = complete
  const startPosition = useRef(new THREE.Vector3());
  const startLookAt = useRef(new THREE.Vector3(...targetLookAt));
  const currentLookAt = useRef(new THREE.Vector3(...targetLookAt));
  const startFov = useRef(fov);
  const prevTarget = useRef({ position: targetPosition, lookAt: targetLookAt });
  const isInitialized = useRef(false);
  // Reusable vectors to avoid per-frame allocation
  const targetPosVec = useRef(new THREE.Vector3());
  const targetLookVec = useRef(new THREE.Vector3());

  // Set initial camera position on mount
  if (!isInitialized.current) {
    camera.position.set(...targetPosition);
    camera.lookAt(...targetLookAt);
    if ('fov' in camera) {
      const perspCam = camera as THREE.PerspectiveCamera;
      perspCam.fov = fov;
      perspCam.updateProjectionMatrix();
    }
    currentLookAt.current.set(...targetLookAt);
    isInitialized.current = true;
  }

  // Detect when target changes - start new animation
  if (
    prevTarget.current.position[0] !== targetPosition[0] ||
    prevTarget.current.position[1] !== targetPosition[1] ||
    prevTarget.current.position[2] !== targetPosition[2] ||
    prevTarget.current.lookAt[0] !== targetLookAt[0] ||
    prevTarget.current.lookAt[1] !== targetLookAt[1] ||
    prevTarget.current.lookAt[2] !== targetLookAt[2]
  ) {
    // Capture current state as start
    startPosition.current.copy(camera.position);
    startLookAt.current.copy(currentLookAt.current);
    if ('fov' in camera) {
      startFov.current = (camera as THREE.PerspectiveCamera).fov;
    }
    animationProgress.current = 0;
    prevTarget.current = { position: targetPosition, lookAt: targetLookAt };
  }

  useFrame((_, delta) => {
    // When animation is complete, let OrbitControls handle camera
    if (animationProgress.current >= 1) {
      return;
    }

    // Mutate reusable vectors instead of allocating new ones per frame
    targetPosVec.current.set(targetPosition[0], targetPosition[1], targetPosition[2]);
    targetLookVec.current.set(targetLookAt[0], targetLookAt[1], targetLookAt[2]);

    // FTL speed: fast warp between planets
    animationProgress.current = Math.min(1, animationProgress.current + delta * 2.5);
    const t = animationProgress.current;
    // Quintic ease-in-out for dramatic FTL warp effect
    const eased = t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2;

    // Interpolate position
    camera.position.lerpVectors(startPosition.current, targetPosVec.current, eased);

    // Interpolate lookAt
    currentLookAt.current.lerpVectors(startLookAt.current, targetLookVec.current, eased);
    camera.lookAt(currentLookAt.current);

    // Interpolate FOV
    if ('fov' in camera) {
      const perspCam = camera as THREE.PerspectiveCamera;
      perspCam.fov = startFov.current + (fov - startFov.current) * eased;
      perspCam.updateProjectionMatrix();
    }

    // Snap to final position when complete
    if (animationProgress.current >= 1) {
      camera.position.copy(targetPosVec.current);
      currentLookAt.current.copy(targetLookVec.current);
    }
  });

  return null;
}

/**
 * Scene options panel with preset selector.
 * Uses presets instead of independent distance/size toggles to prevent
 * mathematically impossible scale combinations.
 */
function SceneOptionsPanel({
  preset,
  onPresetChange,
  showOrbits,
  onShowOrbitsChange,
  showTrails,
  onShowTrailsChange,
  showDistances,
  onShowDistancesChange,
  showBelts,
  onShowBeltsChange,
  showAxes,
  onShowAxesChange,
  showControls,
  onShowControlsChange,
  locale,
}: {
  preset: PresetName;
  onPresetChange: (p: PresetName) => void;
  showOrbits: boolean;
  onShowOrbitsChange: (v: boolean) => void;
  showTrails: boolean;
  onShowTrailsChange: (v: boolean) => void;
  showDistances: boolean;
  onShowDistancesChange: (v: boolean) => void;
  showBelts: boolean;
  onShowBeltsChange: (v: boolean) => void;
  showAxes: boolean;
  onShowAxesChange: (v: boolean) => void;
  showControls: boolean;
  onShowControlsChange: (v: boolean) => void;
  locale?: string;
}) {
  const content = useContent();
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Auto-close on mobile after selection (better UX)
  const closeMobileMenu = () => {
    if (window.innerWidth < 640) {
      setIsCollapsed(true);
    }
  };

  // Close panel when clicking outside (mobile)
  useEffect(() => {
    if (isCollapsed) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsCollapsed(true);
      }
    };

    // Use setTimeout to prevent immediate close on the same click that opened it
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isCollapsed]);

  // Collapsed mobile view - just a settings button
  const MobileToggle = () => (
    <button
      onClick={() => setIsCollapsed(!isCollapsed)}
      className="sm:hidden bg-black/70 backdrop-blur-sm rounded-lg border border-white/20 p-2.5 flex items-center gap-2"
      aria-label={content.cameraControls.toggleSettings}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="text-white/70"
      >
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
      <span className="text-xs text-white/70">{content.scene.settings}</span>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className={`text-white/50 transition-transform ${isCollapsed ? '' : 'rotate-180'}`}
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </button>
  );

  return (
    <div
      ref={panelRef}
      className="absolute top-16 sm:top-20 left-4 flex flex-col gap-2 z-30 max-w-[50vw] sm:max-w-none"
    >
      {/* Mobile: collapsible toggle */}
      <MobileToggle />

      {/* Desktop: always visible, Mobile: collapsible */}
      <div
        className={`flex flex-col gap-2 ${isCollapsed ? 'hidden sm:flex' : 'flex'} sm:max-h-none max-h-[55vh] overflow-y-auto`}
      >
        {/* Preset selector */}
        <div className="bg-black/70 backdrop-blur-sm rounded-lg border border-white/20 p-2">
          <div className="flex items-center justify-between mb-1.5 px-1">
            <span className="text-[9px] text-white/40 uppercase tracking-wider">
              {content.sceneOptions.visualMode}
            </span>
            <button
              onClick={() => setShowInfoModal(true)}
              className="w-4 h-4 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/50 hover:text-white transition-colors"
              aria-label={content.cameraControls.learnAboutModes}
              title={content.cameraControls.learnAboutModes}
            >
              <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
          <div className="flex flex-col gap-1">
            {VISIBLE_PRESETS.map((presetName) => {
              const info = PRESET_INFO[presetName];
              if (!info) return null;
              const presetTranslation =
                content.scene.presets?.[presetName as keyof typeof content.scene.presets];
              const label = presetTranslation?.label ?? info.label;
              const description = presetTranslation?.description ?? info.description;
              const note = presetTranslation?.note ?? info.note;
              const isSelected = preset === presetName;
              return (
                <button
                  key={presetName}
                  onClick={() => {
                    onPresetChange(presetName);
                    closeMobileMenu();
                  }}
                  className={`flex flex-col items-start px-2 py-1.5 rounded text-xs transition-colors w-full ${
                    isSelected
                      ? 'bg-white/10 border'
                      : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                  style={{
                    borderColor: isSelected ? info.color : 'transparent',
                    color: isSelected ? info.color : undefined,
                  }}
                  title={description}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                      style={{ borderColor: isSelected ? info.color : '#ffffff40' }}
                    >
                      {isSelected && (
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: info.color }}
                        />
                      )}
                    </span>
                    <span className="font-medium">{label}</span>
                  </div>
                  {isSelected && (
                    <div className="ml-5 mt-1 flex flex-col text-[10px] leading-snug">
                      <span className="text-white/50">{description}</span>
                      {note && <span className="text-white/40">{note}</span>}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Display options */}
        <div className="bg-black/70 backdrop-blur-sm rounded-lg border border-white/20 p-2">
          <div className="text-[9px] text-white/40 uppercase tracking-wider mb-1.5 px-1">
            {content.scene.display}
          </div>
          <div className="flex flex-col gap-1">
            {/* Orbit paths toggle */}
            <button
              onClick={() => {
                onShowOrbitsChange(!showOrbits);
                closeMobileMenu();
              }}
              className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors ${
                showOrbits
                  ? 'text-indigo-300'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              <span
                className="w-4 h-4 rounded border flex items-center justify-center"
                style={{ borderColor: showOrbits ? '#a5b4fc' : '#ffffff40' }}
              >
                {showOrbits && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </span>
              <span>{content.scene.orbitPaths}</span>
            </button>

            {/* Orbital trails toggle - sub-option of Orbit Paths */}
            {showOrbits && (
              <button
                onClick={() => {
                  onShowTrailsChange(!showTrails);
                  closeMobileMenu();
                }}
                className={`flex items-center gap-2 pl-6 pr-2 py-1 rounded text-xs transition-colors ${
                  showTrails
                    ? 'text-blue-300'
                    : 'text-white/50 hover:text-white hover:bg-white/10'
                }`}
              >
                <span
                  className="w-3.5 h-3.5 rounded border flex items-center justify-center"
                  style={{ borderColor: showTrails ? '#60a5fa' : '#ffffff30' }}
                >
                  {showTrails && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="8"
                      height="8"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </span>
                <span>{content.scene.orbitalTrails}</span>
              </button>
            )}

            {/* Distance labels toggle */}
            <button
              onClick={() => {
                onShowDistancesChange(!showDistances);
                closeMobileMenu();
              }}
              className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors ${
                showDistances
                  ? 'text-cyan-300'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
              title={content.cameraControls.showDistancesTitle}
            >
              <span
                className="w-4 h-4 rounded border flex items-center justify-center"
                style={{ borderColor: showDistances ? '#22d3ee' : '#ffffff40' }}
              >
                {showDistances && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </span>
              <span>{content.scene.distanceAU}</span>
            </button>

            {/* Asteroid belts toggle */}
            <button
              onClick={() => {
                onShowBeltsChange(!showBelts);
                closeMobileMenu();
              }}
              className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors ${
                showBelts
                  ? 'text-amber-300'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
              title={content.cameraControls.showBeltsTitle}
            >
              <span
                className="w-4 h-4 rounded border flex items-center justify-center"
                style={{ borderColor: showBelts ? '#fbbf24' : '#ffffff40' }}
              >
                {showBelts && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </span>
              <span>{content.scene.asteroidBelts}</span>
            </button>

            {/* Rotation axes toggle */}
            <button
              onClick={() => {
                onShowAxesChange(!showAxes);
                closeMobileMenu();
              }}
              className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors ${
                showAxes
                  ? 'text-purple-300'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
              title={content.cameraControls.showAxisTitle}
            >
              <span
                className="w-4 h-4 rounded border flex items-center justify-center"
                style={{ borderColor: showAxes ? '#a855f7' : '#ffffff40' }}
              >
                {showAxes && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </span>
              <span>{content.scene.rotationAxis}</span>
            </button>

            {/* Camera controls toggle */}
            <button
              onClick={() => {
                onShowControlsChange(!showControls);
                closeMobileMenu();
              }}
              className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors ${
                showControls
                  ? 'text-emerald-300'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
              title={content.cameraControls.showControlsTitle}
            >
              <span
                className="w-4 h-4 rounded border flex items-center justify-center"
                style={{ borderColor: showControls ? '#6ee7b7' : '#ffffff40' }}
              >
                {showControls && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </span>
              <span>{content.scene.cameraControls}</span>
            </button>
          </div>
        </div>

        {/* Exploration hint - mobile only */}
        <div className="sm:hidden bg-blue-500/10 backdrop-blur-sm rounded-lg border border-blue-500/30 p-2">
          <div className="text-[9px] text-blue-300 flex items-center gap-1.5">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
              <path d="M11 8v6" />
              <path d="M8 11h6" />
            </svg>
            {content.scene.pinchToZoom}
          </div>
        </div>
      </div>

      {/* Visual Mode Info Modal */}
      <VisualModeInfoModal
        isOpen={showInfoModal}
        onClose={() => setShowInfoModal(false)}
        locale={locale}
      />
    </div>
  );
}

/**
 * Spin mode: Same as Orbit mode but without orbit lines.
 * Shows all planets with their positions, just no orbital paths.
 */
function SpinModeView({
  showOrbits,
  showTrails,
  showBelts,
  showDistances,
  showAxes,
  selectedPlanet,
  preset,
  date,
  onPlanetClick,
  showBirthMarker = false,
  birthLatitude = 0,
  birthLongitude = 0,
}: {
  showOrbits: boolean;
  showTrails: boolean;
  showBelts: boolean;
  showDistances: boolean;
  showAxes: boolean;
  selectedPlanet: string;
  preset: PresetName;
  date: Date;
  onPlanetClick?: (name: string) => void;
  showBirthMarker?: boolean;
  birthLatitude?: number;
  birthLongitude?: number;
}) {
  // Reuse solar system with configurable orbit lines
  return (
    <SolarSystemWithOrbits
      showOrbits={showOrbits}
      showTrails={showTrails}
      showBelts={showBelts}
      showDistances={showDistances}
      showAxes={showAxes}
      selectedPlanet={selectedPlanet}
      preset={preset}
      date={date}
      onPlanetClick={onPlanetClick}
      showBirthMarker={showBirthMarker}
      birthLatitude={birthLatitude}
      birthLongitude={birthLongitude}
    />
  );
}

/**
 * CMB mode view.
 */
function CMBModeView({ latitude, longitude }: { latitude: number; longitude: number }) {
  const content = useContent();
  const cmbDirection = useMemo(() => {
    const l = (264 * Math.PI) / 180;
    const b = (48 * Math.PI) / 180;
    return new THREE.Vector3(
      Math.cos(b) * Math.cos(l),
      Math.sin(b),
      Math.cos(b) * Math.sin(l)
    ).normalize();
  }, []);

  return (
    <>
      <directionalLight position={[5, 3, 5]} intensity={1.5} />
      <Earth rotationSpeedMultiplier={20} showClouds={true} />
      <UserMarker latitude={latitude} longitude={longitude} />

      <TrajectoryArrow
        start={new THREE.Vector3(0, 0, 0)}
        direction={cmbDirection}
        length={1.8}
        color="#ff6b6b"
        label="369.82 km/s"
      />
      <Html
        position={
          cmbDirection.clone().multiplyScalar(2.3).toArray() as [number, number, number]
        }
        center
      >
        <div className="text-[8px] text-red-300/70 whitespace-nowrap">
          {content.scene.cmbRestFrame}
        </div>
      </Html>
    </>
  );
}

/**
 * Galaxy view with solar system orbiting galactic center.
 */
function GalaxyOverview() {
  return (
    <>
      <directionalLight position={[5, 3, 5]} intensity={1} />
      <GalacticCenter position={[-6, 0, 0]} />

      {/* Galactic orbit path */}
      <FlatOrbitPath radius={6} color="#cc88ff" opacity={0.3} lineWidth={1} />

      {/* Solar system at orbital position */}
      <group position={[6, 0, 0]}>
        <Sun size={0.4} />
        {/* Tiny Earth indicator */}
        <mesh position={[0.3, 0, 0]}>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshBasicMaterial color="#6b93d6" />
        </mesh>
      </group>

      <TrajectoryArrow
        start={new THREE.Vector3(6, 0.15, 0)}
        direction={new THREE.Vector3(0, 0, 1)}
        length={0.8}
        color="#cc88ff"
        label="220 km/s"
      />

      <Line
        points={[new THREE.Vector3(6, 0, 0), new THREE.Vector3(-5.5, 0, 0)]}
        color="#cc88ff"
        lineWidth={0.5}
        opacity={0.2}
        transparent
        dashed
        dashSize={0.15}
        gapSize={0.15}
      />
    </>
  );
}

/**
 * Camera controls UI component - joystick style like Google Earth.
 */
function CameraControlsUI({
  cameraRef,
  visible,
  minDistance,
  maxDistance,
  content,
}: {
  cameraRef: React.MutableRefObject<THREE.Camera | null>;
  visible: boolean;
  minDistance: number;
  maxDistance: number;
  content: ReturnType<typeof getAppContent>;
}) {
  // Track active controls for continuous press
  const activeControls = useRef<Set<string>>(new Set());
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // Smooth animation speeds (per second)
  const zoomSpeed = 2.4; // 240% per second (3x faster)
  const rotateSpeed = Math.PI / 2; // 90 degrees per second

  // Animation loop for smooth continuous movement
  useEffect(() => {
    const animate = (time: number) => {
      const deltaTime = lastTimeRef.current ? (time - lastTimeRef.current) / 1000 : 0;
      lastTimeRef.current = time;

      const camera = cameraRef.current;
      if (camera && activeControls.current.size > 0) {
        const distance = camera.position.length();
        let theta = Math.atan2(camera.position.x, camera.position.z);
        let phi = Math.acos(Math.max(-1, Math.min(1, camera.position.y / distance)));
        let newDistance = distance;

        // Apply zoom
        if (activeControls.current.has('zoomIn')) {
          newDistance = distance * (1 - zoomSpeed * deltaTime);
        }
        if (activeControls.current.has('zoomOut')) {
          newDistance = distance * (1 + zoomSpeed * deltaTime);
        }
        newDistance = Math.max(minDistance, Math.min(maxDistance, newDistance));

        // Apply rotation
        if (activeControls.current.has('left')) {
          theta += rotateSpeed * deltaTime;
        }
        if (activeControls.current.has('right')) {
          theta -= rotateSpeed * deltaTime;
        }
        if (activeControls.current.has('up')) {
          phi = Math.max(0.1, phi - rotateSpeed * deltaTime);
        }
        if (activeControls.current.has('down')) {
          phi = Math.min(Math.PI - 0.1, phi + rotateSpeed * deltaTime);
        }

        camera.position.set(
          newDistance * Math.sin(phi) * Math.sin(theta),
          newDistance * Math.cos(phi),
          newDistance * Math.sin(phi) * Math.cos(theta)
        );
        camera.lookAt(0, 0, 0);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [cameraRef, minDistance, maxDistance, zoomSpeed, rotateSpeed]);

  // Handlers for press and release
  const startControl = useCallback((control: string) => {
    activeControls.current.add(control);
  }, []);

  const stopControl = useCallback((control: string) => {
    activeControls.current.delete(control);
  }, []);

  const stopAllControls = useCallback(() => {
    activeControls.current.clear();
  }, []);

  // Create button props for continuous press support
  const createButtonProps = (control: string) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      startControl(control);
    },
    onPointerUp: () => stopControl(control),
    onPointerLeave: () => stopControl(control),
    onPointerCancel: () => stopControl(control),
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  });

  // Clean up on unmount or when hidden
  useEffect(() => {
    if (!visible) {
      stopAllControls();
    }
    return () => stopAllControls();
  }, [visible, stopAllControls]);

  if (!visible) {
    return null;
  }

  return (
    <div className="absolute bottom-[18px] sm:bottom-4 right-4 flex items-end gap-2 sm:gap-3">
      {/* Joystick - circular d-pad */}
      <div className="relative w-[72px] h-[72px] sm:w-24 sm:h-24">
        {/* Outer ring */}
        <div className="absolute inset-0 rounded-full bg-black/50 backdrop-blur-sm border border-white/20" />

        {/* Direction buttons */}
        <button
          {...createButtonProps('up')}
          className="absolute top-1 left-1/2 -translate-x-1/2 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white/10 hover:bg-white/25 active:bg-white/40 text-white/60 hover:text-white flex items-center justify-center transition-all touch-none select-none"
          aria-label={content.cameraControls.tiltUp}
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          >
            <path d="M18 15l-6-6-6 6" />
          </svg>
        </button>
        <button
          {...createButtonProps('down')}
          className="absolute bottom-1 left-1/2 -translate-x-1/2 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white/10 hover:bg-white/25 active:bg-white/40 text-white/60 hover:text-white flex items-center justify-center transition-all touch-none select-none"
          aria-label={content.cameraControls.tiltDown}
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
        <button
          {...createButtonProps('left')}
          className="absolute left-1 top-1/2 -translate-y-1/2 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white/10 hover:bg-white/25 active:bg-white/40 text-white/60 hover:text-white flex items-center justify-center transition-all touch-none select-none"
          aria-label={content.cameraControls.rotateLeft}
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <button
          {...createButtonProps('right')}
          className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white/10 hover:bg-white/25 active:bg-white/40 text-white/60 hover:text-white flex items-center justify-center transition-all touch-none select-none"
          aria-label={content.cameraControls.rotateRight}
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>

        {/* Center space - kept for visual balance */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-white/5 border border-white/10" />
      </div>

      {/* Zoom slider - vertical */}
      <div className="flex flex-col items-center gap-1 bg-black/50 backdrop-blur-sm rounded-full py-2 px-1 border border-white/20">
        <button
          {...createButtonProps('zoomIn')}
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/10 hover:bg-white/25 active:bg-white/40 text-white/60 hover:text-white flex items-center justify-center transition-all touch-none select-none"
          aria-label={content.cameraControls.zoomIn}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
        <div className="w-px h-6 sm:h-8 bg-white/20" />
        <button
          {...createButtonProps('zoomOut')}
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/10 hover:bg-white/25 active:bg-white/40 text-white/60 hover:text-white flex items-center justify-center transition-all touch-none select-none"
          aria-label={content.cameraControls.zoomOut}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path d="M5 12h14" />
          </svg>
        </button>
      </div>
    </div>
  );
}

/**
 * Camera bridge - captures camera ref from inside Canvas.
 */
function CameraBridge({
  cameraRef,
}: {
  cameraRef: React.MutableRefObject<THREE.Camera | null>;
}) {
  const { camera } = useThree();
  useEffect(() => {
    cameraRef.current = camera;
  }, [camera, cameraRef]);
  return null;
}

/**
 * Canvas bridge - exposes the canvas element for screenshot capture.
 */
function CanvasBridge({
  onCanvasReady,
}: {
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
}) {
  const { gl } = useThree();
  useEffect(() => {
    if (onCanvasReady && gl.domElement) {
      onCanvasReady(gl.domElement);
    }
  }, [gl, onCanvasReady]);
  return null;
}

// ---------------------------------------------------------------------------
// Camera Distance System
// ---------------------------------------------------------------------------
// Uses FOV geometry instead of arbitrary multipliers. Given a target screen
// coverage (e.g., 35%), we compute the exact distance where the body's angular
// size matches that fraction. Scales to any body without manual tuning.
// ---------------------------------------------------------------------------

const CAMERA_FOV_DEGREES = 50; // Must match Canvas fov

/**
 * Target screen coverage by preset.
 * Higher value = body appears larger on screen.
 */
const SCREEN_COVERAGE_BY_PRESET: Record<PresetName, number> = {
  schoolModel: 0.55, // 55% - planet fills good portion of screen
  trueSizes: 0.55, // 55% - planet fills good portion of screen
  truePhysical: 0.12, // 12% - zoomed out to show sun at horizon
  planetRatio: 0.55, // Same as school model
  explorer: 0.45, // Slightly smaller for exploration
  massComparison: 0.55, // Same as school model
};

/**
 * Per-body coverage adjustment factor.
 * Values > 1 push camera farther (show more context).
 * Values < 1 bring camera closer (more detail).
 */
const BODY_COVERAGE_ADJUSTMENT: Record<string, number> = {
  Sun: 0.7, // Closer to fill screen nicely
  Saturn: 1.4, // Farther to show rings
  Moon: 1.3, // Show Earth context
  Jupiter: 1.1, // Slight adjustment for size
  Uranus: 1.1, // Has rings too
  Neptune: 1.0,
  Mercury: 0.9, // Closer for small bodies
  Venus: 1.0,
  Earth: 1.0,
  Mars: 0.9, // Closer for small bodies
};

/**
 * Calculate camera distance using FOV-based formula.
 * Ensures consistent screen coverage regardless of body size.
 *
 * @param bodyRadius - Radius of the celestial body in scene units
 * @param fovDegrees - Camera field of view in degrees
 * @param targetFraction - Desired fraction of screen height (0-1)
 * @returns Camera distance in scene units
 */
function calculateCameraDistance(
  bodyRadius: number,
  fovDegrees: number,
  targetFraction: number
): number {
  const fovRadians = (fovDegrees * Math.PI) / 180;
  // Half angle for the target screen coverage
  const halfAngle = (fovRadians * targetFraction) / 2;
  // Distance where body's angular size equals target fraction
  const distance = bodyRadius / Math.tan(halfAngle);
  return Math.max(distance, 0.001);
}

/**
 * Get optimal camera distance for a body in a given preset.
 * Uses mathematical formula for consistent screen coverage.
 */
function getOptimalCameraDistance(
  bodyRadius: number,
  bodyName: string,
  preset: PresetName
): number {
  const baseCoverage = SCREEN_COVERAGE_BY_PRESET[preset] || 0.35;
  let adjustment = BODY_COVERAGE_ADJUSTMENT[bodyName] || 1.0;

  // Mobile-specific adjustments for certain bodies in Scholar/True Sizes presets
  // These bodies benefit from being zoomed out more on small screens
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
  if (isMobile && (preset === 'schoolModel' || preset === 'trueSizes')) {
    if (bodyName === 'Sun') {
      adjustment *= 2.0; // Zoom out 2x more for Sun
    } else if (bodyName === 'Saturn') {
      adjustment *= 1.8; // Zoom out more for Saturn to see rings
    }
  }

  // Lower coverage = camera closer, so we divide by adjustment
  const effectiveCoverage = baseCoverage / adjustment;

  return calculateCameraDistance(bodyRadius, CAMERA_FOV_DEGREES, effectiveCoverage);
}

/**
 * Main scene content.
 */
function SceneContent({
  mode,
  latitude,
  longitude,
  showBirthMarker,
  selectedPlanet,
  onPlanetSelect,
  preset,
  showOrbits,
  showTrails,
  showDistances,
  showBelts,
  showAxes,
  date,
}: SceneProps & {
  selectedPlanet: SelectedBody;
  onPlanetSelect: (name: SelectedBody) => void;
  preset: PresetName;
  showOrbits: boolean;
  showTrails: boolean;
  showDistances: boolean;
  showBelts: boolean;
  showAxes: boolean;
  date: Date;
}) {
  // Get planet data for radius and Sun direction calculation
  const { targetBodyRadius, sunDirection } = useMemo(() => {
    const planets = getPlanetPositionsWithPreset(date, preset);
    const moon = getMoonPositionWithPreset(date, preset);
    const earth = planets.find((p) => p.name === 'Earth');
    const sun = planets.find((p) => p.name === 'Sun');

    // Handle Moon selection
    if (selectedPlanet === 'Moon') {
      // Moon's absolute position = Earth + Moon offset
      const moonAbsX = (earth?.x || 0) + moon.x;
      const moonAbsY = (earth?.y || 0) + moon.y;
      const moonAbsZ = (earth?.z || 0) + moon.z;

      // Direction from Moon to Sun
      let sunDir: [number, number, number] = [1, 0, 0];
      if (sun) {
        const dx = sun.x - moonAbsX;
        const dy = sun.y - moonAbsY;
        const dz = sun.z - moonAbsZ;
        const mag = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (mag > 0.001) {
          sunDir = [dx / mag, dy / mag, dz / mag];
        }
      }

      return {
        targetBodyRadius: moon.size,
        sunDirection: sunDir,
      };
    }

    const target = planets.find((p) => p.name === selectedPlanet);

    // Compute direction from selected planet to Sun
    // sunDirection points FROM planet TO Sun (used to position camera opposite Sun)
    let sunDir: [number, number, number] = [1, 0, 0]; // default direction
    if (sun && target && selectedPlanet !== 'Sun') {
      // getPlanetPositionsWithPreset returns absolute positions (Sun typically near origin)
      // Direction from target to Sun:
      const dx = sun.x - target.x;
      const dy = sun.y - target.y;
      const dz = sun.z - target.z;
      const mag = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (mag > 0.001) {
        sunDir = [dx / mag, dy / mag, dz / mag];
      }
    }

    return {
      targetBodyRadius: target?.size || 0.25,
      sunDirection: sunDir,
    };
  }, [selectedPlanet, preset, date]);

  // Handler for planet click (two-way binding)
  const handlePlanetClick = useCallback(
    (name: string) => {
      if (BODY_ORDER.includes(name as SelectedBody)) {
        onPlanetSelect(name as SelectedBody);
      }
    },
    [onPlanetSelect]
  );

  // Semantic camera zoom: camera distance in "target radii" units
  // This provides consistent UX whether looking at Jupiter or Mercury
  //
  // FLOATING-ORIGIN: The selected body is always at the origin (0,0,0).
  // Camera position is computed relative to origin, providing stable camera
  // behavior as simulation time changes.
  const cameraConfig = useMemo(() => {
    // Spin and Orbit modes: view centered on selected body (at origin due to floating-origin)
    if (mode === 'spin' || mode === 'orbit') {
      // Use mathematical formula for consistent screen coverage
      const camDist = getOptimalCameraDistance(targetBodyRadius, selectedPlanet, preset);

      // True Scale: camera behind planet, looking toward sun
      // Zoomed out so sun is visible at horizon, planet centered
      if (preset === 'truePhysical' && selectedPlanet !== 'Sun') {
        const [sx, _sy, sz] = sunDirection;
        return {
          position: [
            -sx * camDist * 0.9,
            camDist * 0.25, // Low elevation keeps sun near horizon
            -sz * camDist * 0.9,
          ] as [number, number, number],
          lookAt: [0, 0, 0] as [number, number, number], // Planet stays centered
          fov: CAMERA_FOV_DEGREES,
          targetRadius: targetBodyRadius,
        };
      }

      if (selectedPlanet !== 'Sun') {
        // Other presets: standard view from above and to the side
        const norm = Math.sqrt(0.6 * 0.6 + 0.5 * 0.5 + 0.6 * 0.6);
        return {
          position: [
            (camDist * 0.6) / norm,
            (camDist * 0.5) / norm,
            (camDist * 0.6) / norm,
          ] as [number, number, number],
          lookAt: [0, 0, 0] as [number, number, number],
          fov: CAMERA_FOV_DEGREES,
          targetRadius: targetBodyRadius,
        };
      }

      // Sun selected: default angle
      const norm = Math.sqrt(0.6 * 0.6 + 0.4 * 0.4 + 0.7 * 0.7);
      return {
        position: [
          (camDist * 0.6) / norm,
          (camDist * 0.4) / norm,
          (camDist * 0.7) / norm,
        ] as [number, number, number],
        lookAt: [0, 0, 0] as [number, number, number],
        fov: CAMERA_FOV_DEGREES,
        targetRadius: targetBodyRadius,
      };
    }
    if (mode === 'galaxy') {
      return {
        position: [0, 12, 0.1] as [number, number, number],
        lookAt: [0, 0, 0] as [number, number, number],
        fov: 55,
        targetRadius: 0.3,
      };
    }
    if (mode === 'cmb') {
      return {
        position: [1.5, 0.8, 2.5] as [number, number, number],
        lookAt: [0, 0, 0] as [number, number, number],
        fov: 50,
        targetRadius: 1,
      };
    }
    return {
      position: [0, 0, 3] as [number, number, number],
      lookAt: [0, 0, 0] as [number, number, number],
      fov: 50,
      targetRadius: 0.25,
    };
  }, [mode, selectedPlanet, targetBodyRadius, preset, sunDirection]);

  // Dynamic camera clipping based on target radius
  // This prevents "planet disappears when zooming" in physical scale mode
  const cameraClipping = useMemo(() => {
    const targetRadius = cameraConfig.targetRadius || 0.01;
    // Near plane: close enough to see surface detail without clipping
    const near = Math.max(targetRadius / 500, 1e-7);
    // Far plane: must be at least 300 to include star field (radius 200 + depth 100)
    const far = Math.max(300, targetRadius * 1000);
    return { near, far };
  }, [cameraConfig.targetRadius]);

  // Dynamic camera zoom limits based on preset and target body
  // Uses the mathematical approach: limits are based on screen coverage range
  const cameraLimits = useMemo(() => {
    const targetRadius = cameraConfig.targetRadius || 0.01;
    // Min distance: body fills 80% of screen (very close)
    const minDist = calculateCameraDistance(targetRadius, CAMERA_FOV_DEGREES, 0.8);

    // Mobile devices get extra zoom out range for better overview
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
    const mobileMultiplier = isMobile ? 2.5 : 1;

    // Max distance varies by preset
    if (preset === 'truePhysical') {
      // True Scale: can zoom out far for orbital context (+70% extra range)
      const maxDist =
        calculateCameraDistance(targetRadius, CAMERA_FOV_DEGREES, 0.01) * 1.7;
      return {
        minDistance: Math.max(minDist, 0.0001),
        maxDistance: Math.max(maxDist, 85) * mobileMultiplier,
      };
    }
    // Other modes: moderate zoom range
    const maxDist = calculateCameraDistance(targetRadius, CAMERA_FOV_DEGREES, 0.03);
    return {
      minDistance: Math.max(minDist, 0.02),
      maxDistance: Math.max(maxDist, 50) * mobileMultiplier,
    };
  }, [cameraConfig.targetRadius, preset]);

  return (
    <>
      <ambientLight intensity={0.15} />
      {/* Stars with reduced depth to prevent shell artifacts at certain viewing angles */}
      <Stars
        radius={200}
        depth={100}
        count={8000}
        factor={3}
        fade
        speed={0.1}
        saturation={0}
      />

      {/* Dynamic camera clipping for multi-scale scenes */}
      <CameraClipController near={cameraClipping.near} far={cameraClipping.far} />

      {/* WebGL context loss monitor for debugging */}
      <WebGLContextMonitor />

      {/* Animated camera for smooth transitions */}
      <AnimatedCamera
        targetPosition={cameraConfig.position}
        targetLookAt={cameraConfig.lookAt}
        fov={cameraConfig.fov}
      />

      {/* SPIN MODE - Same as orbit but without orbit lines */}
      {mode === 'spin' && (
        <SpinModeView
          showOrbits={showOrbits}
          showTrails={showTrails}
          showBelts={showBelts}
          showDistances={showDistances}
          showAxes={showAxes}
          selectedPlanet={selectedPlanet}
          preset={preset}
          date={date}
          onPlanetClick={handlePlanetClick}
          showBirthMarker={showBirthMarker}
          birthLatitude={latitude}
          birthLongitude={longitude}
        />
      )}

      {/* ORBIT MODE - Solar system view with orbits */}
      {mode === 'orbit' && (
        <SolarSystemWithOrbits
          showOrbits={showOrbits}
          showTrails={showTrails}
          showBelts={showBelts}
          showDistances={showDistances}
          showAxes={showAxes}
          selectedPlanet={selectedPlanet}
          preset={preset}
          date={date}
          onPlanetClick={handlePlanetClick}
          showBirthMarker={showBirthMarker}
          birthLatitude={latitude}
          birthLongitude={longitude}
        />
      )}

      {/* GALAXY MODE */}
      {mode === 'galaxy' && <GalaxyOverview />}

      {/* CMB MODE */}
      {mode === 'cmb' && <CMBModeView latitude={latitude} longitude={longitude ?? 0} />}

      <OrbitControls
        enablePan={false}
        enableZoom={true}
        enableRotate={true}
        // Semantic zoom limits: uses computed limits that account for mobile
        minDistance={cameraLimits.minDistance}
        maxDistance={cameraLimits.maxDistance}
        autoRotate={false}
        autoRotateSpeed={0.15}
        target={cameraConfig.lookAt}
      />

      {/* Bloom effect for realistic sun light emission */}
      <EffectComposer>
        <Bloom
          intensity={1.0}
          luminanceThreshold={0.7}
          luminanceSmoothing={0.9}
          radius={1.2}
        />
      </EffectComposer>
    </>
  );
}

/**
 * Get rotation velocity for a planet at given latitude.
 * Speed decreases with cos(latitude).
 */
function getRotationVelocityKmh(planet: string, latitudeDeg: number): number {
  const equatorialSpeed = ROTATION_SPEEDS_KMH[planet] || 0;
  const latRad = (latitudeDeg * Math.PI) / 180;
  return equatorialSpeed * Math.cos(latRad);
}

/**
 * Get speed info based on mode and selected planet.
 */
function getSpeedInfo(
  mode: ReferenceFrame,
  selectedPlanet: SelectedBody,
  latitude: number = 0,
  content: ReturnType<typeof getAppContent>
): { speed: number; unit: string; label: string; color: string } {
  const planetInfo = PLANET_INFO[selectedPlanet];
  const orbitalSpeed = ORBITAL_VELOCITIES[selectedPlanet];

  const planetName =
    content.planets[selectedPlanet as keyof typeof content.planets] || planetInfo.label;

  // Use template strings with {planet} placeholder for proper word order in each language
  const spinLabel = content.planetInfo.spinLabel
    ? content.planetInfo.spinLabel.replace('{planet}', planetName)
    : `${planetName} ${content.planetInfo.rotation}`;
  const orbitLabel = content.planetInfo.orbitLabel
    ? content.planetInfo.orbitLabel.replace('{planet}', planetName)
    : `${planetName} ${content.planetInfo.orbit}`;

  switch (mode) {
    case 'spin':
      return {
        speed: getRotationVelocityKmh(selectedPlanet, latitude),
        unit: content.units.kmh,
        label: spinLabel,
        color: planetInfo.color,
      };
    case 'orbit':
      return {
        speed: orbitalSpeed,
        unit: content.units.kms,
        label: orbitLabel,
        color: planetInfo.color,
      };
    case 'galaxy':
      return {
        speed: 220,
        unit: content.units.kms,
        label: content.planetInfo.galacticOrbit,
        color: '#cc88ff',
      };
    case 'cmb':
      return {
        speed: 369.82,
        unit: content.units.kms,
        label: content.planetInfo.cmbMotion,
        color: '#ff6b6b',
      };
    default:
      return { speed: 0, unit: content.units.kms, label: '', color: '#ffffff' };
  }
}

/**
 * Main Scene component.
 */
// Stable camera and gl config to prevent Canvas remounting during HMR
const CAMERA_CONFIG = {
  position: [0, 15, 0.1] as const,
  fov: 55,
  up: [0, 1, 0] as const,
  near: 1e-6,
  far: 100,
};
const GL_CONFIG = {
  antialias: true,
  alpha: true,
  logarithmicDepthBuffer: true,
  preserveDrawingBuffer: true,
};
const SHADOW_CONFIG = { enabled: true, type: THREE.PCFSoftShadowMap } as const;

export default function Scene({
  mode,
  latitude,
  longitude = 0,
  birthDate = null,
  showBirthMarker = false,
  onEditBirthData,
  birthPlaceName = null,
  onReady,
  onCanvasReady,
  sceneRef,
}: SceneProps) {
  const { locale, setLocale } = useLocaleContext();
  const content = getAppContent(locale);
  const [selectedPlanet, setSelectedBody] = useState<SelectedBody>('Earth');
  const [preset, setPreset] = useState<PresetName>('schoolModel');
  const [showOrbits, setShowOrbits] = useState(true); // Show orbit paths
  const [showTrails, setShowTrails] = useState(true);
  const [showDistances, setShowDistances] = useState(false);
  const [showBelts, setShowBelts] = useState(false);
  const [showAxes, setShowAxes] = useState(true); // Show rotation axes by default
  const [showControls, setShowControls] = useState(true); // Show camera controls by default
  const [showMobileSettings, setShowMobileSettings] = useState(false); // Mobile settings sheet
  // Initialize viewDate to null to avoid hydration mismatch, set on client mount
  const [viewDate, setViewDate] = useState<Date | null>(null);
  const [isLiveTime, setIsLiveTime] = useState(!birthDate); // Start live only if no birth date
  // Track which view mode: 'live', 'birth', or 'custom' - default to 'birth' if birthDate exists
  const [viewMode, setViewMode] = useState<DateSliderViewMode>(
    birthDate ? 'birth' : 'live'
  );
  const speedInfo = getSpeedInfo(mode, selectedPlanet, latitude, content);
  const cameraRef = useRef<THREE.Camera | null>(null);

  // Expose methods for external control (e.g., for share preparation)
  useEffect(() => {
    if (sceneRef && 'current' in sceneRef) {
      (sceneRef as React.MutableRefObject<SceneHandle | null>).current = {
        prepareForShare: () => {
          let needsUpdate = false;

          // Force School Model preset for consistent share appearance
          if (preset !== 'schoolModel') {
            setPreset('schoolModel');
            needsUpdate = true;
          }

          // Focus on Earth if not already selected
          if (selectedPlanet !== 'Earth') {
            setSelectedBody('Earth');
            needsUpdate = true;
          }

          // Set date to birth date if available and not already viewing birth
          if (birthDate && viewMode !== 'birth') {
            setViewDate(birthDate);
            setViewMode('birth');
            setIsLiveTime(false);
            needsUpdate = true;
          }

          return needsUpdate;
        },
      };
    }
    return () => {
      if (sceneRef && 'current' in sceneRef) {
        (sceneRef as React.MutableRefObject<SceneHandle | null>).current = null;
      }
    };
  }, [sceneRef, birthDate, selectedPlanet, viewMode, preset]);

  // Compute camera zoom limits based on preset and selected planet
  // This needs to be in Scene component since CameraControlsUI is rendered here
  // Uses the mathematical approach: limits are based on screen coverage range
  const cameraLimits = useMemo(() => {
    // Get approximate body radius for the selected planet
    const planets = getPlanetPositionsWithPreset(new Date(), preset);
    const moon = getMoonPositionWithPreset(new Date(), preset);

    let targetRadius = 0.25; // default
    if (selectedPlanet === 'Moon') {
      targetRadius = moon.size;
    } else {
      const target = planets.find((p) => p.name === selectedPlanet);
      if (target) targetRadius = target.size;
    }

    // Min distance: body fills 80% of screen (very close)
    const minDist = calculateCameraDistance(targetRadius, CAMERA_FOV_DEGREES, 0.8);

    // Mobile devices get extra zoom out range for better overview
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
    const mobileMultiplier = isMobile ? 2.5 : 1;

    if (preset === 'truePhysical') {
      // True Scale: can zoom out far for orbital context (+70% extra range)
      const maxDist =
        calculateCameraDistance(targetRadius, CAMERA_FOV_DEGREES, 0.01) * 1.7;
      return {
        minDistance: Math.max(minDist, 0.0001),
        maxDistance: Math.max(maxDist, 85) * mobileMultiplier,
      };
    }
    // Other modes: moderate zoom range
    const maxDist = calculateCameraDistance(targetRadius, CAMERA_FOV_DEGREES, 0.03);
    return {
      minDistance: Math.max(minDist, 0.02),
      maxDistance: Math.max(maxDist, 50) * mobileMultiplier,
    };
  }, [preset, selectedPlanet]);

  // Track previous birthDate to detect changes
  const prevBirthDateRef = useRef<Date | null | undefined>(undefined);

  // Initialize date on client mount - default to birth date if available
  useEffect(() => {
    if (viewDate === null) {
      // If birth date is set and valid, show the solar system at birth
      if (birthDate && birthDate.getTime() <= Date.now()) {
        setViewDate(birthDate);
        setViewMode('birth');
        setIsLiveTime(false);
      } else {
        setViewDate(new Date());
        setViewMode('live');
        setIsLiveTime(true);
      }
      // Only set prev ref on initial mount
      prevBirthDateRef.current = birthDate;
    }
  }, [birthDate, viewDate]);

  // When birthDate changes (user sets/edits), jump to the new birth date
  useEffect(() => {
    // Skip on initial render (prevBirthDateRef is undefined)
    if (prevBirthDateRef.current === undefined) return;

    // If birthDate changed and is valid, jump to it
    if (birthDate && birthDate.getTime() !== prevBirthDateRef.current?.getTime()) {
      setViewDate(birthDate);
      setViewMode('birth');
      setIsLiveTime(false);
    }
    // Always update ref after comparison
    prevBirthDateRef.current = birthDate;
  }, [birthDate]);

  // Handle live time updates
  useEffect(() => {
    if (!isLiveTime || viewMode !== 'live') return;

    const interval = setInterval(() => {
      setViewDate(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, [isLiveTime, viewMode]);

  // Handle manual date changes
  const handleDateChange = useCallback(
    (newDate: Date) => {
      const now = new Date();
      const diff = Math.abs(now.getTime() - newDate.getTime());
      // If within 2 seconds of now, consider it "live"
      if (diff < 2000) {
        setIsLiveTime(true);
        setViewMode('live');
      } else if (birthDate && Math.abs(newDate.getTime() - birthDate.getTime()) < 2000) {
        // If within 2 seconds of birth date, snap to birth
        setIsLiveTime(false);
        setViewMode('birth');
      } else {
        setIsLiveTime(false);
        setViewMode('custom');
      }
      setViewDate(newDate);
    },
    [birthDate]
  );

  // Quick jump to birth date
  const jumpToBirthDate = useCallback(() => {
    if (birthDate) {
      setViewDate(birthDate);
      setViewMode('birth');
      setIsLiveTime(false);
    }
  }, [birthDate]);

  // Quick jump to now
  const jumpToNow = useCallback(() => {
    setViewDate(new Date());
    setViewMode('live');
    setIsLiveTime(true);
  }, []);

  // Don't render canvas until client-side date is initialized (prevents hydration mismatch)
  // Page-level loading screen handles the UI during this time
  if (viewDate === null) {
    return null;
  }

  return (
    <ContentContext.Provider value={content}>
      <RenderProfileProvider initialFidelity="standard" initialAnimation="subtle">
        <div className="w-full h-full relative">
          <Canvas
            key="worldline-canvas"
            camera={CAMERA_CONFIG}
            className="w-full h-full"
            gl={GL_CONFIG}
            shadows={SHADOW_CONFIG}
          >
            <color attach="background" args={['#050508']} />
            {/* Track loading progress - outside Suspense so it runs while children load */}
            {onReady && <SceneLoadingTracker onReady={onReady} />}
            <Suspense fallback={null}>
              <CameraBridge cameraRef={cameraRef} />
              {onCanvasReady && <CanvasBridge onCanvasReady={onCanvasReady} />}
              <SceneContent
                mode={mode}
                latitude={latitude}
                longitude={longitude}
                showBirthMarker={showBirthMarker && viewMode === 'birth'}
                selectedPlanet={selectedPlanet}
                onPlanetSelect={setSelectedBody}
                preset={preset}
                showOrbits={showOrbits}
                showTrails={showTrails}
                showDistances={showDistances}
                showBelts={showBelts}
                showAxes={showAxes}
                date={viewDate}
              />
            </Suspense>
          </Canvas>

          {/*
        Scene-internal overlay layer.
        z-50 places overlays above Canvas but below SceneShell's overlay layer (z-100).
        pointer-events-none allows clicks to pass through to the canvas.
        Individual UI elements have pointer-events-auto.
      */}
          <div className="absolute inset-0 z-50 pointer-events-none">
            {/* App title - top center, mobile only (desktop uses page.tsx overlay) */}
            <div className="sm:hidden absolute top-3 left-1/2 -translate-x-1/2">
              <SpacetimeTitle size="sm" withBox />
            </div>

            {/* Language switcher - top left corner (desktop only) */}
            <div className="pointer-events-auto absolute top-3 left-3 z-[100] hidden sm:block">
              <LanguageSwitcher locale={locale} onLocaleChange={setLocale} />
            </div>

            {/* Speed HUD - top right (desktop only) */}
            <div className="pointer-events-auto hidden sm:block">
              <SpeedHUD {...speedInfo} />
            </div>

            {/* Scene options panel - top left, below title (desktop only) */}
            {(mode === 'orbit' || mode === 'spin') && (
              <div className="pointer-events-auto hidden sm:block">
                <SceneOptionsPanel
                  preset={preset}
                  onPresetChange={setPreset}
                  showOrbits={showOrbits}
                  onShowOrbitsChange={setShowOrbits}
                  showTrails={showTrails}
                  onShowTrailsChange={setShowTrails}
                  showDistances={showDistances}
                  onShowDistancesChange={setShowDistances}
                  showBelts={showBelts}
                  onShowBeltsChange={setShowBelts}
                  showAxes={showAxes}
                  onShowAxesChange={setShowAxes}
                  showControls={showControls}
                  onShowControlsChange={setShowControls}
                  locale={locale}
                />
              </div>
            )}

            {/* Planet selector - top right, below speed HUD (desktop only) */}
            {(mode === 'orbit' || mode === 'spin') && (
              <div className="pointer-events-auto absolute top-24 right-4 z-[100] hidden sm:block">
                <PlanetSelector
                  selected={selectedPlanet}
                  onChange={setSelectedBody}
                  viewDate={viewDate}
                  locale={locale}
                />
              </div>
            )}

            {/* Date slider - bottom center (desktop only) */}
            {(mode === 'orbit' || mode === 'spin') && (
              <div className="pointer-events-auto absolute bottom-20 left-1/2 -translate-x-1/2 flex-col items-center gap-2 hidden sm:flex">
                <DateSlider
                  date={viewDate}
                  onChange={handleDateChange}
                  birthDate={birthDate}
                  viewMode={viewMode}
                  onJumpToBirth={birthDate ? jumpToBirthDate : undefined}
                  onJumpToNow={jumpToNow}
                  onEditBirthData={onEditBirthData}
                  birthPlaceName={birthPlaceName}
                  locale={locale}
                />
                {/* Exploration hint */}
                <div className="flex text-[9px] text-white/40 text-center items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-full">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M15 3h6v6" />
                    <path d="M10 14 21 3" />
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  </svg>
                  {content.scene.clickToExplore}
                </div>
              </div>
            )}

            {/* Scale note - bottom left corner (desktop only) */}
            {(mode === 'orbit' || mode === 'spin' || mode === 'galaxy') && (
              <div className="absolute bottom-20 left-4 text-[8px] text-neutral-500 hidden sm:block">
                {content.scene.ephemerisNote}
              </div>
            )}

            {/* Camera controls - bottom right (desktop only) */}
            {(mode === 'orbit' || mode === 'spin') && (
              <div className="pointer-events-auto hidden sm:block">
                <CameraControlsUI
                  cameraRef={cameraRef}
                  visible={showControls}
                  minDistance={cameraLimits.minDistance}
                  maxDistance={cameraLimits.maxDistance}
                  content={content}
                />
              </div>
            )}

            {/* Mobile Settings FAB - bottom right (mobile only) */}
            {/* Using bottom-24 (96px) to clear iOS Safari navigation bar */}
            <div className="sm:hidden pointer-events-auto absolute bottom-24 right-4">
              <button
                onClick={() => setShowMobileSettings(true)}
                className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors shadow-lg"
                aria-label={content.scene.settings}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
            </div>

            {/* Mobile touch hint - positioned above FAB */}
            <div className="sm:hidden pointer-events-none absolute bottom-40 left-1/2 -translate-x-1/2">
              <div className="text-[10px] text-white/40 text-center bg-black/40 px-3 py-1.5 rounded-full">
                {content.scene.pinchToZoom}
              </div>
            </div>
          </div>

          {/* Mobile Settings Sheet */}
          <MobileSettingsSheet
            isOpen={showMobileSettings}
            onClose={() => setShowMobileSettings(false)}
            focusedPlanet={selectedPlanet}
            onPlanetSelect={setSelectedBody}
            preset={preset}
            onPresetChange={setPreset}
            showOrbits={showOrbits}
            onShowOrbitsChange={setShowOrbits}
            showTrails={showTrails}
            onShowTrailsChange={setShowTrails}
            locale={locale}
            onLocaleChange={setLocale}
            birthDate={birthDate}
            birthPlaceName={birthPlaceName}
            onEditBirthData={onEditBirthData}
          />
        </div>
      </RenderProfileProvider>
    </ContentContext.Provider>
  );
}
