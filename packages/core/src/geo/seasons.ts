/**
 * Earth season calculations based on astronomical events.
 */

/**
 * Result of season calculation.
 */
export interface SeasonInfo {
  /** Current season name (e.g., "Spring", "Summer") */
  season: string;
  /** Progress through current season as percentage (0-100) */
  progress: number;
  /** Name of the next astronomical event (e.g., "Summer Solstice") */
  nextEvent: string;
  /** Days until the next event */
  daysUntilNext: number;
}

/**
 * Hemisphere for season calculation.
 */
export type Hemisphere = 'northern' | 'southern';

/**
 * Calculates the current Earth season for a given date and hemisphere.
 *
 * Uses approximate dates for solstices and equinoxes (which vary by 1-2 days annually).
 * For more precise calculations, use Astronomy Engine's season functions.
 *
 * @param date The date to check
 * @param hemisphere Which hemisphere to calculate for (default: 'northern')
 * @returns Season information including name, progress, and next event
 *
 * @example
 * ```ts
 * const info = getEarthSeason(new Date('2024-07-15'), 'northern');
 * // { season: 'Summer', progress: 26.4, nextEvent: 'Autumn Equinox', daysUntilNext: 69 }
 * ```
 */
export function getEarthSeason(
  date: Date,
  hemisphere: Hemisphere = 'northern'
): SeasonInfo {
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
    const event = events[i]!;
    const nextIndex = (i + 1) % events.length;
    const nextEventObj = events[nextIndex]!;
    const nextEventDate =
      nextIndex === 0
        ? new Date(year + 1, 2, 20) // Next year's vernal equinox
        : nextEventObj.date;

    if (date >= event.date && date < nextEventDate) {
      currentSeason = hemisphere === 'northern' ? event.northSeason : event.southSeason;
      nextEvent =
        hemisphere === 'northern'
          ? nextIndex === 0
            ? 'Spring Equinox'
            : nextEventObj.next
          : nextEventObj.next;
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
