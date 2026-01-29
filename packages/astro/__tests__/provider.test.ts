/**
 * Tests for ephemeris provider.
 */
import { describe, it, expect } from 'vitest';
import {
  AstronomyEngineProvider,
  PLANET_IDS,
  getPlanetPositions,
  getMoonPosition,
  getSolarSystemRender,
  getMoonRender,
  getMoonPhase,
} from '../src/ephemeris/provider';
import {
  PRESET_TRUE_PHYSICAL,
  PRESET_EXPLORER,
  PRESET_TRUE_SIZES,
  PRESET_MASS_COMPARISON,
  PRESET_SCHOOL_MODEL,
  createMapping,
  DISTANCE_LINEAR,
  SIZE_RATIO_SUN,
} from '../src/scale/mapping';
import type { RenderMapping, SizeScaleConfig } from '../src/types';
import { magnitude } from '../src/frames/transforms';

describe('AstronomyEngineProvider', () => {
  const provider = new AstronomyEngineProvider();
  const epoch = new Date('2024-06-15T12:00:00Z');

  describe('getHeliocentricState', () => {
    it('returns Sun at origin', () => {
      const state = provider.getHeliocentricState('Sun', epoch, 'ECLIPJ2000');
      expect(state.position.x).toBeCloseTo(0, 10);
      expect(state.position.y).toBeCloseTo(0, 10);
      expect(state.position.z).toBeCloseTo(0, 10);
      expect(state.unit).toBe('AU');
    });

    it('returns Earth at ~1 AU', () => {
      const state = provider.getHeliocentricState('Earth', epoch, 'ECLIPJ2000');
      const distance = magnitude(state.position);
      expect(distance).toBeGreaterThan(0.98);
      expect(distance).toBeLessThan(1.02);
    });

    it('returns Mars at 1.38-1.67 AU', () => {
      const state = provider.getHeliocentricState('Mars', epoch, 'ECLIPJ2000');
      const distance = magnitude(state.position);
      expect(distance).toBeGreaterThan(1.3);
      expect(distance).toBeLessThan(1.7);
    });

    it('returns Jupiter at 4.95-5.46 AU', () => {
      const state = provider.getHeliocentricState('Jupiter', epoch, 'ECLIPJ2000');
      const distance = magnitude(state.position);
      expect(distance).toBeGreaterThan(4.9);
      expect(distance).toBeLessThan(5.5);
    });

    it('supports EQJ frame', () => {
      const state = provider.getHeliocentricState('Earth', epoch, 'EQJ');
      expect(state.frame).toBe('EQJ');
      const distance = magnitude(state.position);
      expect(distance).toBeGreaterThan(0.98);
      expect(distance).toBeLessThan(1.02);
    });
  });

  describe('getGeocentricState', () => {
    it('returns Moon position relative to Earth', () => {
      const state = provider.getGeocentricState('Moon', epoch, 'ECLIPJ2000');
      const distance = magnitude(state.position);
      // Moon is about 0.00257 AU from Earth
      expect(distance).toBeGreaterThan(0.002);
      expect(distance).toBeLessThan(0.003);
    });

    it('supports EQJ frame', () => {
      const state = provider.getGeocentricState('Moon', epoch, 'EQJ');
      expect(state.frame).toBe('EQJ');
    });
  });

  describe('getAxisOrientation', () => {
    it('returns Earth axis orientation', () => {
      const { northPole, rotationAngleDeg } = provider.getAxisOrientation('Earth', epoch);
      expect(magnitude(northPole)).toBeCloseTo(1, 5);
      // rotationAngleDeg is raw spin angle from Astronomy Engine (not normalized)
      expect(typeof rotationAngleDeg).toBe('number');
    });

    it('returns Sun orientation', () => {
      const { northPole, rotationAngleDeg } = provider.getAxisOrientation('Sun', epoch);
      expect(magnitude(northPole)).toBeCloseTo(1, 5);
      // Sun returns fallback values
      expect(rotationAngleDeg).toBe(0);
    });
  });

  describe('getBodyOrientation', () => {
    it('returns complete orientation for Earth', () => {
      const orientation = provider.getBodyOrientation('Earth', epoch);
      expect(orientation.northPole).toBeDefined();
      expect(orientation.rotationAngleDeg).toBeGreaterThanOrEqual(0);
      expect(orientation.rotationAngleDeg).toBeLessThan(360);
      expect(orientation.siderealPeriodHours).toBeGreaterThan(0);
    });

    it('returns orientation for all planets', () => {
      for (const planetId of PLANET_IDS) {
        const orientation = provider.getBodyOrientation(planetId, epoch);
        expect(orientation.northPole).toBeDefined();
        expect(magnitude(orientation.northPole)).toBeCloseTo(1, 3);
      }
    });

    it('returns consistent rotation over time', () => {
      const t1 = new Date('2024-06-15T00:00:00Z');
      const t2 = new Date('2024-06-15T12:00:00Z');
      const o1 = provider.getBodyOrientation('Earth', t1);
      const o2 = provider.getBodyOrientation('Earth', t2);
      // Earth rotates ~180 degrees in 12 hours
      const diff = Math.abs(o2.rotationAngleDeg - o1.rotationAngleDeg);
      expect(diff).toBeGreaterThan(150);
      expect(diff).toBeLessThan(210);
    });
  });
});

