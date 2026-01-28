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
  MOON_MEAN_DISTANCE_KM,
  PLUTO_MEAN_DISTANCE_KM,
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
    MOON_MEAN_DISTANCE_KM,
    PLUTO_MEAN_DISTANCE_KM,
  };

  for (const [name, value] of Object.entries(allConstants)) {
    it(`${name} is a finite positive number`, () => {
      expect(Number.isFinite(value)).toBe(true);
      expect(value).toBeGreaterThan(0);
    });
  }
});
