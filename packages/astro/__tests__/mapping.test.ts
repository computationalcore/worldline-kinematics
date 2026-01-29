/**
 * Tests for scale mapping validation.
 */

import { describe, it, expect } from 'vitest';
import {
  validateMapping,
  createValidatedMapping,
  createPhysicalMapping,
  createMapping,
  createMappingFromSimple,
  getPreset,
  MappingValidationError,
  AU_KM,
  AU_TO_SCENE,
  PRESET_TRUE_PHYSICAL,
  PRESET_PLANET_RATIO,
  PRESET_SCHOOL_MODEL,
  PRESET_EXPLORER,
  PRESET_TRUE_SIZES,
  PRESET_MASS_COMPARISON,
  DISTANCE_LINEAR,
  SIZE_NORMALIZED,
} from '../src/scale/mapping';

describe('validateMapping', () => {
  describe('physical size scale validation', () => {
    it('passes for correctly configured physical mapping', () => {
      const mapping = {
        distanceScale: { kind: 'linear' as const, auToScene: 3 },
        sizeScale: { kind: 'physical' as const, kmToScene: 3 / AU_KM },
      };

      // Should not throw
      expect(() => validateMapping(mapping)).not.toThrow();
    });

    it('throws when physical size scale used with log distance scale', () => {
      const mapping = {
        distanceScale: { kind: 'log10' as const, scale: 2, multiplier: 3 },
        sizeScale: { kind: 'physical' as const, kmToScene: 3 / AU_KM },
      };

      expect(() => validateMapping(mapping)).toThrow(MappingValidationError);
      expect(() => validateMapping(mapping)).toThrow(/requires linear distance scale/);
    });

    it('throws when physical size scale used with piecewise distance scale', () => {
      const mapping = {
        distanceScale: {
          kind: 'piecewise' as const,
          innerRadiusAu: 2,
          innerScale: 2,
          outerLogScale: 1.5,
          outerMultiplier: 2.5,
        },
        sizeScale: { kind: 'physical' as const, kmToScene: 3 / AU_KM },
      };

      expect(() => validateMapping(mapping)).toThrow(MappingValidationError);
      expect(() => validateMapping(mapping)).toThrow(/requires linear distance scale/);
    });

    it('throws when kmToScene does not match auToScene / AU_KM', () => {
      const mapping = {
        distanceScale: { kind: 'linear' as const, auToScene: 3 },
        sizeScale: { kind: 'physical' as const, kmToScene: 0.0001 }, // Wrong value
      };

      expect(() => validateMapping(mapping)).toThrow(MappingValidationError);
      expect(() => validateMapping(mapping)).toThrow(/kmToScene mismatch/);
    });

    it('allows tiny floating-point differences', () => {
      const auToScene = 3;
      const exactKmToScene = auToScene / AU_KM;
      // Add a tiny floating-point error (well within 1e-9 relative)
      const slightlyOffKmToScene = exactKmToScene * (1 + 1e-12);

      const mapping = {
        distanceScale: { kind: 'linear' as const, auToScene },
        sizeScale: { kind: 'physical' as const, kmToScene: slightlyOffKmToScene },
      };

      // Should not throw - error is within tolerance
      expect(() => validateMapping(mapping)).not.toThrow();
    });
  });

  describe('non-physical size scale validation', () => {
    it('passes for any distance scale with realRelativeToMercury size scale', () => {
      const mapping = {
        distanceScale: { kind: 'log10' as const, scale: 2, multiplier: 3 },
        sizeScale: { kind: 'realRelativeToMercury' as const, mercuryRadiusScene: 0.02 },
      };

      expect(() => validateMapping(mapping)).not.toThrow();
    });

    it('passes for any distance scale with normalizedRelativeToJupiter size scale', () => {
      const mapping = {
        distanceScale: {
          kind: 'piecewise' as const,
          innerRadiusAu: 2,
          innerScale: 2,
          outerLogScale: 1.5,
          outerMultiplier: 2.5,
        },
        sizeScale: {
          kind: 'normalizedRelativeToJupiter' as const,
          jupiterRadiusScene: 0.06,
        },
      };

      expect(() => validateMapping(mapping)).not.toThrow();
    });
  });

  describe('preset validation', () => {
    it('PRESET_TRUE_PHYSICAL is valid', () => {
      expect(() => validateMapping(PRESET_TRUE_PHYSICAL)).not.toThrow();
    });

    it('PRESET_PLANET_RATIO is valid (not physical scale)', () => {
      expect(() => validateMapping(PRESET_PLANET_RATIO)).not.toThrow();
    });

    it('PRESET_SCHOOL_MODEL is valid', () => {
      expect(() => validateMapping(PRESET_SCHOOL_MODEL)).not.toThrow();
    });

    it('PRESET_EXPLORER is valid', () => {
      expect(() => validateMapping(PRESET_EXPLORER)).not.toThrow();
    });
  });
});

