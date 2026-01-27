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
import { Suspense, useMemo, useState, useRef, useCallback, useEffect } from 'react';
import * as THREE from 'three';
import {
  Earth,
  UserMarker,
  RenderProfileProvider,
  Sun as FidelitySun,
  SaturnRings as FidelitySaturnRings,
  Planet as CinematicPlanet,
} from '@worldline-kinematics/scene';
import type { ReferenceFrame } from '@worldline-kinematics/core';
import {
  getPlanetPositionsWithPreset,
  getMoonPositionWithPreset,
  ORBITAL_ELEMENTS,
  RENDER_PRESETS,
  type PlanetPosition,
  type MoonPosition,
  type PresetName,
} from '../utils/planetaryPositions';

interface SceneProps {
  mode: ReferenceFrame;
  latitude: number;
  longitude?: number;
}

/**
 * Orbital velocities in km/s for each body.
 * Source: NASA Planetary Fact Sheets
 * https://nssdc.gsfc.nasa.gov/planetary/factsheet/
 */
const ORBITAL_VELOCITIES: Record<string, number> = {
  Sun: 0, // Reference frame
  Mercury: 47.87,
  Venus: 35.02,
  Earth: 29.78,
  Moon: 1.022, // Around Earth
  Mars: 24.07,
  Jupiter: 13.07,
  Saturn: 9.68,
  Uranus: 6.8,
  Neptune: 5.43,
};

/**
 * Calculates the current season for Earth based on the date.
 * Uses astronomical definitions based on solstices and equinoxes.
 *
 * @param date The date to check
 * @param hemisphere 'northern' or 'southern'
 * @returns Season name and progress percentage through the season
 */
function getEarthSeason(
  date: Date,
  hemisphere: 'northern' | 'southern' = 'northern'
): {
  season: string;
  progress: number;
  nextEvent: string;
  daysUntilNext: number;
} {
  const year = date.getFullYear();

  // Approximate dates for astronomical events (these vary by a day or two each year)
  // Using fixed approximations for simplicity
  const vernalEquinox = new Date(year, 2, 20); // March 20
  const summerSolstice = new Date(year, 5, 21); // June 21
  const autumnalEquinox = new Date(year, 8, 22); // September 22
  const winterSolstice = new Date(year, 11, 21); // December 21

  const events = [
    {
      date: vernalEquinox,
      northSeason: 'Spring',
      southSeason: 'Autumn',
      next: 'Summer Solstice',
    },
    {
      date: summerSolstice,
      northSeason: 'Summer',
      southSeason: 'Winter',
      next: 'Autumn Equinox',
    },
    {
      date: autumnalEquinox,
      northSeason: 'Autumn',
      southSeason: 'Spring',
      next: 'Winter Solstice',
    },
    {
      date: winterSolstice,
      northSeason: 'Winter',
      southSeason: 'Summer',
      next: 'Spring Equinox',
    },
  ];

  // Handle wrap-around for dates before vernal equinox
  const prevWinterSolstice = new Date(year - 1, 11, 21);

  let currentSeason = 'Winter';
  let nextEvent = 'Spring Equinox';
  let seasonStart = prevWinterSolstice;
  let seasonEnd = vernalEquinox;

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const nextIndex = (i + 1) % events.length;
    const nextEventDate =
      nextIndex === 0
        ? new Date(year + 1, 2, 20) // Next year's vernal equinox
        : events[nextIndex].date;

    if (date >= event.date && date < nextEventDate) {
      currentSeason = hemisphere === 'northern' ? event.northSeason : event.southSeason;
      nextEvent =
        hemisphere === 'northern'
          ? nextIndex === 0
            ? 'Spring Equinox'
            : events[nextIndex].next
          : events[nextIndex].next;
      seasonStart = event.date;
      seasonEnd = nextEventDate;
      break;
    }
  }

  // Handle dates before first event of the year
  if (date < vernalEquinox) {
    currentSeason = hemisphere === 'northern' ? 'Winter' : 'Summer';
    nextEvent = hemisphere === 'northern' ? 'Spring Equinox' : 'Autumn Equinox';
    seasonStart = prevWinterSolstice;
    seasonEnd = vernalEquinox;
  }

  const seasonLength = seasonEnd.getTime() - seasonStart.getTime();
  const elapsed = date.getTime() - seasonStart.getTime();
  const progress = Math.max(0, Math.min(100, (elapsed / seasonLength) * 100));

  const daysUntilNext = Math.ceil(
    (seasonEnd.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  );

  return { season: currentSeason, progress, nextEvent, daysUntilNext };
}

/**
 * Calculate moon phase for a given date.
 * Uses a simple algorithm based on the synodic month (29.53 days).
 *
 * @param date The date to check
 * @returns Moon phase name, illumination percentage, and age in days
 */
function getMoonPhase(date: Date): {
  phase: string;
  illumination: number;
  age: number;
  emoji: string;
} {
  // Known new moon reference: January 6, 2000 at 18:14 UTC
  const knownNewMoon = new Date(Date.UTC(2000, 0, 6, 18, 14, 0));
  const synodicMonth = 29.53058867; // Days

  const daysSinceNewMoon =
    (date.getTime() - knownNewMoon.getTime()) / (1000 * 60 * 60 * 24);
  const age = ((daysSinceNewMoon % synodicMonth) + synodicMonth) % synodicMonth;

  // Calculate illumination (approximate using cosine)
  const cyclePosition = age / synodicMonth;
  const illumination = Math.round(
    ((1 - Math.cos(cyclePosition * 2 * Math.PI)) / 2) * 100
  );

  // Determine phase name
  let phase: string;
  let emoji: string;
  if (age < 1.85) {
    phase = 'New Moon';
    emoji = '\u{1F311}'; // New moon symbol
  } else if (age < 5.53) {
    phase = 'Waxing Crescent';
    emoji = '\u{1F312}';
  } else if (age < 9.22) {
    phase = 'First Quarter';
    emoji = '\u{1F313}';
  } else if (age < 12.91) {
    phase = 'Waxing Gibbous';
    emoji = '\u{1F314}';
  } else if (age < 16.61) {
    phase = 'Full Moon';
    emoji = '\u{1F315}';
  } else if (age < 20.3) {
    phase = 'Waning Gibbous';
    emoji = '\u{1F316}';
  } else if (age < 23.99) {
    phase = 'Last Quarter';
    emoji = '\u{1F317}';
  } else if (age < 27.68) {
    phase = 'Waning Crescent';
    emoji = '\u{1F318}';
  } else {
    phase = 'New Moon';
    emoji = '\u{1F311}';
  }

  return { phase, illumination, age: Math.round(age * 10) / 10, emoji };
}

