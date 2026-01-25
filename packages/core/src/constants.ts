/**
 * Physical constants for worldline kinematics calculations.
 * Every constant MUST have a source citation and uncertainty bounds.
 */

// =============================================================================
// TIME CONSTANTS
// =============================================================================

/**
 * Earth's sidereal rotation period in seconds.
 * A sidereal day is the time for one complete rotation relative to distant stars.
 * Source: NIST (https://tf.nist.gov/general/pdf/1530.pdf)
 * Uncertainty: ~0.0001s (negligible for this application)
 */
export const SIDEREAL_DAY_SECONDS = 86164.0905;

/**
 * Earth's mean solar day in seconds.
 * Source: IAU definition
 */
export const SOLAR_DAY_SECONDS = 86400;

/**
 * Seconds per Julian year (365.25 days).
 * Source: IAU definition
 */
export const JULIAN_YEAR_SECONDS = 31557600;

// =============================================================================
// WGS84 ELLIPSOID CONSTANTS
// =============================================================================

/**
 * WGS84 semi-major axis (equatorial radius) in meters.
 * Source: OGC/EPSG (https://docs.ogc.org/bp/16-011r5.html)
 */
export const WGS84_SEMI_MAJOR_AXIS_M = 6378137;

/**
 * WGS84 flattening (dimensionless).
 * Source: OGC/EPSG (https://docs.ogc.org/bp/16-011r5.html)
 */
export const WGS84_FLATTENING = 1 / 298.257223563;

/**
 * WGS84 semi-minor axis (polar radius) in meters.
 * Derived: b = a(1 - f)
 */
export const WGS84_SEMI_MINOR_AXIS_M = WGS84_SEMI_MAJOR_AXIS_M * (1 - WGS84_FLATTENING);

/**
 * WGS84 first eccentricity squared.
 * Derived: e² = f(2 - f)
 */
export const WGS84_ECCENTRICITY_SQUARED = WGS84_FLATTENING * (2 - WGS84_FLATTENING);

// =============================================================================
// ORBITAL CONSTANTS
// =============================================================================

/**
 * Earth's mean orbital velocity around the Sun in km/s.
 * Source: NASA Planetary Fact Sheet
 * (https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html)
 * Uncertainty: ~0.01 km/s (varies ~29.29 to ~30.29 km/s due to eccentricity)
 */
export const EARTH_ORBITAL_VELOCITY_KMS = 29.78;

/**
 * Earth's orbital eccentricity.
 * Source: NASA Planetary Fact Sheet
 */
export const EARTH_ORBITAL_ECCENTRICITY = 0.0167086;

/**
 * Earth's orbital period in seconds (sidereal year).
 * Source: NASA Planetary Fact Sheet
 */
export const EARTH_ORBITAL_PERIOD_SECONDS = 365.256363004 * SOLAR_DAY_SECONDS;

/**
 * Earth-Sun mean distance (1 AU) in km.
 * Source: IAU 2012 definition
 */
export const ASTRONOMICAL_UNIT_KM = 149597870.7;

// =============================================================================
// GALACTIC CONSTANTS
// =============================================================================

/**
 * Solar System orbital velocity around galactic center in km/s.
 * Source: JPL Night Sky Network (https://nightsky.jpl.nasa.gov/docs/HowFast.pdf)
 * Uncertainty: ~10-20 km/s (astrophysical measurement uncertainty)
 */
export const SOLAR_GALACTIC_VELOCITY_KMS = 220;

/**
 * Solar galactic velocity uncertainty in km/s.
 * This should be displayed in the UI as a model uncertainty indicator.
 */
export const SOLAR_GALACTIC_VELOCITY_UNCERTAINTY_KMS = 15;

/**
 * Distance from Sun to galactic center in light-years.
 * Source: Reid et al. 2019 (via multiple parallax measurements)
 */
export const SUN_GALACTIC_CENTER_DISTANCE_LY = 26000;

/**
 * Galactic orbital period (approximate) in years.
 * Source: Derived from velocity and distance
 * Uncertainty: significant (tens of millions of years)
 */
export const GALACTIC_ORBITAL_PERIOD_YEARS = 225_000_000;

// =============================================================================
// CMB CONSTANTS
// =============================================================================

/**
 * Solar System Barycenter velocity relative to CMB rest frame in km/s.
 * Derived from the CMB dipole measurement.
 * Source: Particle Data Group 2025 Review
 * (https://ccwww.kek.jp/pdg/2025/reviews/rpp2025-rev-cosmic-microwave-background.pdf)
 */
export const SSB_CMB_VELOCITY_KMS = 369.82;

/**
 * SSB-CMB velocity uncertainty in km/s.
 * Source: PDG 2025
 */
export const SSB_CMB_VELOCITY_UNCERTAINTY_KMS = 0.11;

/**
 * Direction of SSB motion relative to CMB in galactic longitude (degrees).
 * Source: PDG 2025
 */
export const SSB_CMB_GALACTIC_LONGITUDE_DEG = 264.021;

/**
 * Direction of SSB motion relative to CMB in galactic latitude (degrees).
 * Source: PDG 2025
 */
export const SSB_CMB_GALACTIC_LATITUDE_DEG = 48.253;

/**
 * Local Group velocity relative to CMB in km/s.
 * Source: PDG 2025
 */
export const LOCAL_GROUP_CMB_VELOCITY_KMS = 620;

/**
 * Local Group CMB velocity uncertainty in km/s.
 * Source: PDG 2025
 */
export const LOCAL_GROUP_CMB_VELOCITY_UNCERTAINTY_KMS = 15;

// =============================================================================
// UNIT CONVERSION CONSTANTS
// =============================================================================

/**
 * Speed of light in km/s.
 * Source: CODATA 2018 (exact definition)
 */
export const SPEED_OF_LIGHT_KMS = 299792.458;

/**
 * One light-year in km.
 * Derived: c * Julian year
 */
export const LIGHT_YEAR_KM = SPEED_OF_LIGHT_KMS * JULIAN_YEAR_SECONDS;

/**
 * One parsec in km.
 * Derived from definition: 1 pc = 1 AU / tan(1 arcsec)
 */
export const PARSEC_KM = 3.0857e13;

/**
 * Kilometers per mile.
 */
export const KM_PER_MILE = 1.609344;

/**
 * Moon mean distance from Earth in km.
 * Source: NASA
 */
export const MOON_MEAN_DISTANCE_KM = 384400;

/**
 * Pluto mean distance from Sun in km.
 * Source: NASA
 */
export const PLUTO_MEAN_DISTANCE_KM = 5_906_380_000;
