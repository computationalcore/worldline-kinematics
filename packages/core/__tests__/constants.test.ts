/**
 * Tests for physical constants.
 */

import { describe, it, expect } from 'vitest';
import {
  SIDEREAL_DAY_SECONDS,
  SOLAR_DAY_SECONDS,
  JULIAN_YEAR_SECONDS,
  WGS84_SEMI_MAJOR_AXIS_M,
  WGS84_FLATTENING,
  WGS84_SEMI_MINOR_AXIS_M,
  WGS84_ECCENTRICITY_SQUARED,
  EARTH_ORBITAL_VELOCITY_KMS,
  EARTH_ORBITAL_ECCENTRICITY,
  EARTH_ORBITAL_PERIOD_SECONDS,
  ASTRONOMICAL_UNIT_KM,
  SOLAR_GALACTIC_VELOCITY_KMS,
  SOLAR_GALACTIC_VELOCITY_UNCERTAINTY_KMS,
  SUN_GALACTIC_CENTER_DISTANCE_LY,
  GALACTIC_ORBITAL_PERIOD_YEARS,
  SSB_CMB_VELOCITY_KMS,
  SSB_CMB_VELOCITY_UNCERTAINTY_KMS,
  SSB_CMB_GALACTIC_LONGITUDE_DEG,
  SSB_CMB_GALACTIC_LATITUDE_DEG,
  LOCAL_GROUP_CMB_VELOCITY_KMS,
  LOCAL_GROUP_CMB_VELOCITY_UNCERTAINTY_KMS,
  SPEED_OF_LIGHT_KMS,
  LIGHT_YEAR_KM,
  PARSEC_KM,
  KM_PER_MILE,
  MILES_PER_KM,
  EARTH_CIRCUMFERENCE_KM,
  JULIAN_YEAR_DAYS,
  MOON_MEAN_DISTANCE_KM,
  PLUTO_MEAN_DISTANCE_KM,
  ORBITAL_PERIODS_DAYS,
} from '../src/constants';

describe('time constants', () => {
  it('sidereal day is shorter than solar day', () => {
    expect(SIDEREAL_DAY_SECONDS).toBeLessThan(SOLAR_DAY_SECONDS);
    // Difference should be about 4 minutes (236 seconds)
    const diff = SOLAR_DAY_SECONDS - SIDEREAL_DAY_SECONDS;
    expect(diff).toBeGreaterThan(230);
    expect(diff).toBeLessThan(240);
  });

  it('Julian year is 365.25 days', () => {
    const daysInJulianYear = JULIAN_YEAR_SECONDS / SOLAR_DAY_SECONDS;
    expect(daysInJulianYear).toBe(365.25);
  });
});

describe('WGS84 derived values', () => {
  it('semi-minor axis matches a(1-f) formula', () => {
    const expected = WGS84_SEMI_MAJOR_AXIS_M * (1 - WGS84_FLATTENING);
    expect(WGS84_SEMI_MINOR_AXIS_M).toBeCloseTo(expected, 10);
  });

  it('eccentricity squared matches f(2-f) formula', () => {
    const expected = WGS84_FLATTENING * (2 - WGS84_FLATTENING);
    expect(WGS84_ECCENTRICITY_SQUARED).toBeCloseTo(expected, 15);
  });

  it('semi-minor axis is less than semi-major axis', () => {
    expect(WGS84_SEMI_MINOR_AXIS_M).toBeLessThan(WGS84_SEMI_MAJOR_AXIS_M);
  });

  it('flattening is physically reasonable', () => {
    // Earth's flattening is about 1/298
    expect(WGS84_FLATTENING).toBeGreaterThan(0.003);
    expect(WGS84_FLATTENING).toBeLessThan(0.004);
  });
});

describe('orbital constants', () => {
  it('Earth orbital velocity is in expected range', () => {
    // Earth orbits at about 30 km/s
    expect(EARTH_ORBITAL_VELOCITY_KMS).toBeGreaterThan(29);
    expect(EARTH_ORBITAL_VELOCITY_KMS).toBeLessThan(31);
  });

  it('Earth orbital eccentricity is small', () => {
    // Earth has a nearly circular orbit
    expect(EARTH_ORBITAL_ECCENTRICITY).toBeGreaterThan(0.01);
    expect(EARTH_ORBITAL_ECCENTRICITY).toBeLessThan(0.02);
  });

  it('Earth orbital period matches expected sidereal year', () => {
    const daysInYear = EARTH_ORBITAL_PERIOD_SECONDS / SOLAR_DAY_SECONDS;
    expect(daysInYear).toBeGreaterThan(365.2);
    expect(daysInYear).toBeLessThan(365.3);
  });

  it('AU is approximately 150 million km', () => {
    expect(ASTRONOMICAL_UNIT_KM).toBeGreaterThan(149_000_000);
    expect(ASTRONOMICAL_UNIT_KM).toBeLessThan(150_000_000);
  });
});