describe('createValidatedMapping', () => {
  it('returns mapping when valid', () => {
    const distanceScale = { kind: 'linear' as const, auToScene: 5 };
    const sizeScale = { kind: 'physical' as const, kmToScene: 5 / AU_KM };

    const mapping = createValidatedMapping(distanceScale, sizeScale);

    expect(mapping.distanceScale).toBe(distanceScale);
    expect(mapping.sizeScale).toBe(sizeScale);
  });

  it('throws when invalid', () => {
    const distanceScale = { kind: 'log10' as const, scale: 2, multiplier: 3 };
    const sizeScale = { kind: 'physical' as const, kmToScene: 5 / AU_KM };

    expect(() => createValidatedMapping(distanceScale, sizeScale)).toThrow(
      MappingValidationError
    );
  });
});

describe('createPhysicalMapping', () => {
  it('creates a valid physical mapping for any auToScene value', () => {
    const testValues = [1, 3, 10, 100, 0.5];

    for (const auToScene of testValues) {
      const mapping = createPhysicalMapping(auToScene);

      expect(mapping.distanceScale.kind).toBe('linear');
      expect(
        (mapping.distanceScale as { kind: 'linear'; auToScene: number }).auToScene
      ).toBe(auToScene);
      expect(mapping.sizeScale.kind).toBe('physical');
      expect(
        (mapping.sizeScale as { kind: 'physical'; kmToScene: number }).kmToScene
      ).toBeCloseTo(auToScene / AU_KM, 15);

      // Should pass validation
      expect(() => validateMapping(mapping)).not.toThrow();
    }
  });
});

describe('getPreset', () => {
  it('returns truePhysical preset', () => {
    const preset = getPreset('truePhysical');
    expect(preset).toBe(PRESET_TRUE_PHYSICAL);
  });

  it('returns planetRatio preset', () => {
    const preset = getPreset('planetRatio');
    expect(preset).toBe(PRESET_PLANET_RATIO);
  });

  it('returns schoolModel preset', () => {
    const preset = getPreset('schoolModel');
    expect(preset).toBe(PRESET_SCHOOL_MODEL);
  });

  it('returns trueSizes preset', () => {
    const preset = getPreset('trueSizes');
    expect(preset).toBe(PRESET_TRUE_SIZES);
  });

  it('returns explorer preset', () => {
    const preset = getPreset('explorer');
    expect(preset).toBe(PRESET_EXPLORER);
  });

  it('returns massComparison preset', () => {
    const preset = getPreset('massComparison');
    expect(preset).toBe(PRESET_MASS_COMPARISON);
  });
});

describe('createMapping', () => {
  it('creates a mapping from distance and size configs', () => {
    const mapping = createMapping(DISTANCE_LINEAR, SIZE_NORMALIZED);
    expect(mapping.distanceScale).toBe(DISTANCE_LINEAR);
    expect(mapping.sizeScale).toBe(SIZE_NORMALIZED);
  });

  it('creates custom mapping configurations', () => {
    const distanceScale = { kind: 'linear' as const, auToScene: 10 };
    const sizeScale = {
      kind: 'realRelativeToMercury' as const,
      mercuryRadiusScene: 0.05,
    };
    const mapping = createMapping(distanceScale, sizeScale);
    expect(mapping.distanceScale).toEqual(distanceScale);
    expect(mapping.sizeScale).toEqual(sizeScale);
  });
});