/**
 * Comprehensive planetary data for the selector.
 * Sources: NASA Planetary Fact Sheets
 * https://nssdc.gsfc.nasa.gov/planetary/factsheet/
 */
const PLANET_INFO: Record<
  string,
  {
    label: string;
    color: string;
    massKg: number; // Mass in kg
    massEarth: number; // Mass relative to Earth
    diameterKm: number; // Equatorial diameter in km
    rotationPeriodHours: number; // Rotation period in hours (negative = retrograde)
    dayLengthHours: number; // Length of day (solar) in hours
    distanceAU: number; // Mean distance from Sun in AU
    orbitalPeriodDays: number; // Orbital period in Earth days
    moons: number; // Known moons
    rings: boolean; // Has rings
    type: string; // Planet type
  }
> = {
  Sun: {
    label: 'Sun',
    color: '#ffd27d',
    massKg: 1.989e30,
    massEarth: 332946,
    diameterKm: 1392700,
    rotationPeriodHours: 609.12, // ~25.4 days at equator
    dayLengthHours: 609.12,
    distanceAU: 0,
    orbitalPeriodDays: 0,
    moons: 0,
    rings: false,
    type: 'Star',
  },
  Mercury: {
    label: 'Mercury',
    color: '#b5b5b5',
    massKg: 3.285e23,
    massEarth: 0.055,
    diameterKm: 4879,
    rotationPeriodHours: 1407.6, // 58.6 days
    dayLengthHours: 4222.6, // 176 Earth days
    distanceAU: 0.387,
    orbitalPeriodDays: 88,
    moons: 0,
    rings: false,
    type: 'Rocky',
  },
  Venus: {
    label: 'Venus',
    color: '#e6c87a',
    massKg: 4.867e24,
    massEarth: 0.815,
    diameterKm: 12104,
    rotationPeriodHours: -5832.5, // 243 days retrograde
    dayLengthHours: 2802, // 116.75 Earth days
    distanceAU: 0.723,
    orbitalPeriodDays: 225,
    moons: 0,
    rings: false,
    type: 'Rocky',
  },
  Earth: {
    label: 'Earth',
    color: '#4488cc',
    massKg: 5.972e24,
    massEarth: 1,
    diameterKm: 12756,
    rotationPeriodHours: 23.934,
    dayLengthHours: 24,
    distanceAU: 1,
    orbitalPeriodDays: 365.25,
    moons: 1,
    rings: false,
    type: 'Rocky',
  },
  Mars: {
    label: 'Mars',
    color: '#c1440e',
    massKg: 6.39e23,
    massEarth: 0.107,
    diameterKm: 6792,
    rotationPeriodHours: 24.623,
    dayLengthHours: 24.66,
    distanceAU: 1.524,
    orbitalPeriodDays: 687,
    moons: 2,
    rings: false,
    type: 'Rocky',
  },
  Jupiter: {
    label: 'Jupiter',
    color: '#d4a574',
    massKg: 1.898e27,
    massEarth: 317.8,
    diameterKm: 142984,
    rotationPeriodHours: 9.925,
    dayLengthHours: 9.925,
    distanceAU: 5.203,
    orbitalPeriodDays: 4333,
    moons: 95,
    rings: true,
    type: 'Gas Giant',
  },
  Saturn: {
    label: 'Saturn',
    color: '#f4d59e',
    massKg: 5.683e26,
    massEarth: 95.2,
    diameterKm: 120536,
    rotationPeriodHours: 10.656,
    dayLengthHours: 10.656,
    distanceAU: 9.537,
    orbitalPeriodDays: 10759,
    moons: 146,
    rings: true,
    type: 'Gas Giant',
  },
  Uranus: {
    label: 'Uranus',
    color: '#b5e3e3',
    massKg: 8.681e25,
    massEarth: 14.5,
    diameterKm: 51118,
    rotationPeriodHours: -17.24, // retrograde
    dayLengthHours: 17.24,
    distanceAU: 19.19,
    orbitalPeriodDays: 30687,
    moons: 28,
    rings: true,
    type: 'Ice Giant',
  },
  Neptune: {
    label: 'Neptune',
    color: '#5b7fde',
    massKg: 1.024e26,
    massEarth: 17.1,
    diameterKm: 49528,
    rotationPeriodHours: 16.11,
    dayLengthHours: 16.11,
    distanceAU: 30.07,
    orbitalPeriodDays: 60190,
    moons: 16,
    rings: true,
    type: 'Ice Giant',
  },
  Moon: {
    label: 'Moon',
    color: '#c4c4c4',
    massKg: 7.342e22,
    massEarth: 0.0123,
    diameterKm: 3475,
    rotationPeriodHours: 655.7, // 27.32 days (tidally locked)
    dayLengthHours: 708.7, // 29.53 Earth days (synodic period)
    distanceAU: 0.00257, // ~384,400 km from Earth
    orbitalPeriodDays: 27.32,
    moons: 0,
    rings: false,
    type: 'Moon',
  },
};

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
}: {
  size?: number;
  position?: [number, number, number];
}) {
  return (
    <group position={position}>
      <FidelitySun radius={size} />
      {/* No decay - light reaches all planets regardless of scale mode */}
      <pointLight intensity={3} decay={0} color="#fff8e0" />
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
  }, [innerRadius, outerRadius, count, center[0], center[1], center[2]]);

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

/**
 * Convert AU distance to light travel time string.
 * Light travels 1 AU in approximately 499 seconds (8.317 minutes).
 */
