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
  formatSpeedWithUnit,
  formatDistanceFullWords,
  formatDistanceCompactUnified,
  formatNumberCompact,
  formatStatistic,
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

// =============================================================================
// UNIFIED FORMATTING FUNCTIONS
// =============================================================================

describe('formatSpeedWithUnit', () => {
  describe('km/s formatting', () => {
    it('formats with 2 decimal places by default', () => {
      expect(formatSpeedWithUnit(29.78, 'km/s')).toBe('29.78 km/s');
    });

    it('respects custom decimal places', () => {
      expect(formatSpeedWithUnit(29.785, 'km/s', { decimalsKms: 3 })).toBe('29.785 km/s');
      expect(formatSpeedWithUnit(29.785, 'km/s', { decimalsKms: 1 })).toBe('29.8 km/s');
    });

    it('handles zero', () => {
      expect(formatSpeedWithUnit(0, 'km/s')).toBe('0.00 km/s');
    });

    it('handles very small speeds', () => {
      expect(formatSpeedWithUnit(0.001, 'km/s')).toBe('0.00 km/s');
      expect(formatSpeedWithUnit(0.001, 'km/s', { decimalsKms: 4 })).toBe('0.0010 km/s');
    });
  });

  describe('km/h formatting', () => {
    it('converts and formats correctly', () => {
      // 1 km/s = 3600 km/h
      const result = formatSpeedWithUnit(1, 'km/h');
      expect(result).toContain('km/h');
      expect(result).toContain('3,600');
    });

    it('rounds to whole numbers', () => {
      // 10 km/s = 36000 km/h
      const result = formatSpeedWithUnit(10, 'km/h');
      expect(result).toBe('36,000 km/h');
    });

    it('handles Earth orbital speed', () => {
      // 29.78 km/s = ~107,208 km/h
      const result = formatSpeedWithUnit(29.78, 'km/h');
      expect(result).toContain('km/h');
    });
  });

  describe('mph formatting', () => {
    it('converts using correct factor', () => {
      // 1 km/s = 3600 km/h / 1.609344 = ~2236.936 mph
      const result = formatSpeedWithUnit(1, 'mph');
      expect(result).toContain('mph');
      expect(result).toContain('2,237');
    });

    it('handles large speeds', () => {
      // 100 km/s = ~223,694 mph
      const result = formatSpeedWithUnit(100, 'mph');
      expect(result).toContain('mph');
    });
  });

  describe('useLocale option', () => {
    it('omits locale formatting when useLocale is false', () => {
      const result = formatSpeedWithUnit(10, 'km/h', { useLocale: false });
      expect(result).toBe('36000 km/h');
    });
  });
});

describe('formatDistanceFullWords', () => {
  describe('km unit', () => {
    it('formats trillions', () => {
      const result = formatDistanceFullWords(5.5e12, 'km');
      expect(result.value).toBe('5.50');
      expect(result.suffix).toBe('Trillion km');
    });

    it('formats billions', () => {
      const result = formatDistanceFullWords(28e9, 'km');
      expect(result.value).toBe('28.00');
      expect(result.suffix).toBe('Billion km');
    });

    it('formats millions', () => {
      const result = formatDistanceFullWords(5e6, 'km');
      expect(result.value).toBe('5.00');
      expect(result.suffix).toBe('Million km');
    });

    it('formats thousands', () => {
      const result = formatDistanceFullWords(50000, 'km');
      expect(result.value).toBe('50');
      expect(result.suffix).toBe('Thousand km');
    });

    it('formats small values', () => {
      const result = formatDistanceFullWords(500, 'km');
      expect(result.value).toBe('500');
      expect(result.suffix).toBe('km');
    });
  });

  describe('miles unit', () => {
    it('converts and formats in miles', () => {
      // 10 billion km / 1.609344 = ~6.21 billion miles
      const result = formatDistanceFullWords(1e10, 'miles');
      expect(parseFloat(result.value)).toBeCloseTo(6.21, 1);
      expect(result.suffix).toBe('Billion miles');
    });

    it('formats large distances in miles', () => {
      // 1 trillion km / 1.609344 = ~621 billion miles
      const result = formatDistanceFullWords(1e12, 'miles');
      expect(parseFloat(result.value)).toBeCloseTo(621.37, 0);
      expect(result.suffix).toBe('Billion miles');
    });
  });

  describe('AU unit', () => {
    it('formats AU for distances >= 1000 AU', () => {
      // 1000 AU = 1.496e14 km
      const result = formatDistanceFullWords(1.496e14, 'au');
      expect(result.suffix).toBe('AU');
    });

    it('formats AU with decimals for smaller distances', () => {
      // 1 AU = 1.496e8 km
      const result = formatDistanceFullWords(1.496e8, 'au');
      expect(result.suffix).toBe('AU');
      expect(parseFloat(result.value)).toBeCloseTo(1, 1);
    });
  });

  describe('translated suffixes', () => {
    it('uses custom translations', () => {
      const result = formatDistanceFullWords(5e9, 'km', {
        billion: 'Milliarden',
        million: 'Millionen',
        thousand: 'Tausend',
        trillion: 'Billionen',
      });
      expect(result.suffix).toBe('Milliarden km');
    });

    it('falls back to English for missing translations', () => {
      const result = formatDistanceFullWords(5e9, 'km', {
        million: 'Millionen',
      });
      expect(result.suffix).toBe('Billion km');
    });
  });
});

