/**
 * Asteroid and debris belt definitions.
 *
 * Sources:
 * - Main belt: LPI "Asteroids: New Challenges, New Targets"
 *   https://www.lpi.usra.edu/exploration/education/hsResearch/asteroid_101/
 * - Kuiper belt: NASA Science
 *   https://science.nasa.gov/solar-system/kuiper-belt/facts/
 * - Jupiter Trojans: NASA JPL Small-Body Database
 *   https://ssd.jpl.nasa.gov/
 */

import type { BeltDefinition } from '../types';

/**
 * Main asteroid belt between Mars and Jupiter.
 *
 * The belt is bounded by:
 * - Inner edge: ~2.06 AU (near Mars orbital zone)
 * - Outer edge: ~3.27 AU (near 2:1 Jupiter resonance)
 *
 * Major Kirkwood gaps occur at resonances with Jupiter.
 */
export const MAIN_ASTEROID_BELT: BeltDefinition = {
  name: 'Main Asteroid Belt',
  innerRadiusAu: 2.06,
  outerRadiusAu: 3.27,
  thicknessAu: 0.5, // typical z-extent above/below ecliptic
  inclinationSpreadDeg: 20, // 1-sigma inclination distribution
  source: 'https://www.lpi.usra.edu/exploration/education/hsResearch/asteroid_101/',
};

/**
 * Kuiper Belt beyond Neptune's orbit.
 *
 * The classical Kuiper Belt extends from:
 * - Inner edge: ~30 AU (Neptune's orbit)
 * - Outer edge: ~50 AU (approximate)
 *
 * The scattered disc extends further but is more diffuse.
 */
export const KUIPER_BELT: BeltDefinition = {
  name: 'Kuiper Belt',
  innerRadiusAu: 30,
  outerRadiusAu: 50,
  thicknessAu: 10, // more vertically extended than main belt
  inclinationSpreadDeg: 15,
  source: 'https://science.nasa.gov/solar-system/kuiper-belt/facts/',
};

/**
 * Scattered Disc (extended Kuiper Belt region).
 * Contains objects with highly elliptical orbits.
 */
export const SCATTERED_DISC: BeltDefinition = {
  name: 'Scattered Disc',
  innerRadiusAu: 30,
  outerRadiusAu: 100, // can extend much further
  thicknessAu: 30,
  inclinationSpreadDeg: 30,
  source: 'https://science.nasa.gov/solar-system/kuiper-belt/',
};

/**
 * Jupiter Trojans at L4 (leading) position.
 * Co-orbital asteroids 60 degrees ahead of Jupiter.
 */
export const JUPITER_TROJANS_L4: BeltDefinition = {
  name: 'Jupiter Trojans (L4 - Greek Camp)',
  innerRadiusAu: 5.0, // approximate extent around L4
  outerRadiusAu: 5.4,
  thicknessAu: 0.3,
  inclinationSpreadDeg: 15,
  source: 'https://ssd.jpl.nasa.gov/',
};

/**
 * Jupiter Trojans at L5 (trailing) position.
 * Co-orbital asteroids 60 degrees behind Jupiter.
 */
export const JUPITER_TROJANS_L5: BeltDefinition = {
  name: 'Jupiter Trojans (L5 - Trojan Camp)',
  innerRadiusAu: 5.0,
  outerRadiusAu: 5.4,
  thicknessAu: 0.3,
  inclinationSpreadDeg: 15,
  source: 'https://ssd.jpl.nasa.gov/',
};

/**
 * All belt definitions.
 */
export const ALL_BELTS: BeltDefinition[] = [
  MAIN_ASTEROID_BELT,
  KUIPER_BELT,
  SCATTERED_DISC,
  JUPITER_TROJANS_L4,
  JUPITER_TROJANS_L5,
];

/**
 * Generate random positions for belt visualization.
 * Creates a statistical distribution of points within the belt.
 *
 * @param belt - Belt definition
 * @param count - Number of points to generate
 * @param seed - Random seed for reproducibility
 * @returns Array of [x, y, z] positions in AU
 */
export function generateBeltPoints(
  belt: BeltDefinition,
  count: number,
  seed: number = 42
): Array<[number, number, number]> {
  const points: Array<[number, number, number]> = [];

  // Simple seeded random number generator (xorshift)
  let state = seed;
  const random = () => {
    state ^= state << 13;
    state ^= state >> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };

  const rInner = belt.innerRadiusAu;
  const rOuter = belt.outerRadiusAu;
  const rInnerSq = rInner * rInner;
  const rOuterSq = rOuter * rOuter;

  for (let i = 0; i < count; i++) {
    // Area-weighted radius distribution for uniform surface density
    // r = sqrt(rInner^2 + u * (rOuter^2 - rInner^2))
    const u = random();
    const r = Math.sqrt(rInnerSq + u * (rOuterSq - rInnerSq));

    // Uniform angle
    const theta = random() * Math.PI * 2;

    // Gaussian-ish inclination using Box-Muller
    // Guard against u1 = 0 which would give log(0) = -Infinity -> NaN
    const u1 = Math.max(random(), 1e-12);
    const u2 = random();
    const inclinationRad =
      (Math.sqrt(-2 * Math.log(u1)) *
        Math.cos(2 * Math.PI * u2) *
        belt.inclinationSpreadDeg *
        Math.PI) /
      180;

    // Convert to Cartesian
    const x = r * Math.cos(theta);
    const z = r * Math.sin(theta);
    const y = r * Math.sin(inclinationRad); // height above/below ecliptic

    points.push([x, y, z]);
  }

  return points;
}

/**
 * Generate Trojan asteroid positions around a Lagrange point.
 * Trojans librate around the L4/L5 points in a "banana" shaped region.
 *
 * @param jupiterAngle - Jupiter's current angle in radians
 * @param lagrangePoint - 'L4' (leading) or 'L5' (trailing)
 * @param count - Number of points
 * @param seed - Random seed
 */
export function generateTrojanPoints(
  jupiterAngle: number,
  lagrangePoint: 'L4' | 'L5',
  count: number,
  seed: number = 42
): Array<[number, number, number]> {
  const points: Array<[number, number, number]> = [];

  // L4 is 60 degrees ahead, L5 is 60 degrees behind
  const lagrangeOffset = lagrangePoint === 'L4' ? Math.PI / 3 : -Math.PI / 3;
  const centerAngle = jupiterAngle + lagrangeOffset;

  // Jupiter's semi-major axis
  const jupiterR = 5.2;

  // Simple seeded random
  let state = seed;
  const random = () => {
    state ^= state << 13;
    state ^= state >> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };

  for (let i = 0; i < count; i++) {
    // Spread in angle around Lagrange point (libration amplitude ~30 degrees typical)
    // Use Box-Muller for more realistic clustering near the center
    const u1 = Math.max(random(), 1e-12); // Guard against log(0)
    const u2 = random();
    const angleSpread =
      Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2) * (Math.PI / 6); // ~30 deg 1-sigma
    const angle = centerAngle + angleSpread;

    // Radial spread
    const r = jupiterR + (random() - 0.5) * 0.8;

    // Inclination
    const inclination = (random() - 0.5) * 0.3; // radians

    const x = r * Math.cos(angle);
    const z = r * Math.sin(angle);
    const y = r * Math.sin(inclination);

    points.push([x, y, z]);
  }

  return points;
}