describe('createMappingFromSimple', () => {
  describe('distance scale selection', () => {
    it('uses log distance for log scale', () => {
      const mapping = createMappingFromSimple('log', 'normalized');
      expect(mapping.distanceScale.kind).toBe('log10');
    });

    it('uses linear ratio distance for real size with real distance', () => {
      const mapping = createMappingFromSimple('real', 'real');
      expect(mapping.distanceScale.kind).toBe('linear');
      expect(
        (mapping.distanceScale as { kind: 'linear'; auToScene: number }).auToScene
      ).toBe(20);
    });

    it('uses standard linear distance for physical size with real distance', () => {
      const mapping = createMappingFromSimple('real', 'physical');
      expect(mapping.distanceScale.kind).toBe('linear');
      expect(
        (mapping.distanceScale as { kind: 'linear'; auToScene: number }).auToScene
      ).toBe(3);
    });
  });

  describe('size scale selection', () => {
    it('uses physical size scale for physical', () => {
      const mapping = createMappingFromSimple('real', 'physical');
      expect(mapping.sizeScale.kind).toBe('physical');
    });

    it('uses realRelativeToMercury for real size', () => {
      const mapping = createMappingFromSimple('real', 'real');
      expect(mapping.sizeScale.kind).toBe('realRelativeToMercury');
    });

    it('uses normalizedRelativeToJupiter for normalized size', () => {
      const mapping = createMappingFromSimple('real', 'normalized');
      expect(mapping.sizeScale.kind).toBe('normalizedRelativeToJupiter');
    });
  });

  describe('all combinations', () => {
    it('log + normalized', () => {
      const mapping = createMappingFromSimple('log', 'normalized');
      expect(mapping.distanceScale.kind).toBe('log10');
      expect(mapping.sizeScale.kind).toBe('normalizedRelativeToJupiter');
    });

    it('log + real', () => {
      const mapping = createMappingFromSimple('log', 'real');
      expect(mapping.distanceScale.kind).toBe('log10');
      expect(mapping.sizeScale.kind).toBe('realRelativeToMercury');
    });

    it('log + physical', () => {
      const mapping = createMappingFromSimple('log', 'physical');
      expect(mapping.distanceScale.kind).toBe('log10');
      expect(mapping.sizeScale.kind).toBe('physical');
    });

    it('real + normalized', () => {
      const mapping = createMappingFromSimple('real', 'normalized');
      expect(mapping.distanceScale.kind).toBe('linear');
      expect(mapping.sizeScale.kind).toBe('normalizedRelativeToJupiter');
    });
  });
});

describe('physical scale invariants', () => {
  it('Moon orbit is outside Earth in true physical scale', () => {
    // Physical ratio: D_Moon / R_Earth ~ 60.3 (mean distance)
    // This test ensures our scale factors would preserve this ratio

    const EARTH_RADIUS_KM = 6371;
    const MOON_MEAN_DISTANCE_KM = 384400;
    const physicalRatio = MOON_MEAN_DISTANCE_KM / EARTH_RADIUS_KM;

    // With physical scale, scene ratio should match physical ratio
    const mapping = createPhysicalMapping(AU_TO_SCENE);
    const kmToScene = (mapping.sizeScale as { kind: 'physical'; kmToScene: number })
      .kmToScene;

    const earthRadiusScene = EARTH_RADIUS_KM * kmToScene;
    const moonDistanceScene = MOON_MEAN_DISTANCE_KM * kmToScene;
    const sceneRatio = moonDistanceScene / earthRadiusScene;

    // Scene ratio should exactly match physical ratio
    expect(sceneRatio).toBeCloseTo(physicalRatio, 10);
    // And Moon should definitely be outside Earth (ratio > 1)
    expect(sceneRatio).toBeGreaterThan(50);
    expect(sceneRatio).toBeLessThan(70);
  });

  it('Earth radius matches AU scale in true physical scale', () => {
    // R_Earth_scene / 1_AU_scene = R_Earth_km / AU_km
    const EARTH_RADIUS_KM = 6371;

    const mapping = createPhysicalMapping(AU_TO_SCENE);
    const auToScene = (mapping.distanceScale as { kind: 'linear'; auToScene: number })
      .auToScene;
    const kmToScene = (mapping.sizeScale as { kind: 'physical'; kmToScene: number })
      .kmToScene;

    const earthRadiusScene = EARTH_RADIUS_KM * kmToScene;
    const oneAuScene = auToScene;

    const earthRadiusRatio = earthRadiusScene / oneAuScene;
    const physicalRatio = EARTH_RADIUS_KM / AU_KM;

    expect(earthRadiusRatio).toBeCloseTo(physicalRatio, 15);
  });

  it('Saturn ring outer radius ratio is correct in true physical scale', () => {
    const SATURN_RADIUS_KM = 58232;
    const SATURN_RING_OUTER_KM = 136780; // F ring outer edge
    const physicalRatio = SATURN_RING_OUTER_KM / SATURN_RADIUS_KM;

    const mapping = createPhysicalMapping(AU_TO_SCENE);
    const kmToScene = (mapping.sizeScale as { kind: 'physical'; kmToScene: number })
      .kmToScene;

    const saturnRadiusScene = SATURN_RADIUS_KM * kmToScene;
    const ringOuterScene = SATURN_RING_OUTER_KM * kmToScene;
    const sceneRatio = ringOuterScene / saturnRadiusScene;

    expect(sceneRatio).toBeCloseTo(physicalRatio, 10);
  });
});