describe('helper functions', () => {
  describe('PLANET_IDS', () => {
    it('contains all 8 planets', () => {
      expect(PLANET_IDS).toHaveLength(8);
      expect(PLANET_IDS).toContain('Mercury');
      expect(PLANET_IDS).toContain('Neptune');
    });
  });

  describe('getPlanetPositions', () => {
    it('returns positions for all planets', () => {
      const positions = getPlanetPositions(new Date());
      expect(positions.size).toBe(8);
      for (const planetId of PLANET_IDS) {
        expect(positions.has(planetId)).toBe(true);
      }
    });

    it('uses default provider', () => {
      const positions = getPlanetPositions();
      expect(positions.size).toBe(8);
    });
  });

  describe('getMoonPosition', () => {
    it('returns Moon geocentric position', () => {
      const state = getMoonPosition(new Date());
      const distance = magnitude(state.position);
      expect(distance).toBeGreaterThan(0.002);
      expect(distance).toBeLessThan(0.003);
    });
  });

  describe('getMoonPhase', () => {
    it('returns phase between 0 and 1', () => {
      const phase = getMoonPhase(new Date());
      expect(phase).toBeGreaterThanOrEqual(0);
      expect(phase).toBeLessThan(1);
    });

    it('returns ~0 or ~1 at new moon', () => {
      // January 11, 2024 was a new moon
      // Phase wraps from ~1 back to ~0 at new moon
      const phase = getMoonPhase(new Date('2024-01-11T11:57:00Z'));
      const nearNewMoon = phase < 0.05 || phase > 0.95;
      expect(nearNewMoon).toBe(true);
    });

    it('returns ~0.5 at full moon', () => {
      // January 25, 2024 was a full moon
      const phase = getMoonPhase(new Date('2024-01-25T17:54:00Z'));
      expect(phase).toBeGreaterThan(0.45);
      expect(phase).toBeLessThan(0.55);
    });
  });
});

