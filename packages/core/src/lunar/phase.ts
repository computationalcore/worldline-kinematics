/**
 * Lunar phase calculations.
 */

/**
 * Synodic month duration in days.
 * Source: USNO (https://aa.usno.navy.mil/faq/moon_phases)
 */
export const SYNODIC_MONTH_DAYS = 29.53058867;

/**
 * Reference new moon for phase calculations.
 * January 6, 2000 at 18:14 UTC.
 * Source: NASA Eclipse Website (https://eclipse.gsfc.nasa.gov/phase/phasecat.html)
 */
const REFERENCE_NEW_MOON = new Date(Date.UTC(2000, 0, 6, 18, 14, 0));

/**
 * Moon phase names in order of the lunar cycle.
 */
export type MoonPhaseName =
  | 'New Moon'
  | 'Waxing Crescent'
  | 'First Quarter'
  | 'Waxing Gibbous'
  | 'Full Moon'
  | 'Waning Gibbous'
  | 'Last Quarter'
  | 'Waning Crescent';

/**
 * Result of moon phase calculation.
 */
export interface MoonPhaseInfo {
  /** Phase name (e.g., "Full Moon", "Waxing Crescent") */
  phase: MoonPhaseName;
  /** Illumination percentage (0-100) */
  illumination: number;
  /** Age of current lunar cycle in days (0-29.53) */
  age: number;
  /** Unicode emoji for the phase */
  emoji: string;
}

/**
 * Phase boundaries in days from new moon.
 * Each phase spans approximately 3.69 days (29.53 / 8).
 */
const PHASE_BOUNDARIES = {
  newMoon: 1.85,
  waxingCrescent: 5.53,
  firstQuarter: 9.22,
  waxingGibbous: 12.91,
  fullMoon: 16.61,
  waningGibbous: 20.3,
  lastQuarter: 23.99,
  waningCrescent: 27.68,
};

/**
 * Unicode emoji symbols for each moon phase.
 */
const PHASE_EMOJIS: Record<MoonPhaseName, string> = {
  'New Moon': '\u{1F311}',
  'Waxing Crescent': '\u{1F312}',
  'First Quarter': '\u{1F313}',
  'Waxing Gibbous': '\u{1F314}',
  'Full Moon': '\u{1F315}',
  'Waning Gibbous': '\u{1F316}',
  'Last Quarter': '\u{1F317}',
  'Waning Crescent': '\u{1F318}',
};

/**
 * Calculates the moon phase for a given date.
 *
 * Uses a simple algorithm based on the synodic month (29.53 days) and a
 * known reference new moon. Accuracy is within a few hours for most dates.
 * For higher precision, use Astronomy Engine's MoonPhase function.
 *
 * @param date The date to calculate phase for
 * @returns Moon phase information including name, illumination, age, and emoji
 *
 * @example
 * ```ts
 * const phase = getMoonPhase(new Date('2024-01-25'));
 * // { phase: 'Full Moon', illumination: 99, age: 14.2, emoji: '...' }
 * ```
 */
export function getMoonPhase(date: Date): MoonPhaseInfo {
  const daysSinceNewMoon =
    (date.getTime() - REFERENCE_NEW_MOON.getTime()) / (1000 * 60 * 60 * 24);
  const age =
    ((daysSinceNewMoon % SYNODIC_MONTH_DAYS) + SYNODIC_MONTH_DAYS) % SYNODIC_MONTH_DAYS;

  // Calculate illumination (approximate using cosine)
  const cyclePosition = age / SYNODIC_MONTH_DAYS;
  const illumination = Math.round(
    ((1 - Math.cos(cyclePosition * 2 * Math.PI)) / 2) * 100
  );

  // Determine phase name based on age
  let phase: MoonPhaseName;
  if (age < PHASE_BOUNDARIES.newMoon) {
    phase = 'New Moon';
  } else if (age < PHASE_BOUNDARIES.waxingCrescent) {
    phase = 'Waxing Crescent';
  } else if (age < PHASE_BOUNDARIES.firstQuarter) {
    phase = 'First Quarter';
  } else if (age < PHASE_BOUNDARIES.waxingGibbous) {
    phase = 'Waxing Gibbous';
  } else if (age < PHASE_BOUNDARIES.fullMoon) {
    phase = 'Full Moon';
  } else if (age < PHASE_BOUNDARIES.waningGibbous) {
    phase = 'Waning Gibbous';
  } else if (age < PHASE_BOUNDARIES.lastQuarter) {
    phase = 'Last Quarter';
  } else if (age < PHASE_BOUNDARIES.waningCrescent) {
    phase = 'Waning Crescent';
  } else {
    phase = 'New Moon';
  }

  return {
    phase,
    illumination,
    age: Math.round(age * 10) / 10,
    emoji: PHASE_EMOJIS[phase],
  };
}

/**
 * Calculates the age of the moon in days since the last new moon.
 *
 * @param date The date to calculate for
 * @returns Age in days (0 to ~29.53)
 */
export function getMoonAge(date: Date): number {
  const daysSinceNewMoon =
    (date.getTime() - REFERENCE_NEW_MOON.getTime()) / (1000 * 60 * 60 * 24);
  return (
    ((daysSinceNewMoon % SYNODIC_MONTH_DAYS) + SYNODIC_MONTH_DAYS) % SYNODIC_MONTH_DAYS
  );
}

/**
 * Calculates the moon's illumination percentage.
 *
 * @param date The date to calculate for
 * @returns Illumination percentage (0-100)
 */
export function getMoonIllumination(date: Date): number {
  const age = getMoonAge(date);
  const cyclePosition = age / SYNODIC_MONTH_DAYS;
  return Math.round(((1 - Math.cos(cyclePosition * 2 * Math.PI)) / 2) * 100);
}
