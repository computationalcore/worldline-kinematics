/**
 * Scene constants for solar system visualization.
 */

import type { PresetName } from '../../utils/planetaryPositions';

/**
 * Available selectable bodies in the solar system view.
 */
export type SelectedBody =
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

/**
 * Order of bodies in the selector UI.
 */
export const BODY_ORDER: SelectedBody[] = [
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

/**
 * Body texture paths for selector icons.
 */
export const BODY_ICON_TEXTURES: Record<string, string> = {
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

/**
 * Orbital velocities in km/s for each body.
 * Source: NASA Planetary Fact Sheets
 * https://nssdc.gsfc.nasa.gov/planetary/factsheet/
 */
export const ORBITAL_VELOCITIES: Record<string, number> = {
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
 * Planetary info type for comprehensive data.
 */
export interface PlanetInfo {
  label: string;
  color: string;
  massKg: number;
  massEarth: number;
  diameterKm: number;
  rotationPeriodHours: number;
  dayLengthHours: number;
  distanceAU: number;
  orbitalPeriodDays: number;
  moons: number;
  rings: boolean;
  type: string;
}

/**
 * Comprehensive planetary data for the selector.
 * Sources: NASA Planetary Fact Sheets
 * https://nssdc.gsfc.nasa.gov/planetary/factsheet/
 */
export const PLANET_INFO: Record<string, PlanetInfo> = {
  Sun: {
    label: 'Sun',
    color: '#ffd27d',
    massKg: 1.989e30,
    massEarth: 332946,
    diameterKm: 1392700,
    rotationPeriodHours: 609.12,
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
    rotationPeriodHours: 1407.6,
    dayLengthHours: 4222.6,
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
    rotationPeriodHours: -5832.5,
    dayLengthHours: 2802,
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
    rotationPeriodHours: -17.24,
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
    rotationPeriodHours: 655.7,
    dayLengthHours: 708.7,
    distanceAU: 0.00257,
    orbitalPeriodDays: 27.32,
    moons: 0,
    rings: false,
    type: 'Moon',
  },
};

/**
 * Equatorial rotation speeds in km/h.
 * Source: NASA Planetary Fact Sheets
 * https://nssdc.gsfc.nasa.gov/planetary/factsheet/
 */
export const ROTATION_SPEEDS_KMH: Record<string, number> = {
  Sun: 7189,
  Mercury: 10.83,
  Venus: 6.52,
  Earth: 1674.4,
  Mars: 868.22,
  Jupiter: 45583,
  Saturn: 36840,
  Uranus: 9320,
  Neptune: 9719,
};

/**
 * Preset info type for display configuration.
 */
export interface PresetDisplayInfo {
  label: string;
  description: string;
  note?: string;
  color: string;
}

/**
 * Preset display info.
 */
export const PRESET_INFO: Partial<Record<PresetName, PresetDisplayInfo>> = {
  schoolModel: {
    label: 'Scholar',
    description: 'Compressed sizes and distances',
    note: 'Best for overview',
    color: '#60a5fa',
  },
  trueSizes: {
    label: 'True Size',
    description: 'Real planet relative sizes',
    note: 'Logarithmic distances',
    color: '#a855f7',
  },
  truePhysical: {
    label: 'True Scale',
    description: 'Geometrically accurate',
    note: 'Real sizes and distances',
    color: '#22c55e',
  },
};

/**
 * Ordered list of visible presets.
 */
export const VISIBLE_PRESETS: PresetName[] = ['schoolModel', 'trueSizes', 'truePhysical'];
