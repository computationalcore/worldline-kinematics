/**
 * Physical properties of solar system bodies.
 */

import type { BodyId, BodyPhysicalProps } from '../types';

/**
 * JPL SSD Physical Parameters URL.
 * Primary source for all planetary physical properties.
 */
const JPL_SSD_PHYS_PAR = 'https://ssd.jpl.nasa.gov/planets/phys_par.html';

/**
 * NASA Planetary Fact Sheets URL.
 */
const NASA_FACT_SHEET = 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/';

/**
 * Physical properties for all bodies.
 *
 * Notes on data quality:
 * - Sun: IAU 2015 nominal values
 * - Planets: JPL SSD, uncertainties typically <0.1%
 * - Moon: NASA GSFC, high precision from laser ranging
 */
export const BODY_PHYSICAL: Record<BodyId, BodyPhysicalProps> = {
  Sun: {
    id: 'Sun',
    radiusMeanKm: 696_340,
    radiusEquatorialKm: 696_340,
    massKg: 1.98892e30,
    gmKm3s2: 1.32712440018e11,
    densityGcm3: 1.408,
    siderealRotationHours: 609.12, // ~25.38 days at equator
    obliquityDeg: 7.25, // to ecliptic
    source: JPL_SSD_PHYS_PAR,
  },

  Mercury: {
    id: 'Mercury',
    radiusMeanKm: 2_439.7,
    radiusEquatorialKm: 2_440.5,
    radiusPolarKm: 2_438.3,
    massKg: 3.3011e23,
    gmKm3s2: 2.2032e4,
    densityGcm3: 5.427,
    siderealRotationHours: 1407.6, // 58.646 days
    obliquityDeg: 0.034,
    source: JPL_SSD_PHYS_PAR,
  },

  Venus: {
    id: 'Venus',
    radiusMeanKm: 6_051.8,
    radiusEquatorialKm: 6_051.8,
    massKg: 4.8675e24,
    gmKm3s2: 3.24859e5,
    densityGcm3: 5.243,
    siderealRotationHours: -5832.5, // retrograde, 243.025 days
    obliquityDeg: 177.36, // nearly upside down
    source: JPL_SSD_PHYS_PAR,
  },

  Earth: {
    id: 'Earth',
    radiusMeanKm: 6_371.0,
    radiusEquatorialKm: 6_378.137,
    radiusPolarKm: 6_356.752,
    massKg: 5.9722e24,
    gmKm3s2: 3.986004418e5,
    densityGcm3: 5.514,
    siderealRotationHours: 23.9345, // sidereal day
    obliquityDeg: 23.4393,
    source: JPL_SSD_PHYS_PAR,
  },

  Moon: {
    id: 'Moon',
    radiusMeanKm: 1_737.4,
    radiusEquatorialKm: 1_738.1,
    radiusPolarKm: 1_736.0,
    massKg: 7.342e22,
    gmKm3s2: 4.9028695e3,
    densityGcm3: 3.344,
    siderealRotationHours: 655.728, // tidally locked, ~27.32 days
    obliquityDeg: 6.68, // to ecliptic
    source: NASA_FACT_SHEET,
  },

  Mars: {
    id: 'Mars',
    radiusMeanKm: 3_389.5,
    radiusEquatorialKm: 3_396.2,
    radiusPolarKm: 3_376.2,
    massKg: 6.4171e23,
    gmKm3s2: 4.282837e4,
    densityGcm3: 3.933,
    siderealRotationHours: 24.6229, // sol
    obliquityDeg: 25.19,
    source: JPL_SSD_PHYS_PAR,
  },

  Jupiter: {
    id: 'Jupiter',
    radiusMeanKm: 69_911,
    radiusEquatorialKm: 71_492,
    radiusPolarKm: 66_854,
    massKg: 1.8982e27,
    gmKm3s2: 1.26686534e8,
    densityGcm3: 1.326,
    siderealRotationHours: 9.925, // fastest rotating planet
    obliquityDeg: 3.13,
    source: JPL_SSD_PHYS_PAR,
  },

  Saturn: {
    id: 'Saturn',
    radiusMeanKm: 58_232,
    radiusEquatorialKm: 60_268,
    radiusPolarKm: 54_364,
    massKg: 5.6834e26,
    gmKm3s2: 3.7931187e7,
    densityGcm3: 0.687, // less dense than water
    siderealRotationHours: 10.656,
    obliquityDeg: 26.73,
    source: JPL_SSD_PHYS_PAR,
  },

  Uranus: {
    id: 'Uranus',
    radiusMeanKm: 25_362,
    radiusEquatorialKm: 25_559,
    radiusPolarKm: 24_973,
    massKg: 8.681e25,
    gmKm3s2: 5.793939e6,
    densityGcm3: 1.271,
    siderealRotationHours: -17.24, // retrograde
    obliquityDeg: 97.77, // nearly sideways
    source: JPL_SSD_PHYS_PAR,
  },

  Neptune: {
    id: 'Neptune',
    radiusMeanKm: 24_622,
    radiusEquatorialKm: 24_764,
    radiusPolarKm: 24_341,
    massKg: 1.02413e26,
    gmKm3s2: 6.836529e6,
    densityGcm3: 1.638,
    siderealRotationHours: 16.11,
    obliquityDeg: 28.32,
    source: JPL_SSD_PHYS_PAR,
  },
};

