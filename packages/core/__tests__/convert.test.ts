/**
 * Tests for unit conversion utilities.
 */
import { describe, it, expect } from 'vitest';
import {
  kmsToKmh,
  kmsToMph,
  kmsToMs,
  msToKms,
  kmToMiles,
  kmToAU,
  kmToLightYears,
  kmToParsecs,
  lightYearsToKm,
  auToKm,
  moonRoundTrips,
  plutoTrips,
  lightYearProgress,
  formatCompact,
  formatDistance,
  formatSpeed,
} from '../src/units/convert';
import {
  KM_PER_MILE,
  ASTRONOMICAL_UNIT_KM,
  LIGHT_YEAR_KM,
  PARSEC_KM,
  MOON_MEAN_DISTANCE_KM,
  PLUTO_MEAN_DISTANCE_KM,
} from '../src/constants';

describe('speed conversions', () => {
  describe('kmsToKmh', () => {
    it('converts km/s to km/h', () => {
      expect(kmsToKmh(1)).toBe(3600);
    });

    it('handles zero', () => {
      expect(kmsToKmh(0)).toBe(0);
    });

    it('handles Earth orbital speed', () => {
      expect(kmsToKmh(29.78)).toBeCloseTo(107208, 0);
    });
  });

  describe('kmsToMph', () => {
    it('converts km/s to mph', () => {
      expect(kmsToMph(1)).toBeCloseTo(3600 / KM_PER_MILE, 2);
    });

    it('handles zero', () => {
      expect(kmsToMph(0)).toBe(0);
    });
  });

  describe('kmsToMs', () => {
    it('converts km/s to m/s', () => {
      expect(kmsToMs(1)).toBe(1000);
    });

    it('handles zero', () => {
      expect(kmsToMs(0)).toBe(0);
    });
  });

  describe('msToKms', () => {
    it('converts m/s to km/s', () => {
      expect(msToKms(1000)).toBe(1);
    });

    it('is inverse of kmsToMs', () => {
      expect(msToKms(kmsToMs(29.78))).toBeCloseTo(29.78, 10);
    });
  });
});

describe('distance conversions', () => {
  describe('kmToMiles', () => {
    it('converts km to miles', () => {
      expect(kmToMiles(KM_PER_MILE)).toBeCloseTo(1, 10);
    });

    it('handles zero', () => {
      expect(kmToMiles(0)).toBe(0);
    });
  });

  describe('kmToAU', () => {
    it('converts km to AU', () => {
      expect(kmToAU(ASTRONOMICAL_UNIT_KM)).toBeCloseTo(1, 10);
    });

    it('handles Earth-Sun distance', () => {
      expect(kmToAU(149597870.7)).toBeCloseTo(1, 5);
    });
  });

  describe('kmToLightYears', () => {
    it('converts km to light-years', () => {
      expect(kmToLightYears(LIGHT_YEAR_KM)).toBeCloseTo(1, 10);
    });
  });

  describe('kmToParsecs', () => {
    it('converts km to parsecs', () => {
      expect(kmToParsecs(PARSEC_KM)).toBeCloseTo(1, 10);
    });
  });

  describe('lightYearsToKm', () => {
    it('converts light-years to km', () => {
      expect(lightYearsToKm(1)).toBe(LIGHT_YEAR_KM);
    });

    it('is inverse of kmToLightYears', () => {
      expect(lightYearsToKm(kmToLightYears(1e12))).toBeCloseTo(1e12, 0);
    });
  });

  describe('auToKm', () => {
    it('converts AU to km', () => {
      expect(auToKm(1)).toBe(ASTRONOMICAL_UNIT_KM);
    });

    it('is inverse of kmToAU', () => {
      expect(auToKm(kmToAU(1e8))).toBeCloseTo(1e8, 0);
    });
  });
});

describe('comparative distances', () => {
  describe('moonRoundTrips', () => {
    it('calculates Moon round trips', () => {
      const oneRoundTrip = 2 * MOON_MEAN_DISTANCE_KM;
      expect(moonRoundTrips(oneRoundTrip)).toBeCloseTo(1, 10);
    });

    it('handles multiple trips', () => {
      const fiveTrips = 10 * MOON_MEAN_DISTANCE_KM;
      expect(moonRoundTrips(fiveTrips)).toBeCloseTo(5, 10);
    });
  });

  describe('plutoTrips', () => {
    it('calculates Pluto trips', () => {
      expect(plutoTrips(PLUTO_MEAN_DISTANCE_KM)).toBeCloseTo(1, 10);
    });
  });

  describe('lightYearProgress', () => {
    it('returns percentage toward 1 light-year', () => {
      expect(lightYearProgress(LIGHT_YEAR_KM)).toBeCloseTo(100, 5);
    });

    it('returns 50% at half light-year', () => {
      expect(lightYearProgress(LIGHT_YEAR_KM / 2)).toBeCloseTo(50, 5);
    });
  });
});

describe('formatCompact', () => {
  it('formats small numbers without suffix', () => {
    expect(formatCompact(123)).toBe('123.00');
  });

  it('formats thousands with K', () => {
    expect(formatCompact(1234)).toBe('1.23K');
  });

  it('formats millions with M', () => {
    expect(formatCompact(1234567)).toBe('1.23M');
  });

  it('formats billions with B', () => {
    expect(formatCompact(1234567890)).toBe('1.23B');
  });

  it('formats trillions with T', () => {
    expect(formatCompact(1234567890123)).toBe('1.23T');
  });

  it('handles negative numbers', () => {
    expect(formatCompact(-1234)).toBe('-1.23K');
  });

  it('respects decimal parameter', () => {
    expect(formatCompact(1234, 1)).toBe('1.2K');
    expect(formatCompact(1234, 0)).toBe('1K');
  });
});

describe('formatDistance', () => {
  it('uses km for small distances', () => {
    const result = formatDistance(1000);
    expect(result.unit).toBe('km');
    expect(result.formatted).toContain('km');
  });

  it('uses AU for medium distances', () => {
    const result = formatDistance(ASTRONOMICAL_UNIT_KM);
    expect(result.unit).toBe('AU');
    expect(result.value).toBeCloseTo(1, 2);
  });

  it('uses light-years for large distances', () => {
    const result = formatDistance(LIGHT_YEAR_KM);
    expect(result.unit).toBe('ly');
    expect(result.value).toBeCloseTo(1, 4);
  });

  it('handles negative distances', () => {
    const result = formatDistance(-1000);
    expect(result.unit).toBe('km');
  });
});

describe('formatSpeed', () => {
  it('formats in km/s by default', () => {
    expect(formatSpeed(29.78)).toBe('29.78 km/s');
  });

  it('formats in km/h', () => {
    const result = formatSpeed(1, 'km/h');
    expect(result).toContain('km/h');
  });

  it('formats in mph', () => {
    const result = formatSpeed(1, 'mph');
    expect(result).toContain('mph');
  });
});