function formatLightTime(distanceAU: number): string {
  const lightSecondsPerAU = 499.004784; // seconds for light to travel 1 AU
  const totalSeconds = distanceAU * lightSecondsPerAU;

  if (totalSeconds < 60) {
    return `${totalSeconds.toFixed(0)}s`;
  } else if (totalSeconds < 3600) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.round(totalSeconds % 60);
    return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
  } else {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.round((totalSeconds % 3600) / 60);
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
}

/**
 * Saturn's rings wrapper that uses the fidelity-aware SaturnRings component.
 * In Standard mode: Simple combined ring.
 * In Cinematic mode: Multiple ring components (D, C, B, Cassini Division, A, F)
 *                    with physically accurate dimensions from PDS data.
 */
function SaturnRingsWrapper({
  planetSize,
  planetPosition,
}: {
  planetSize: number;
  planetPosition: [number, number, number];
}) {
  return (
    <FidelitySaturnRings
      saturnRadius={planetSize}
      position={planetPosition}
      sunPosition={[0, 0, 0]}
      applyTilt={true}
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
  showLabel?: boolean;
  highlight?: boolean;
  showSpeed?: boolean;
  showDistance?: boolean;
  showRotationAxis?: boolean;
  onClick?: () => void;
}) {
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
        sunPosition={[0, 0, 0]}
        showLabel={false} // We'll render our own label with extra info
        onClick={onClick}
        northPole={position.northPole}
        rotationAngleDeg={position.rotationAngleDeg}
        textureOffsetDeg={position.textureOffsetDeg}
        showRotationAxis={showRotationAxis && highlight} // Show axis on highlighted/selected planet when enabled
      />

      {/* Saturn rings - uses fidelity-aware component */}
      {name === 'Saturn' && (
        <SaturnRingsWrapper
          planetSize={size}
          planetPosition={[position.x, position.y, position.z]}
        />
      )}

      {/* Custom label with orbital speed and distance info */}
      {showLabel && (
        <Html
          position={[position.x, position.y + size + 0.08, position.z]}
          center
          style={{ pointerEvents: 'none' }}
        >
          <div className="flex flex-col items-center gap-0.5">
            <div
              className={`text-[8px] whitespace-nowrap ${highlight ? 'text-blue-300 font-bold' : 'text-white/50'}`}
            >
              {name}
            </div>
            {showSpeed && orbitalSpeed && (
              <div className="text-[7px] text-orange-400/80 whitespace-nowrap">
                {orbitalSpeed.toFixed(1)} km/s
              </div>
            )}
            {showDistance && (
              <div className="flex flex-col items-center gap-0.5 mt-0.5">
                <div className="text-[7px] text-cyan-400/80 whitespace-nowrap">
                  {auDisplay} AU
                </div>
                <div className="text-[6px] text-white/40 whitespace-nowrap">
                  light: {formatLightTime(position.distanceAU)}
                </div>
              </div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}

/**
 * Moon sphere with texture.
 * Now supports selection, click handling, and rotation axis visualization.
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
  const moonTexture = useLoader(THREE.TextureLoader, '/textures/2k_moon.jpg');
  moonTexture.colorSpace = THREE.SRGBColorSpace;

  // Moon position is relative to Earth
  const absolutePos = {
    x: earthPosition.x + position.x,
    y: earthPosition.y + position.y,
    z: earthPosition.z + position.z,
  };

  // Moon's axial tilt is about 6.68 degrees to its orbital plane
  const moonTiltRadians = (6.68 * Math.PI) / 180;
  const axisLength = size * 2.5;
  const northDir = new THREE.Vector3(
    0,
    Math.cos(moonTiltRadians),
    Math.sin(moonTiltRadians)
  ).normalize();
  const northPos = northDir.clone().multiplyScalar(axisLength);
  const southPos = northDir.clone().multiplyScalar(-axisLength);

  return (
    <group position={[absolutePos.x, absolutePos.y, absolutePos.z]}>
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

      {/* Label */}
      <Html position={[0, size + 0.05, 0]} center style={{ pointerEvents: 'none' }}>
        <div
          className={`text-[8px] whitespace-nowrap ${highlight ? 'text-blue-300 font-bold' : 'text-white/50'}`}
        >
          Moon
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
          Galactic Center
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
      className="absolute top-4 right-4 bg-black/70 backdrop-blur-sm px-4 py-3 rounded-lg border"
      style={{ borderColor: color }}
    >
      <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color }}>
        {label}
      </div>
      <div className="text-2xl font-bold text-white">
        {speed.toFixed(2)}{' '}
        <span className="text-sm font-normal text-white/60">{unit}</span>
      </div>
    </div>
  );
}

/**
 * Body selector dropdown for choosing which body to center on.
 */
type SelectedBody =
  | 'Sun'
  | 'Mercury'
  | 'Venus'
  | 'Earth'
  | 'Moon'
  | 'Mars'
  | 'Jupiter'
  | 'Saturn'
  | 'Uranus'
  | 'Neptune';

const BODY_ORDER: SelectedBody[] = [
  'Sun',
  'Mercury',
  'Venus',
  'Earth',
  'Moon',
  'Mars',
  'Jupiter',
  'Saturn',
  'Uranus',
  'Neptune',
];

// Legacy alias
type SelectedPlanet = SelectedBody;
const PLANET_ORDER = BODY_ORDER;

/**
 * Body texture paths for selector icons.
 */
const BODY_ICON_TEXTURES: Record<string, string> = {
  Sun: '/textures/2k_sun.jpg',
  Mercury: '/textures/2k_mercury.jpg',
  Venus: '/textures/2k_venus_surface.jpg',
  Earth: '/textures/earth_daymap.jpg',
  Moon: '/textures/2k_moon.jpg',
  Mars: '/textures/2k_mars.jpg',
  Jupiter: '/textures/2k_jupiter.jpg',
  Saturn: '/textures/2k_saturn.jpg',
  Uranus: '/textures/2k_uranus.jpg',
  Neptune: '/textures/2k_neptune.jpg',
};

// Legacy alias
const PLANET_ICON_TEXTURES = BODY_ICON_TEXTURES;