describe('galactic constants', () => {
  it('galactic velocity is in expected range', () => {
    expect(SOLAR_GALACTIC_VELOCITY_KMS).toBeGreaterThan(200);
    expect(SOLAR_GALACTIC_VELOCITY_KMS).toBeLessThan(250);
  });

  it('galactic velocity uncertainty is reasonable', () => {
    expect(SOLAR_GALACTIC_VELOCITY_UNCERTAINTY_KMS).toBeGreaterThan(0);
    expect(SOLAR_GALACTIC_VELOCITY_UNCERTAINTY_KMS).toBeLessThan(
      SOLAR_GALACTIC_VELOCITY_KMS * 0.1
    );
  });

  it('galactic center distance is about 26000 light-years', () => {
    expect(SUN_GALACTIC_CENTER_DISTANCE_LY).toBeGreaterThan(20000);
    expect(SUN_GALACTIC_CENTER_DISTANCE_LY).toBeLessThan(30000);
  });

  it('galactic orbital period is about 225 million years', () => {
    expect(GALACTIC_ORBITAL_PERIOD_YEARS).toBeGreaterThan(200_000_000);
    expect(GALACTIC_ORBITAL_PERIOD_YEARS).toBeLessThan(250_000_000);
  });
});

describe('CMB constants', () => {
  it('SSB-CMB velocity is about 370 km/s', () => {
    expect(SSB_CMB_VELOCITY_KMS).toBeGreaterThan(365);
    expect(SSB_CMB_VELOCITY_KMS).toBeLessThan(375);
  });

  it('SSB-CMB uncertainty is small', () => {
    expect(SSB_CMB_VELOCITY_UNCERTAINTY_KMS).toBeLessThan(1);
  });

  it('CMB direction is in valid galactic coordinate range', () => {
    expect(SSB_CMB_GALACTIC_LONGITUDE_DEG).toBeGreaterThanOrEqual(0);
    expect(SSB_CMB_GALACTIC_LONGITUDE_DEG).toBeLessThan(360);
    expect(SSB_CMB_GALACTIC_LATITUDE_DEG).toBeGreaterThanOrEqual(-90);
    expect(SSB_CMB_GALACTIC_LATITUDE_DEG).toBeLessThanOrEqual(90);
  });

  it('Local Group CMB velocity is larger than SSB velocity', () => {
    expect(LOCAL_GROUP_CMB_VELOCITY_KMS).toBeGreaterThan(SSB_CMB_VELOCITY_KMS);
  });
});

describe('unit conversion constants', () => {
  it('speed of light is exact CODATA value', () => {
    expect(SPEED_OF_LIGHT_KMS).toBe(299792.458);
  });

  it('light-year equals c times Julian year', () => {
    const expected = SPEED_OF_LIGHT_KMS * JULIAN_YEAR_SECONDS;
    expect(LIGHT_YEAR_KM).toBeCloseTo(expected, 5);
  });

  it('parsec is about 3.26 light-years', () => {
    const lyPerParsec = PARSEC_KM / LIGHT_YEAR_KM;
    expect(lyPerParsec).toBeGreaterThan(3.2);
    expect(lyPerParsec).toBeLessThan(3.3);
  });

  it('km per mile is standard value', () => {
    expect(KM_PER_MILE).toBe(1.609344);
  });

  it('miles per km is inverse of km per mile', () => {
    expect(MILES_PER_KM).toBeCloseTo(1 / KM_PER_MILE, 10);
    expect(MILES_PER_KM * KM_PER_MILE).toBeCloseTo(1, 10);
  });

  it('Julian year is exactly 365.25 days', () => {
    expect(JULIAN_YEAR_DAYS).toBe(365.25);
  });

  it('Julian year matches JULIAN_YEAR_SECONDS', () => {
    const secondsPerDay = 86400;
    expect(JULIAN_YEAR_DAYS * secondsPerDay).toBe(JULIAN_YEAR_SECONDS);
  });
});

describe('Earth physical constants', () => {
  it('Earth circumference is about 40,075 km', () => {
    expect(EARTH_CIRCUMFERENCE_KM).toBeGreaterThan(40000);
    expect(EARTH_CIRCUMFERENCE_KM).toBeLessThan(41000);
  });

  it('Earth circumference matches WGS84 equatorial calculation', () => {
    // Circumference = 2 * PI * semi-major axis
    const expected = 2 * Math.PI * (WGS84_SEMI_MAJOR_AXIS_M / 1000);
    expect(EARTH_CIRCUMFERENCE_KM).toBeCloseTo(expected, 0);
  });
});

