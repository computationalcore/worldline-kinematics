/**
 * Ring system data for giant planets.
 */

import type { RingedBodyId, RingSystem, RingComponent } from '../types';

/**
 * PDS Ring-Moon Systems Node base URL.
 */
const PDS_RINGS_BASE = 'https://pds-rings.seti.org';

// ---------------------------
// Saturn Ring System
// ---------------------------

/**
 * Saturn's ring components.
 * Most detailed ring system in the solar system.
 * Radii measured from Saturn's center.
 */
const SATURN_RINGS: RingComponent[] = [
  {
    name: 'D Ring',
    innerRadiusKm: 66_900,
    outerRadiusKm: 74_510,
    opticalDepth: 0.001,
    source: `${PDS_RINGS_BASE}/saturn/saturn_rings_table.html`,
  },
  {
    name: 'C Ring (Crepe Ring)',
    innerRadiusKm: 74_658,
    outerRadiusKm: 92_000,
    opticalDepth: 0.1,
    source: `${PDS_RINGS_BASE}/saturn/saturn_rings_table.html`,
  },
  {
    name: 'B Ring',
    innerRadiusKm: 92_000,
    outerRadiusKm: 117_580,
    opticalDepth: 1.5, // densest ring
    source: `${PDS_RINGS_BASE}/saturn/saturn_rings_table.html`,
  },
  {
    name: 'Cassini Division',
    innerRadiusKm: 117_580,
    outerRadiusKm: 122_170,
    opticalDepth: 0.1, // not empty, just sparse
    source: `${PDS_RINGS_BASE}/saturn/saturn_rings_table.html`,
  },
  {
    name: 'A Ring',
    innerRadiusKm: 122_170,
    outerRadiusKm: 136_775,
    opticalDepth: 0.5,
    source: `${PDS_RINGS_BASE}/saturn/saturn_rings_table.html`,
  },
  {
    name: 'Encke Gap',
    innerRadiusKm: 133_589,
    outerRadiusKm: 133_923,
    opticalDepth: 0,
    source: `${PDS_RINGS_BASE}/saturn/saturn_rings_table.html`,
  },
  {
    name: 'F Ring',
    innerRadiusKm: 140_180,
    outerRadiusKm: 140_680,
    opticalDepth: 0.1,
    source: `${PDS_RINGS_BASE}/saturn/saturn_rings_table.html`,
  },
  {
    name: 'G Ring',
    innerRadiusKm: 166_000,
    outerRadiusKm: 175_000,
    opticalDepth: 0.000001,
    source: `${PDS_RINGS_BASE}/saturn/saturn_rings_table.html`,
  },
  {
    name: 'E Ring',
    innerRadiusKm: 181_000,
    outerRadiusKm: 483_000,
    opticalDepth: 0.00001, // very diffuse
    source: `${PDS_RINGS_BASE}/saturn/saturn_rings_table.html`,
  },
];

// ---------------------------
// Jupiter Ring System
// ---------------------------

/**
 * Jupiter's ring components.
 * Faint ring system discovered by Voyager 1 in 1979.
 */
const JUPITER_RINGS: RingComponent[] = [
  {
    name: 'Halo Ring',
    innerRadiusKm: 92_000,
    outerRadiusKm: 122_500,
    opticalDepth: 0.00001,
    source: `${PDS_RINGS_BASE}/jupiter/jupiter_rings_table.html`,
  },
  {
    name: 'Main Ring',
    innerRadiusKm: 122_500,
    outerRadiusKm: 129_000,
    opticalDepth: 0.000003,
    source: `${PDS_RINGS_BASE}/jupiter/jupiter_rings_table.html`,
  },
  {
    name: 'Amalthea Gossamer Ring',
    innerRadiusKm: 129_000,
    outerRadiusKm: 182_000,
    opticalDepth: 0.0000001,
    source: `${PDS_RINGS_BASE}/jupiter/jupiter_rings_table.html`,
  },
  {
    name: 'Thebe Gossamer Ring',
    innerRadiusKm: 129_000,
    outerRadiusKm: 226_000,
    opticalDepth: 0.0000001,
    source: `${PDS_RINGS_BASE}/jupiter/jupiter_rings_table.html`,
  },
];

// ---------------------------
// Uranus Ring System
// ---------------------------

/**
 * Uranus ring components.
 * Discovered in 1977 via stellar occultation.
 * Notable for being nearly vertical (97.77 degree axial tilt).
 */