/**
 * Format a large number with scientific notation or appropriate suffix.
 */
function formatNumber(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toFixed(1);
}

/**
 * Format rotation period for display.
 */
function formatRotation(hours: number): string {
  const isRetrograde = hours < 0;
  const absHours = Math.abs(hours);
  if (absHours >= 24) {
    const days = absHours / 24;
    return `${days.toFixed(1)}d${isRetrograde ? ' (R)' : ''}`;
  }
  return `${absHours.toFixed(1)}h${isRetrograde ? ' (R)' : ''}`;
}

function PlanetSelector({
  selected,
  onChange,
  viewDate,
}: {
  selected: SelectedPlanet;
  onChange: (p: SelectedPlanet) => void;
  viewDate?: Date;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const info = PLANET_INFO[selected];
  const orbitalSpeed = ORBITAL_VELOCITIES[selected];

  // Calculate comparison values
  const yearInEarthDays = info.orbitalPeriodDays;
  const yearInEarthYears = info.orbitalPeriodDays / 365.25;
  const dayInEarthHours = Math.abs(info.dayLengthHours);

  // Get Earth season if Earth is selected
  const earthSeason = selected === 'Earth' && viewDate ? getEarthSeason(viewDate) : null;

  // Get Moon phase if Moon is selected
  const moonPhase = selected === 'Moon' && viewDate ? getMoonPhase(viewDate) : null;

  return (
    <div className="relative">
      {/* Selected planet info card */}
      <div className="bg-black/80 backdrop-blur-sm rounded-lg border border-white/20 overflow-hidden min-w-[200px]">
        {/* Header with planet selector */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 w-full px-3 py-2 hover:bg-white/5 transition-colors border-b border-white/10"
        >
          <img
            src={PLANET_ICON_TEXTURES[selected]}
            alt={selected}
            className="w-7 h-7 rounded-full object-cover"
          />
          <div className="flex-1 text-left">
            <div className="text-white text-sm font-medium">{info.label}</div>
            <div className="text-[9px] text-white/50">{info.type}</div>
          </div>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        {/* Planet stats */}
        <div className="px-3 py-2 space-y-1.5">
          {/* Earth Season - only shown for Earth */}
          {earthSeason && (
            <div className="flex justify-between items-center bg-gradient-to-r from-emerald-500/10 to-transparent rounded px-1 py-0.5 -mx-1">
              <span className="text-[9px] text-emerald-400/70 uppercase">Season</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-emerald-400 font-medium">
                  {earthSeason.season}
                </span>
                <span className="text-[8px] text-white/40">
                  ({earthSeason.daysUntilNext}d to {earthSeason.nextEvent})
                </span>
              </div>
            </div>
          )}

          {/* Moon Phase - only shown for Moon */}
          {moonPhase && (
            <div className="flex justify-between items-center bg-gradient-to-r from-slate-400/10 to-transparent rounded px-1 py-0.5 -mx-1">
              <span className="text-[9px] text-slate-300/70 uppercase">Phase</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-200 font-medium">
                  {moonPhase.phase}
                </span>
                <span className="text-[8px] text-white/40">
                  ({moonPhase.illumination}% lit)
                </span>
              </div>
            </div>
          )}

          {/* Orbital velocity */}
          {selected !== 'Sun' && (
            <div className="flex justify-between items-center">
              <span className="text-[9px] text-white/40 uppercase">
                {selected === 'Moon' ? 'Orbit (Earth)' : 'Orbital Speed'}
              </span>
              <span className="text-xs text-orange-400 font-medium">
                {orbitalSpeed.toFixed(2)} km/s
              </span>
            </div>
          )}

          {/* Rotation / Day Length */}
          <div className="flex justify-between items-center">
            <span className="text-[9px] text-white/40 uppercase">Rotation</span>
            <span className="text-xs text-cyan-400 font-medium">
              {formatRotation(info.rotationPeriodHours)}
            </span>
          </div>

          {/* Distance from Sun (or Earth for Moon) */}
          {selected !== 'Sun' && (
            <div className="flex justify-between items-center">
              <span className="text-[9px] text-white/40 uppercase">
                {selected === 'Moon' ? 'Distance (Earth)' : 'Distance'}
              </span>
              <span className="text-xs text-green-400 font-medium">
                {selected === 'Moon' ? '384,400 km' : `${info.distanceAU.toFixed(2)} AU`}
              </span>
            </div>
          )}

          {/* Mass */}
          <div className="flex justify-between items-center">
            <span className="text-[9px] text-white/40 uppercase">Mass</span>
            <span className="text-xs text-purple-400 font-medium">
              {selected === 'Sun'
                ? formatNumber(info.massEarth) + 'x'
                : info.massEarth < 1
                  ? info.massEarth.toFixed(3) + 'x'
                  : info.massEarth.toFixed(1) + 'x'}{' '}
              Earth
            </span>
          </div>

          {/* Diameter */}
          <div className="flex justify-between items-center">
            <span className="text-[9px] text-white/40 uppercase">Diameter</span>
            <span className="text-xs text-white/70 font-medium">
              {formatNumber(info.diameterKm)} km
            </span>
          </div>

          {/* Additional info row */}
          <div className="flex gap-3 pt-1 border-t border-white/5">
            {/* Moons */}
            <div className="flex items-center gap-1">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-white/30"
              >
                <circle cx="12" cy="12" r="10" />
              </svg>
              <span className="text-[9px] text-white/50">
                {info.moons} moon{info.moons !== 1 ? 's' : ''}
              </span>
            </div>
            {/* Orbital period in Earth years/days */}
            {selected !== 'Sun' && info.orbitalPeriodDays > 0 && (
              <div className="flex items-center gap-1 ml-auto">
                <span className="text-[9px] text-white/50">
                  {yearInEarthYears < 1
                    ? `${yearInEarthDays.toFixed(0)}d orbit`
                    : `${yearInEarthYears.toFixed(1)}y orbit`}
                </span>
              </div>
            )}
          </div>

          {/* Comparison to Earth - for non-Earth planets */}
          {selected !== 'Sun' && selected !== 'Earth' && (
            <div className="pt-1.5 border-t border-white/10 space-y-1">
              <div className="text-[8px] text-white/30 uppercase tracking-wider">
                Compared to Earth
              </div>
              <div className="flex gap-3">
                <div className="flex-1 bg-white/5 rounded px-1.5 py-1">
                  <div className="text-[8px] text-white/40">Year</div>
                  <div className="text-[10px] text-yellow-400 font-medium">
                    {yearInEarthYears < 0.1
                      ? `${yearInEarthDays.toFixed(0)} days`
                      : yearInEarthYears < 2
                        ? `${yearInEarthDays.toFixed(0)} days`
                        : `${yearInEarthYears.toFixed(1)} years`}
                  </div>
                </div>
                <div className="flex-1 bg-white/5 rounded px-1.5 py-1">
                  <div className="text-[8px] text-white/40">Day</div>
                  <div className="text-[10px] text-blue-400 font-medium">
                    {dayInEarthHours < 24
                      ? `${dayInEarthHours.toFixed(1)}h`
                      : dayInEarthHours < 168
                        ? `${(dayInEarthHours / 24).toFixed(1)} days`
                        : `${(dayInEarthHours / 24).toFixed(0)} days`}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 bg-black/95 backdrop-blur-sm rounded-lg border border-white/20 overflow-hidden min-w-[200px] max-h-[300px] overflow-y-auto z-50">
          {PLANET_ORDER.map((planet) => {
            const pInfo = PLANET_INFO[planet];
            const pSpeed = ORBITAL_VELOCITIES[planet];
            return (
              <button
                key={planet}
                onClick={() => {
                  onChange(planet);
                  setIsOpen(false);
                }}
                className={`flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-white/10 transition-colors ${
                  planet === selected ? 'bg-blue-500/20 border-l-2 border-blue-400' : ''
                }`}
              >
                <img
                  src={PLANET_ICON_TEXTURES[planet]}
                  alt={planet}
                  className="w-6 h-6 rounded-full object-cover"
                />
                <div className="flex-1">
                  <div className="text-white text-sm">{planet}</div>
                  <div className="text-[9px] text-white/40">
                    {planet === 'Sun' ? 'Center' : `${pSpeed.toFixed(1)} km/s`}
                    {planet === 'Moon' && ' (around Earth)'}
                    {planet !== 'Sun' &&
                      planet !== 'Moon' &&
                      ` | ${pInfo.distanceAU.toFixed(2)} AU`}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
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
  if (!el) return null;

  const points = useMemo(() => {
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
  }, [
    planetPosition[0],
    planetPosition[1],
    planetPosition[2],
    sunPosition[0],
    sunPosition[1],
    sunPosition[2],
  ]);

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
  }, [
    planet.x,
    planet.y,
    planet.z,
    sunPosition[0],
    sunPosition[1],
    sunPosition[2],
    elements,
    trailLength,
  ]);

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
      {/* Sun positioned using floating-origin coordinates */}
      <Sun size={sunSize} position={sunPos} />

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
            return (
              <OrbitFromElements
                key={`orbit-${planet.name}`}
                planetName={planet.name}
                planetPosition={[planet.x, planet.y, planet.z]}
                sunPosition={sunPos}
                color={isEarth ? '#4488cc' : elements?.color || planet.color}
                opacity={isEarth ? 0.5 : 0.2}
                lineWidth={isEarth ? 1.5 : 1}
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

          return (
            <group position={[earthPos.x, earthPos.y, earthPos.z]}>
              {/* Moon orbit line */}
              <Line
                points={orbitPoints}
                color="#aaaaaa"
                lineWidth={0.5}
                opacity={0.25}
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
 * Preset display info.
 * Simplified to only two presets: Scholar (educational) and True Scale (accurate).
 * Other presets are kept in the RENDER_PRESETS for potential future use.
 */
const PRESET_INFO: Partial<
  Record<PresetName, { label: string; description: string; note?: string; color: string }>
> = {
  schoolModel: {
    label: 'Scholar',
    description: 'Compressed sizes and distances',
    note: 'Best for overview',
    color: '#60a5fa', // blue
  },
  trueSizes: {
    label: 'True Sizes',
    description: 'Real planet relative sizes',
    note: 'Compressed distances to prevent overlap',
    color: '#a855f7', // purple
  },
  truePhysical: {
    label: 'True Scale',
    description: 'Geometrically Accurate',
    note: 'Planet sizes are much smaller than distances',
    color: '#22c55e', // green
  },
};

/**
 * Ordered list of visible presets.
 */
const VISIBLE_PRESETS: PresetName[] = ['schoolModel', 'trueSizes', 'truePhysical'];

/**
 * Scene options panel with preset selector.
 * Uses presets instead of independent distance/size toggles to prevent
 * mathematically impossible scale combinations.
 */
function SceneOptionsPanel({
  preset,
  onPresetChange,
  showTrails,
  onShowTrailsChange,
  showDistances,
  onShowDistancesChange,
  showBelts,
  onShowBeltsChange,
  showAxes,
  onShowAxesChange,
}: {
  preset: PresetName;
  onPresetChange: (p: PresetName) => void;
  showTrails: boolean;
  onShowTrailsChange: (v: boolean) => void;
  showDistances: boolean;
  onShowDistancesChange: (v: boolean) => void;
  showBelts: boolean;
  onShowBeltsChange: (v: boolean) => void;
  showAxes: boolean;
  onShowAxesChange: (v: boolean) => void;
}) {
  const [isCollapsed, setIsCollapsed] = useState(true);

  // Collapsed mobile view - just a settings button
  const MobileToggle = () => (
    <button
      onClick={() => setIsCollapsed(!isCollapsed)}
      className="sm:hidden bg-black/70 backdrop-blur-sm rounded-lg border border-white/20 p-2.5 flex items-center gap-2"
      aria-label="Toggle settings"
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
      <span className="text-xs text-white/70">Settings</span>
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
    <div className="absolute top-20 left-4 flex flex-col gap-2">
      {/* Mobile: collapsible toggle */}
      <MobileToggle />

      {/* Desktop: always visible, Mobile: collapsible */}
      <div className={`flex flex-col gap-2 ${isCollapsed ? 'hidden sm:flex' : 'flex'}`}>
        {/* Preset selector */}
        <div className="bg-black/70 backdrop-blur-sm rounded-lg border border-white/20 p-2">
          <div className="text-[9px] text-white/40 uppercase tracking-wider mb-1.5 px-1">
            Visual Mode
          </div>
          <div className="flex flex-col gap-1">
            {VISIBLE_PRESETS.map((presetName) => {
              const info = PRESET_INFO[presetName];
              if (!info) return null;
              const isSelected = preset === presetName;
              return (
                <button
                  key={presetName}
                  onClick={() => onPresetChange(presetName)}
                  className={`flex flex-col items-start px-2 py-1.5 rounded text-xs transition-colors ${
                    isSelected
                      ? 'bg-white/10 border'
                      : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                  style={{
                    borderColor: isSelected ? info.color : 'transparent',
                    color: isSelected ? info.color : undefined,
                  }}
                  title={info.description}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full border-2 flex items-center justify-center"
                      style={{ borderColor: isSelected ? info.color : '#ffffff40' }}
                    >
                      {isSelected && (
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: info.color }}
                        />
                      )}
                    </span>
                    <span className="font-medium">{info.label}</span>
                  </div>
                  {isSelected && (
                    <div className="flex flex-col ml-5 mt-0.5">
                      <span className="text-[9px] text-white/40">{info.description}</span>
                      {info.note && (
                        <span className="text-[8px] text-white/30 mt-0.5 max-w-[140px] leading-tight">
                          {info.note}
                        </span>
                      )}
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
            Display
          </div>
          <div className="flex flex-col gap-1">
            {/* Orbital trails toggle */}
            <button
              onClick={() => onShowTrailsChange(!showTrails)}
              className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors ${
                showTrails
                  ? 'text-blue-300'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              <span
                className="w-4 h-4 rounded border flex items-center justify-center"
                style={{ borderColor: showTrails ? '#60a5fa' : '#ffffff40' }}
              >
                {showTrails && (
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
              <span>Orbital Trails</span>
            </button>

            {/* Distance labels toggle */}
            <button
              onClick={() => onShowDistancesChange(!showDistances)}
              className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors ${
                showDistances
                  ? 'text-cyan-300'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
              title="Show real distances in AU and light travel time"
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
              <span>Distance (AU)</span>
            </button>

            {/* Asteroid belts toggle */}
            <button
              onClick={() => onShowBeltsChange(!showBelts)}
              className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors ${
                showBelts
                  ? 'text-amber-300'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
              title="Show main asteroid belt and Kuiper belt"
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
              <span>Asteroid Belts</span>
            </button>

            {/* Rotation axes toggle */}
            <button
              onClick={() => onShowAxesChange(!showAxes)}
              className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors ${
                showAxes
                  ? 'text-purple-300'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
              title="Show rotation axis on selected planet"
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
              <span>Rotation Axis</span>
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
            Pinch to zoom, drag to rotate
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Spin mode: Same as Orbit mode but without orbit lines.
 * Shows all planets with their positions, just no orbital paths.
 */
function SpinModeView({
  showTrails,
  showBelts,
  showDistances,
  showAxes,
  selectedPlanet,
  preset,
  date,
  onPlanetClick,
}: {
  showTrails: boolean;
  showBelts: boolean;
  showDistances: boolean;
  showAxes: boolean;
  selectedPlanet: string;
  preset: PresetName;
  date: Date;
  onPlanetClick?: (name: string) => void;
}) {
  // Reuse solar system but without orbit lines
  return (
    <SolarSystemWithOrbits
      showOrbits={false}
      showTrails={showTrails}
      showBelts={showBelts}
      showDistances={showDistances}
      showAxes={showAxes}
      selectedPlanet={selectedPlanet}
      preset={preset}
      date={date}
      onPlanetClick={onPlanetClick}
    />
  );
}

/**
 * CMB mode view.
 */
function CMBModeView({ latitude, longitude }: { latitude: number; longitude: number }) {
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
        <div className="text-[8px] text-red-300/70 whitespace-nowrap">CMB Rest Frame</div>
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
 * Default zoom level in "target radii" units.
 * This makes the target body fill a reasonable portion of the view.
 */
/**
 * Zoom distance in "target radii" units, per preset.
 * Smaller = closer to planet, fills more of viewport.
 */
const ZOOM_RADII_BY_PRESET: Record<string, number> = {
  schoolModel: 4, // Scholar: closer view, planet fills viewport
  trueSizes: 4, // True Sizes: similar to Scholar
  truePhysical: 3, // True Scale: very close since planets are tiny
};
const DEFAULT_ZOOM_RADII = 5;

/**
 * Main scene content.
 */
function SceneContent({
  mode,
  latitude,
  longitude,
  selectedPlanet,
  onPlanetSelect,
  preset,
  showTrails,
  showDistances,
  showBelts,
  showAxes,
  date,
}: SceneProps & {
  selectedPlanet: SelectedPlanet;
  onPlanetSelect: (name: SelectedPlanet) => void;
  preset: PresetName;
  showTrails: boolean;
  showDistances: boolean;
  showBelts: boolean;
  showAxes: boolean;
  date: Date;
}) {
  // Get planet data for radius and Sun direction calculation
  const { targetBodyRadius, sunDirection } = useMemo(() => {
    const planets = getPlanetPositionsWithPreset(new Date(), preset);
    const moon = getMoonPositionWithPreset(new Date(), preset);
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
  }, [selectedPlanet, preset]);

  // Handler for planet click (two-way binding)
  const handlePlanetClick = useCallback(
    (name: string) => {
      if (BODY_ORDER.includes(name as SelectedBody)) {
        onPlanetSelect(name as SelectedPlanet);
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
      // Camera distance = zoomRadii * targetRadius
      // Use preset-specific zoom for better framing
      const zoomRadii = ZOOM_RADII_BY_PRESET[preset] || DEFAULT_ZOOM_RADII;

      // Minimum camera distance - smaller for True Scale to see tiny planets
      const minCamDist = preset === 'truePhysical' ? 0.001 : 0.08;
      const camDist = Math.max(targetBodyRadius * zoomRadii, minCamDist);

      // Position camera to see the sunlit side of the planet
      // Camera is placed between Sun and planet (slightly offset), looking at planet
      if (selectedPlanet !== 'Sun') {
        const [sx, , sz] = sunDirection;

        // Camera position: in the Sun's direction from the planet, offset to the side and above
        // This ensures we see the lit hemisphere
        return {
          position: [
            sx * camDist * 0.7 + camDist * 0.3, // Toward Sun + offset right
            camDist * 0.4, // Above
            sz * camDist * 0.7 + camDist * 0.3, // Toward Sun + offset
          ] as [number, number, number],
          lookAt: [0, 0, 0] as [number, number, number],
          fov: 45,
          targetRadius: targetBodyRadius,
        };
      }

      // Sun selected: default angle
      return {
        position: [camDist * 0.6, camDist * 0.35, camDist * 0.75] as [
          number,
          number,
          number,
        ],
        lookAt: [0, 0, 0] as [number, number, number],
        fov: 45,
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

  return (
    <>
      <ambientLight intensity={0.3} />
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
          showTrails={showTrails}
          showBelts={showBelts}
          showDistances={showDistances}
          showAxes={showAxes}
          selectedPlanet={selectedPlanet}
          preset={preset}
          date={date}
          onPlanetClick={handlePlanetClick}
        />
      )}

      {/* ORBIT MODE - Solar system view with orbits */}
      {mode === 'orbit' && (
        <SolarSystemWithOrbits
          showOrbits={true}
          showTrails={showTrails}
          showBelts={showBelts}
          showDistances={showDistances}
          showAxes={showAxes}
          selectedPlanet={selectedPlanet}
          preset={preset}
          date={date}
          onPlanetClick={handlePlanetClick}
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
        // Semantic zoom limits: expressed in target radii
        // minDistance: can zoom to 2x target radius (close surface view)
        // maxDistance: can zoom out to 500x target radius (context view)
        minDistance={Math.max(
          (cameraConfig.targetRadius || 0.01) * 2,
          cameraClipping.near * 2
        )}
        maxDistance={Math.max((cameraConfig.targetRadius || 0.01) * 500, 30)}
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
 * Equatorial rotation speeds in km/h for each body.
 * Source: NASA Planetary Fact Sheets
 * https://nssdc.gsfc.nasa.gov/planetary/factsheet/
 */
const ROTATION_SPEEDS_KMH: Record<string, number> = {
  Sun: 7189, // At equator (~25 day period)
  Mercury: 10.83, // Very slow rotation
  Venus: 6.52, // Retrograde, very slow
  Earth: 1674.4, // ~465 m/s at equator
  Mars: 868.22, // Similar day length to Earth
  Jupiter: 45583, // Fast rotation despite size
  Saturn: 36840, // Also fast rotation
  Uranus: 9320, // Tilted rotation
  Neptune: 9719, // Similar to Uranus
};

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
 * Format date and time for display (local time).
 */
function formatDateTime(date: Date): string {
  return (
    date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }) +
    ' ' +
    date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  );
}

/**
 * Date and time slider component for time travel through solar system history.
 * Displays local time to user, but Date object uses UTC internally for calculations.
 */
function DateSlider({ date, onChange }: { date: Date; onChange: (d: Date) => void }) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Date range: 1900 to 2100
  const minDate = new Date('1900-01-01T00:00:00');
  const maxDate = new Date('2100-12-31T23:59:59');
  const minTime = minDate.getTime();
  const maxTime = maxDate.getTime();

  const sliderValue = date.getTime();

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseInt(e.target.value, 10);
    onChange(new Date(newTime));
  };

  const handleDateInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Preserve the current time when changing date
    const [year, month, day] = e.target.value.split('-').map(Number);
    const newDate = new Date(date);
    newDate.setFullYear(year, month - 1, day);
    if (!isNaN(newDate.getTime())) {
      onChange(newDate);
    }
  };

  const handleTimeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const [hours, minutes] = e.target.value.split(':').map(Number);
    const newDate = new Date(date);
    newDate.setHours(hours, minutes, 0, 0);
    if (!isNaN(newDate.getTime())) {
      onChange(newDate);
    }
  };

  const setNow = () => onChange(new Date());

  // Format for date input (YYYY-MM-DD)
  const dateInputValue = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  // Format for time input (HH:MM)
  const timeInputValue = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

  return (
    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
      {/* Date/time display button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="bg-black/70 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/20 hover:bg-black/80 transition-colors flex items-center gap-2"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-white/60"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        <span className="text-white text-sm font-medium">{formatDateTime(date)}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`text-white/60 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {/* Expanded slider panel */}
      {isExpanded && (
        <div className="bg-black/80 backdrop-blur-sm px-4 py-3 rounded-lg border border-white/20 flex flex-col gap-3 min-w-[340px]">
          {/* Year slider */}
          <div className="flex flex-col gap-1">
            <div className="text-[9px] text-white/40 uppercase tracking-wider">Year</div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-white/50 w-8">1900</span>
              <input
                type="range"
                min={minTime}
                max={maxTime}
                value={sliderValue}
                onChange={handleSliderChange}
                className="flex-1 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <span className="text-[10px] text-white/50 w-8">2100</span>
            </div>
          </div>

          {/* Date and time inputs */}
          <div className="flex items-center gap-2">
            <div className="flex-1 flex flex-col gap-1">
              <div className="text-[9px] text-white/40 uppercase tracking-wider">
                Date
              </div>
              <input
                type="date"
                value={dateInputValue}
                onChange={handleDateInput}
                className="w-full bg-white/10 border border-white/20 rounded px-2 py-1.5 text-white text-sm outline-none focus:border-blue-400"
              />
            </div>
            <div className="w-24 flex flex-col gap-1">
              <div className="text-[9px] text-white/40 uppercase tracking-wider">
                Time
              </div>
              <input
                type="time"
                value={timeInputValue}
                onChange={handleTimeInput}
                className="w-full bg-white/10 border border-white/20 rounded px-2 py-1.5 text-white text-sm outline-none focus:border-blue-400"
              />
            </div>
            <div className="flex flex-col gap-1">
              <div className="text-[9px] text-white/40 uppercase tracking-wider">
                &nbsp;
              </div>
              <button
                onClick={setNow}
                className="px-3 py-1.5 bg-blue-500/30 hover:bg-blue-500/50 border border-blue-400/50 rounded text-blue-300 text-xs transition-colors whitespace-nowrap"
              >
                Now
              </button>
            </div>
          </div>

          {/* Description and exploration hint */}
          <div className="flex flex-col gap-1.5 pt-1 border-t border-white/10">
            <div className="text-[9px] text-blue-300/70 text-center flex items-center justify-center gap-1">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
              Change the date to see the solar system at that moment
            </div>
            <div className="text-[9px] text-white/30 text-center">
              Local time shown. Calculations use UTC ({date.toISOString().slice(0, 19)}Z)
            </div>
          </div>
        </div>
      )}

      {/* Exploration hint below date picker */}
      {!isExpanded && (
        <div className="text-[9px] text-white/40 text-center flex items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-full">
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
          <span className="hidden sm:inline">
            Click any planet to explore. Scroll to zoom.
          </span>
          <span className="sm:hidden">Tap planets. Pinch to zoom.</span>
        </div>
      )}
    </div>
  );
}

/**
 * Get speed info based on mode and selected planet.
 */
function getSpeedInfo(
  mode: ReferenceFrame,
  selectedPlanet: SelectedPlanet,
  latitude: number = 0
): { speed: number; unit: string; label: string; color: string } {
  const planetInfo = PLANET_INFO[selectedPlanet];
  const orbitalSpeed = ORBITAL_VELOCITIES[selectedPlanet];

  switch (mode) {
    case 'spin':
      return {
        speed: getRotationVelocityKmh(selectedPlanet, latitude),
        unit: 'km/h',
        label: `${planetInfo.label} Rotation`,
        color: planetInfo.color,
      };
    case 'orbit':
      return {
        speed: orbitalSpeed,
        unit: 'km/s',
        label: `${planetInfo.label} Orbit`,
        color: planetInfo.color,
      };
    case 'galaxy':
      return { speed: 220, unit: 'km/s', label: 'Galactic Orbit', color: '#cc88ff' };
    case 'cmb':
      return { speed: 369.82, unit: 'km/s', label: 'CMB Motion', color: '#ff6b6b' };
    default:
      return { speed: 0, unit: 'km/s', label: '', color: '#ffffff' };
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
const GL_CONFIG = { antialias: true, alpha: true, logarithmicDepthBuffer: true };
const SHADOW_CONFIG = { enabled: true, type: THREE.PCFSoftShadowMap } as const;

export default function Scene({ mode, latitude, longitude = 0 }: SceneProps) {
  const [selectedPlanet, setSelectedPlanet] = useState<SelectedPlanet>('Earth');
  const [preset, setPreset] = useState<PresetName>('schoolModel');
  const [showTrails, setShowTrails] = useState(true);
  const [showDistances, setShowDistances] = useState(false);
  const [showBelts, setShowBelts] = useState(false);
  const [showAxes, setShowAxes] = useState(true); // Show rotation axes by default
  // Initialize viewDate directly - this is a client component so Date() is safe
  const [viewDate, setViewDate] = useState<Date>(() => new Date());
  const [isLiveTime, setIsLiveTime] = useState(true);
  const speedInfo = getSpeedInfo(mode, selectedPlanet, latitude);

  // Live time updates - only reacts to isLiveTime changes
  useEffect(() => {
    if (!isLiveTime) return;

    const interval = setInterval(() => {
      setViewDate(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, [isLiveTime]);

  // Handle manual date changes - stop live updates
  const handleDateChange = useCallback((newDate: Date) => {
    const now = new Date();
    const diff = Math.abs(now.getTime() - newDate.getTime());
    // If within 2 seconds of now, consider it "live"
    if (diff < 2000) {
      setIsLiveTime(true);
    } else {
      setIsLiveTime(false);
    }
    setViewDate(newDate);
  }, []);

  return (
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
          <Suspense fallback={null}>
            <SceneContent
              mode={mode}
              latitude={latitude}
              longitude={longitude}
              selectedPlanet={selectedPlanet}
              onPlanetSelect={setSelectedPlanet}
              preset={preset}
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
          {/* Speed HUD - top right */}
          <div className="pointer-events-auto">
            <SpeedHUD {...speedInfo} />
          </div>

          {/* Scene options panel - top left, below title */}
          {(mode === 'orbit' || mode === 'spin') && (
            <div className="pointer-events-auto">
              <SceneOptionsPanel
                preset={preset}
                onPresetChange={setPreset}
                showTrails={showTrails}
                onShowTrailsChange={setShowTrails}
                showDistances={showDistances}
                onShowDistancesChange={setShowDistances}
                showBelts={showBelts}
                onShowBeltsChange={setShowBelts}
                showAxes={showAxes}
                onShowAxesChange={setShowAxes}
              />
            </div>
          )}

          {/* Planet selector - moved to top right, below speed HUD */}
          {(mode === 'orbit' || mode === 'spin') && (
            <div className="pointer-events-auto absolute top-24 right-4">
              <PlanetSelector
                selected={selectedPlanet}
                onChange={setSelectedPlanet}
                viewDate={viewDate}
              />
            </div>
          )}

          {/* Date slider - bottom center, above mode selector */}
          {(mode === 'orbit' || mode === 'spin') && (
            <div className="pointer-events-auto">
              <DateSlider date={viewDate} onChange={handleDateChange} />
            </div>
          )}

          {/* Scale note - bottom left corner */}
          {(mode === 'orbit' || mode === 'spin' || mode === 'galaxy') && (
            <div className="absolute bottom-20 left-4 text-[8px] text-neutral-500 hidden sm:block">
              Ephemerides: Astronomy Engine (VSOP87)
            </div>
          )}
        </div>
      </div>
    </RenderProfileProvider>
  );
}