/**
 * Visual properties for rendering.
 * Colors are approximate averages from spacecraft imagery.
 * Textures are paths to 2K resolution maps.
 */
export interface BodyVisualProps {
  id: BodyId;
  /** Primary display color (hex) */
  color: string;
  /** Texture map path */
  texture?: string;
  /** Has visible rings */
  hasRings?: boolean;
}

export const BODY_VISUAL: Record<BodyId, BodyVisualProps> = {
  Sun: {
    id: 'Sun',
    color: '#ffd27d',
    texture: '/textures/2k_sun.jpg',
  },
  Mercury: {
    id: 'Mercury',
    color: '#b5b5b5',
    texture: '/textures/2k_mercury.jpg',
  },
  Venus: {
    id: 'Venus',
    color: '#e6c87a',
    texture: '/textures/2k_venus_surface.jpg',
  },
  Earth: {
    id: 'Earth',
    color: '#6b93d6',
    texture: '/textures/earth_daymap.jpg',
  },
  Moon: {
    id: 'Moon',
    color: '#aaaaaa',
    texture: '/textures/2k_moon.jpg',
  },
  Mars: {
    id: 'Mars',
    color: '#c1440e',
    texture: '/textures/2k_mars.jpg',
  },
  Jupiter: {
    id: 'Jupiter',
    color: '#d4a574',
    texture: '/textures/2k_jupiter.jpg',
    hasRings: true,
  },
  Saturn: {
    id: 'Saturn',
    color: '#f4d59e',
    texture: '/textures/2k_saturn.jpg',
    hasRings: true,
  },
  Uranus: {
    id: 'Uranus',
    color: '#b5e3e3',
    texture: '/textures/2k_uranus.jpg',
    hasRings: true,
  },
  Neptune: {
    id: 'Neptune',
    color: '#5b7fde',
    texture: '/textures/2k_neptune.jpg',
    hasRings: true,
  },
};

/**
 * Orbital velocities in km/s (mean orbital speed).
 * Source: NASA Planetary Fact Sheets.
 */
export const ORBITAL_VELOCITY_KMS: Record<BodyId, number> = {
  Sun: 0, // reference frame
  Mercury: 47.87,
  Venus: 35.02,
  Earth: 29.78,
  Moon: 1.022, // relative to Earth
  Mars: 24.07,
  Jupiter: 13.07,
  Saturn: 9.68,
  Uranus: 6.8,
  Neptune: 5.43,
};

/**
 * Equatorial rotation speeds in km/h.
 * Derived from radius and rotation period.
 * Source: NASA Planetary Fact Sheets.
 */
export const EQUATORIAL_ROTATION_KMH: Record<BodyId, number> = {
  Sun: 7189, // at equator
  Mercury: 10.83,
  Venus: 6.52, // retrograde
  Earth: 1674.4,
  Moon: 16.7,
  Mars: 868.22,
  Jupiter: 45583,
  Saturn: 36840,
  Uranus: 9320,
  Neptune: 9719,
};

/**
 * Semi-major axes in AU.
 * Source: JPL SSD.
 */
export const SEMI_MAJOR_AXIS_AU: Record<BodyId, number> = {
  Sun: 0,
  Mercury: 0.387,
  Venus: 0.723,
  Earth: 1.0,
  Moon: 0.00257, // from Earth
  Mars: 1.524,
  Jupiter: 5.203,
  Saturn: 9.537,
  Uranus: 19.19,
  Neptune: 30.07,
};

/**
 * Orbital inclinations in degrees (to ecliptic).
 * Source: JPL SSD.
 */
export const ORBITAL_INCLINATION_DEG: Record<BodyId, number> = {
  Sun: 0,
  Mercury: 7.005,
  Venus: 3.395,
  Earth: 0,
  Moon: 5.145, // to ecliptic
  Mars: 1.85,
  Jupiter: 1.303,
  Saturn: 2.489,
  Uranus: 0.773,
  Neptune: 1.77,
};