describe('orbital periods', () => {
  it('contains all 8 planets', () => {
    const planets = Object.keys(ORBITAL_PERIODS_DAYS);
    expect(planets).toHaveLength(8);
    expect(planets).toContain('Mercury');
    expect(planets).toContain('Venus');
    expect(planets).toContain('Earth');
    expect(planets).toContain('Mars');
    expect(planets).toContain('Jupiter');
    expect(planets).toContain('Saturn');
    expect(planets).toContain('Uranus');
    expect(planets).toContain('Neptune');
  });

  it('Earth orbital period is about 365.25 days', () => {
    expect(ORBITAL_PERIODS_DAYS.Earth).toBe(365.25);
  });

  it('periods increase with distance from Sun', () => {
    expect(ORBITAL_PERIODS_DAYS.Mercury).toBeLessThan(ORBITAL_PERIODS_DAYS.Venus!);
    expect(ORBITAL_PERIODS_DAYS.Venus).toBeLessThan(ORBITAL_PERIODS_DAYS.Earth!);
    expect(ORBITAL_PERIODS_DAYS.Earth).toBeLessThan(ORBITAL_PERIODS_DAYS.Mars!);
    expect(ORBITAL_PERIODS_DAYS.Mars).toBeLessThan(ORBITAL_PERIODS_DAYS.Jupiter!);
    expect(ORBITAL_PERIODS_DAYS.Jupiter).toBeLessThan(ORBITAL_PERIODS_DAYS.Saturn!);
    expect(ORBITAL_PERIODS_DAYS.Saturn).toBeLessThan(ORBITAL_PERIODS_DAYS.Uranus!);
    expect(ORBITAL_PERIODS_DAYS.Uranus).toBeLessThan(ORBITAL_PERIODS_DAYS.Neptune!);
  });

  it('Mercury period is about 88 days', () => {
    expect(ORBITAL_PERIODS_DAYS.Mercury).toBeGreaterThan(85);
    expect(ORBITAL_PERIODS_DAYS.Mercury).toBeLessThan(92);
  });

  it('Neptune period is about 165 years', () => {
    const neptuneYears = (ORBITAL_PERIODS_DAYS.Neptune ?? 0) / 365.25;
    expect(neptuneYears).toBeGreaterThan(160);
    expect(neptuneYears).toBeLessThan(170);
  });
});

describe('distance constants', () => {
  it('Moon distance is about 384,400 km', () => {
    expect(MOON_MEAN_DISTANCE_KM).toBeGreaterThan(380000);
    expect(MOON_MEAN_DISTANCE_KM).toBeLessThan(390000);
  });

  it('Pluto distance is about 40 AU', () => {
    const plutoAu = PLUTO_MEAN_DISTANCE_KM / ASTRONOMICAL_UNIT_KM;
    expect(plutoAu).toBeGreaterThan(35);
    expect(plutoAu).toBeLessThan(45);
  });
});

describe('all constants are valid numbers', () => {
  const allConstants = {
    SIDEREAL_DAY_SECONDS,
    SOLAR_DAY_SECONDS,
    JULIAN_YEAR_SECONDS,
    WGS84_SEMI_MAJOR_AXIS_M,
    WGS84_FLATTENING,
    WGS84_SEMI_MINOR_AXIS_M,
    WGS84_ECCENTRICITY_SQUARED,
    EARTH_ORBITAL_VELOCITY_KMS,
    EARTH_ORBITAL_ECCENTRICITY,
    EARTH_ORBITAL_PERIOD_SECONDS,
    ASTRONOMICAL_UNIT_KM,
    SOLAR_GALACTIC_VELOCITY_KMS,
    SOLAR_GALACTIC_VELOCITY_UNCERTAINTY_KMS,
    SUN_GALACTIC_CENTER_DISTANCE_LY,
    GALACTIC_ORBITAL_PERIOD_YEARS,
    SSB_CMB_VELOCITY_KMS,
    SSB_CMB_VELOCITY_UNCERTAINTY_KMS,
    SSB_CMB_GALACTIC_LONGITUDE_DEG,
    SSB_CMB_GALACTIC_LATITUDE_DEG,
    LOCAL_GROUP_CMB_VELOCITY_KMS,
    LOCAL_GROUP_CMB_VELOCITY_UNCERTAINTY_KMS,
    SPEED_OF_LIGHT_KMS,
    LIGHT_YEAR_KM,
    PARSEC_KM,
    KM_PER_MILE,
    MILES_PER_KM,
    EARTH_CIRCUMFERENCE_KM,
    JULIAN_YEAR_DAYS,
    MOON_MEAN_DISTANCE_KM,
    PLUTO_MEAN_DISTANCE_KM,
  };

  for (const [name, value] of Object.entries(allConstants)) {
    it(`${name} is a finite positive number`, () => {
      expect(Number.isFinite(value)).toBe(true);
      expect(value).toBeGreaterThan(0);
    });
  }

  it('all orbital periods are finite positive numbers', () => {
    for (const [_planet, period] of Object.entries(ORBITAL_PERIODS_DAYS)) {
      expect(Number.isFinite(period)).toBe(true);
      expect(period).toBeGreaterThan(0);
    }
  });
});