const URANUS_RINGS: RingComponent[] = [
  {
    name: 'Zeta Ring (1986U2R)',
    innerRadiusKm: 37_000,
    outerRadiusKm: 39_500,
    opticalDepth: 0.0001,
    source: `${PDS_RINGS_BASE}/uranus/uranus_rings_table.html`,
  },
  {
    name: '6 Ring',
    innerRadiusKm: 41_837,
    outerRadiusKm: 41_840,
    opticalDepth: 0.3,
    source: `${PDS_RINGS_BASE}/uranus/uranus_rings_table.html`,
  },
  {
    name: '5 Ring',
    innerRadiusKm: 42_234,
    outerRadiusKm: 42_237,
    opticalDepth: 0.5,
    source: `${PDS_RINGS_BASE}/uranus/uranus_rings_table.html`,
  },
  {
    name: '4 Ring',
    innerRadiusKm: 42_570,
    outerRadiusKm: 42_573,
    opticalDepth: 0.3,
    source: `${PDS_RINGS_BASE}/uranus/uranus_rings_table.html`,
  },
  {
    name: 'Alpha Ring',
    innerRadiusKm: 44_718,
    outerRadiusKm: 44_728,
    opticalDepth: 0.4,
    source: `${PDS_RINGS_BASE}/uranus/uranus_rings_table.html`,
  },
  {
    name: 'Beta Ring',
    innerRadiusKm: 45_661,
    outerRadiusKm: 45_672,
    opticalDepth: 0.3,
    source: `${PDS_RINGS_BASE}/uranus/uranus_rings_table.html`,
  },
  {
    name: 'Eta Ring',
    innerRadiusKm: 47_175,
    outerRadiusKm: 47_177,
    opticalDepth: 0.4,
    source: `${PDS_RINGS_BASE}/uranus/uranus_rings_table.html`,
  },
  {
    name: 'Gamma Ring',
    innerRadiusKm: 47_627,
    outerRadiusKm: 47_631,
    opticalDepth: 0.7,
    source: `${PDS_RINGS_BASE}/uranus/uranus_rings_table.html`,
  },
  {
    name: 'Delta Ring',
    innerRadiusKm: 48_300,
    outerRadiusKm: 48_304,
    opticalDepth: 0.5,
    source: `${PDS_RINGS_BASE}/uranus/uranus_rings_table.html`,
  },
  {
    name: 'Lambda Ring',
    innerRadiusKm: 50_023,
    outerRadiusKm: 50_025,
    opticalDepth: 0.1,
    source: `${PDS_RINGS_BASE}/uranus/uranus_rings_table.html`,
  },
  {
    name: 'Epsilon Ring',
    innerRadiusKm: 51_149,
    outerRadiusKm: 51_158,
    opticalDepth: 2.0, // densest Uranian ring
    source: `${PDS_RINGS_BASE}/uranus/uranus_rings_table.html`,
  },
];

// ---------------------------
// Neptune Ring System
// ---------------------------

/**
 * Neptune ring components.
 * Faint ring system with unique "arcs" in Adams ring.
 */
const NEPTUNE_RINGS: RingComponent[] = [
  {
    name: 'Galle Ring',
    innerRadiusKm: 41_900,
    outerRadiusKm: 42_900,
    opticalDepth: 0.00008,
    source: `${PDS_RINGS_BASE}/neptune/neptune_rings_table.html`,
  },
  {
    name: 'Le Verrier Ring',
    innerRadiusKm: 53_200,
    outerRadiusKm: 53_300,
    opticalDepth: 0.002,
    source: `${PDS_RINGS_BASE}/neptune/neptune_rings_table.html`,
  },
  {
    name: 'Lassell Ring',
    innerRadiusKm: 53_200,
    outerRadiusKm: 57_200,
    opticalDepth: 0.00015,
    source: `${PDS_RINGS_BASE}/neptune/neptune_rings_table.html`,
  },
  {
    name: 'Arago Ring',
    innerRadiusKm: 57_200,
    outerRadiusKm: 57_400,
    opticalDepth: 0.0001,
    source: `${PDS_RINGS_BASE}/neptune/neptune_rings_table.html`,
  },
  {
    name: 'Adams Ring',
    innerRadiusKm: 62_932,
    outerRadiusKm: 62_947,
    opticalDepth: 0.004, // contains ring arcs
    source: `${PDS_RINGS_BASE}/neptune/neptune_rings_table.html`,
  },
];

// ---------------------------
// Complete Ring Systems
// ---------------------------

/**
 * All ring systems indexed by body ID.
 */
export const RING_SYSTEMS: Record<RingedBodyId, RingSystem> = {
  Jupiter: {
    bodyId: 'Jupiter',
    components: JUPITER_RINGS,
    inclination: 3.13, // Jupiter's obliquity
  },
  Saturn: {
    bodyId: 'Saturn',
    components: SATURN_RINGS,
    inclination: 26.73, // Saturn's obliquity
  },
  Uranus: {
    bodyId: 'Uranus',
    components: URANUS_RINGS,
    inclination: 97.77, // Uranus's extreme tilt
  },
  Neptune: {
    bodyId: 'Neptune',
    components: NEPTUNE_RINGS,
    inclination: 28.32, // Neptune's obliquity
  },
};

/**
 * Get main visible rings for simplified rendering.
 * Returns the most prominent rings suitable for distant viewing.
 */
export function getMainVisibleRings(bodyId: RingedBodyId): RingComponent[] {
  switch (bodyId) {
    case 'Saturn':
      // Return the main visible rings (C, B, Cassini, A)
      return SATURN_RINGS.filter((r) =>
        ['C Ring (Crepe Ring)', 'B Ring', 'Cassini Division', 'A Ring'].includes(r.name)
      );
    case 'Jupiter':
      return JUPITER_RINGS.filter((r) => r.name === 'Main Ring');
    case 'Uranus':
      return URANUS_RINGS.filter((r) => r.name === 'Epsilon Ring');
    case 'Neptune':
      return NEPTUNE_RINGS.filter((r) => r.name === 'Adams Ring');
    default:
      return [];
  }
}

/**
 * Get ring extent (innermost to outermost) in km.
 */
export function getRingExtent(bodyId: RingedBodyId): { inner: number; outer: number } {
  const system = RING_SYSTEMS[bodyId];
  if (!system || system.components.length === 0) {
    return { inner: 0, outer: 0 };
  }

  const inner = Math.min(...system.components.map((c) => c.innerRadiusKm));
  const outer = Math.max(...system.components.map((c) => c.outerRadiusKm));
  return { inner, outer };
}