describe('formatDistanceCompactUnified', () => {
  describe('km unit', () => {
    it('formats trillions with T suffix', () => {
      expect(formatDistanceCompactUnified(2.5e12, 'km')).toBe('2.50T km');
    });

    it('formats billions with B suffix', () => {
      expect(formatDistanceCompactUnified(28e9, 'km')).toBe('28.00B km');
    });

    it('formats millions with M suffix', () => {
      expect(formatDistanceCompactUnified(5e6, 'km')).toBe('5.00M km');
    });

    it('formats thousands with K suffix', () => {
      expect(formatDistanceCompactUnified(50000, 'km')).toBe('50K km');
    });

    it('formats small values', () => {
      expect(formatDistanceCompactUnified(500, 'km')).toBe('500 km');
    });
  });

  describe('miles unit', () => {
    it('converts and formats with mi abbreviation', () => {
      // 10 billion km / 1.609344 = ~6.21 billion miles
      const result = formatDistanceCompactUnified(1e10, 'miles');
      expect(result).toMatch(/^\d+\.\d+B mi$/);
    });

    it('formats millions of miles', () => {
      // 1 billion km / 1.609344 = ~621 million miles
      const result = formatDistanceCompactUnified(1e9, 'miles');
      expect(result).toMatch(/^\d+\.\d+M mi$/);
    });
  });

  describe('AU unit', () => {
    it('formats AU for values >= 0.01', () => {
      // 1 AU = 1.496e8 km
      const result = formatDistanceCompactUnified(1.496e8, 'au');
      expect(result).toContain('AU');
    });

    it('formats in mAU for very small values', () => {
      // 0.001 AU = 1.496e5 km
      const result = formatDistanceCompactUnified(1.496e5, 'au');
      expect(result).toContain('mAU');
    });
  });
});

describe('formatNumberCompact', () => {
  it('formats billions with B suffix', () => {
    expect(formatNumberCompact(5e9)).toBe('5.0B');
    expect(formatNumberCompact(1.234e9)).toBe('1.2B');
  });

  it('formats millions with M suffix', () => {
    expect(formatNumberCompact(5e6)).toBe('5.0M');
    expect(formatNumberCompact(1.5e6)).toBe('1.5M');
  });

  it('formats thousands with K suffix', () => {
    expect(formatNumberCompact(5000)).toBe('5.0K');
    expect(formatNumberCompact(1500)).toBe('1.5K');
  });

  it('uses locale formatting for >= 100', () => {
    const result = formatNumberCompact(500);
    expect(result).toBe('500');
  });

  it('uses decimal places for >= 1', () => {
    expect(formatNumberCompact(50)).toBe('50.0');
    expect(formatNumberCompact(5.5)).toBe('5.5');
  });

  it('uses more precision for < 1', () => {
    expect(formatNumberCompact(0.5)).toBe('0.500');
    expect(formatNumberCompact(0.123)).toBe('0.123');
  });

  it('respects custom decimal places', () => {
    expect(formatNumberCompact(5e6, 2)).toBe('5.00M');
    expect(formatNumberCompact(5e6, 0)).toBe('5M');
  });
});

describe('formatStatistic', () => {
  it('formats >= 1M with M suffix and 1 decimal', () => {
    expect(formatStatistic(5e6)).toBe('5.0M');
    expect(formatStatistic(1.5e6)).toBe('1.5M');
  });

  it('formats >= 1000 with K suffix', () => {
    expect(formatStatistic(5000)).toBe('5.0K');
    expect(formatStatistic(1500)).toBe('1.5K');
  });

  it('formats >= 100 with no decimals', () => {
    expect(formatStatistic(500)).toBe('500');
    expect(formatStatistic(100)).toBe('100');
  });

  it('formats >= 10 with 1 decimal', () => {
    expect(formatStatistic(50)).toBe('50.0');
    expect(formatStatistic(15.5)).toBe('15.5');
  });

  it('formats >= 1 with 1 decimal', () => {
    expect(formatStatistic(5)).toBe('5.0');
    expect(formatStatistic(1.5)).toBe('1.5');
  });

  it('formats < 1 with 2 decimals', () => {
    expect(formatStatistic(0.5)).toBe('0.50');
    expect(formatStatistic(0.15)).toBe('0.15');
  });

  it('handles edge case at 1', () => {
    expect(formatStatistic(1)).toBe('1.0');
  });

  it('handles zero', () => {
    expect(formatStatistic(0)).toBe('0.00');
  });
});