describe('getSolarSystemRender', () => {
  const epoch = new Date('2024-06-15T12:00:00Z');

  it('returns Sun + 8 planets', () => {
    const mapping = PRESET_TRUE_PHYSICAL;
    const bodies = getSolarSystemRender(epoch, mapping);
    expect(bodies).toHaveLength(9);
    expect(bodies[0].id).toBe('Sun');
  });

  it('Sun is at origin', () => {
    const mapping = PRESET_TRUE_PHYSICAL;
    const bodies = getSolarSystemRender(epoch, mapping);
    const sun = bodies[0];
    expect(sun.position.x).toBeCloseTo(0, 10);
    expect(sun.position.y).toBeCloseTo(0, 10);
    expect(sun.position.z).toBeCloseTo(0, 10);
  });

  it('planets are at increasing distances', () => {
    const mapping = PRESET_TRUE_PHYSICAL;
    const bodies = getSolarSystemRender(epoch, mapping);
    let prevDistance = 0;
    for (let i = 1; i < bodies.length; i++) {
      expect(bodies[i].distanceAu).toBeGreaterThan(prevDistance);
      prevDistance = bodies[i].distanceAu;
    }
  });

  it('includes visual properties', () => {
    const mapping = PRESET_TRUE_PHYSICAL;
    const bodies = getSolarSystemRender(epoch, mapping);
    for (const body of bodies) {
      expect(body.color).toBeDefined();
      expect(body.radiusScene).toBeGreaterThan(0);
    }
  });

  it('works with explorer mapping', () => {
    const mapping = PRESET_EXPLORER;
    const bodies = getSolarSystemRender(epoch, mapping);
    expect(bodies).toHaveLength(9);
  });

  it('works with true sizes mapping (exaggerated sizes + log distances)', () => {
    const mapping = PRESET_TRUE_SIZES;
    const bodies = getSolarSystemRender(epoch, mapping);
    expect(bodies).toHaveLength(9);
    // Bodies should not overlap due to size-based offset
    for (let i = 1; i < bodies.length; i++) {
      expect(bodies[i].distanceScene).toBeGreaterThan(bodies[i - 1].distanceScene);
    }
  });

  it('works with mass comparison mapping', () => {
    const mapping = PRESET_MASS_COMPARISON;
    const bodies = getSolarSystemRender(epoch, mapping);
    expect(bodies).toHaveLength(9);
    // All bodies should have valid radii based on mass
    for (const body of bodies) {
      expect(body.radiusScene).toBeGreaterThan(0);
    }
  });

  it('works with school model mapping', () => {
    const mapping = PRESET_SCHOOL_MODEL;
    const bodies = getSolarSystemRender(epoch, mapping);
    expect(bodies).toHaveLength(9);
    // Sun should be smaller than true ratio to Jupiter
    const sun = bodies.find((b) => b.id === 'Sun')!;
    const jupiter = bodies.find((b) => b.id === 'Jupiter')!;
    // In school model, Sun is ~3x Jupiter instead of ~10x
    expect(sun.radiusScene / jupiter.radiusScene).toBeLessThan(5);
  });

  it('works with realRelativeToSun size scale', () => {
    const mapping = createMapping(DISTANCE_LINEAR, SIZE_RATIO_SUN);
    const bodies = getSolarSystemRender(epoch, mapping);
    expect(bodies).toHaveLength(9);
    // All planets should have valid radii based on Sun ratio
    for (const body of bodies) {
      expect(body.radiusScene).toBeGreaterThan(0);
    }
    // Sun should have the configured radius
    const sun = bodies.find((b) => b.id === 'Sun')!;
    expect(sun.radiusScene).toBeCloseTo(0.25, 2);
  });

  it('works with custom radius metric', () => {
    const sizeScale: SizeScaleConfig = {
      kind: 'customMetric',
      metric: 'radius',
      referenceBody: 'Earth',
      referenceRadiusScene: 0.05,
    };
    const mapping: RenderMapping = { distanceScale: DISTANCE_LINEAR, sizeScale };
    const bodies = getSolarSystemRender(epoch, mapping);
    expect(bodies).toHaveLength(9);
    const earth = bodies.find((b) => b.id === 'Earth')!;
    expect(earth.radiusScene).toBeCloseTo(0.05, 5);
  });

  it('works with custom diameter metric', () => {
    const sizeScale: SizeScaleConfig = {
      kind: 'customMetric',
      metric: 'diameter',
      referenceBody: 'Earth',
      referenceRadiusScene: 0.05,
    };
    const mapping: RenderMapping = { distanceScale: DISTANCE_LINEAR, sizeScale };
    const bodies = getSolarSystemRender(epoch, mapping);
    expect(bodies).toHaveLength(9);
    const earth = bodies.find((b) => b.id === 'Earth')!;
    expect(earth.radiusScene).toBeCloseTo(0.05, 5);
  });

  it('works with custom volume metric', () => {
    const sizeScale: SizeScaleConfig = {
      kind: 'customMetric',
      metric: 'volume',
      referenceBody: 'Earth',
      referenceRadiusScene: 0.05,
    };
    const mapping: RenderMapping = { distanceScale: DISTANCE_LINEAR, sizeScale };
    const bodies = getSolarSystemRender(epoch, mapping);
    expect(bodies).toHaveLength(9);
    const earth = bodies.find((b) => b.id === 'Earth')!;
    // For volume metric, the reference body should have the reference radius
    expect(earth.radiusScene).toBeCloseTo(0.05, 5);
    // Jupiter should be larger (cube root of volume ratio)
    const jupiter = bodies.find((b) => b.id === 'Jupiter')!;
    expect(jupiter.radiusScene).toBeGreaterThan(earth.radiusScene);
  });
});

describe('getMoonRender', () => {
  const epoch = new Date('2024-06-15T12:00:00Z');

  it('returns Moon relative to Earth', () => {
    const mapping = PRESET_TRUE_PHYSICAL;
    const solarSystem = getSolarSystemRender(epoch, mapping);
    const earth = solarSystem.find((b) => b.id === 'Earth')!;
    const moon = getMoonRender(earth.position, epoch, mapping);

    expect(moon.id).toBe('Moon');
    expect(moon.radiusScene).toBeGreaterThan(0);
  });

  it('Moon is outside Earth in true physical scale', () => {
    const mapping = PRESET_TRUE_PHYSICAL;
    const solarSystem = getSolarSystemRender(epoch, mapping);
    const earth = solarSystem.find((b) => b.id === 'Earth')!;
    const moon = getMoonRender(earth.position, epoch, mapping);

    // Moon should be at least Earth radius away
    expect(moon.distanceScene).toBeGreaterThan(earth.radiusScene);
  });

  it('enforces minimum distance in explorer mode', () => {
    const mapping = PRESET_EXPLORER;
    const solarSystem = getSolarSystemRender(epoch, mapping);
    const earth = solarSystem.find((b) => b.id === 'Earth')!;
    const moon = getMoonRender(earth.position, epoch, mapping);

    // Moon should be visually outside Earth
    expect(moon.distanceScene).toBeGreaterThan(earth.radiusScene * 2);
  });
});
