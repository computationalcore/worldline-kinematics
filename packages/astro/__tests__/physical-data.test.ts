/**
 * Tests for body physical properties.
 */

import { describe, it, expect } from 'vitest';
import {
  BODY_PHYSICAL,
  BODY_VISUAL,
  ORBITAL_VELOCITY_KMS,
  EQUATORIAL_ROTATION_KMH,
  SEMI_MAJOR_AXIS_AU,
  ORBITAL_INCLINATION_DEG,
} from '../src/data/physical';
import type { BodyId } from '../src/types';

const ALL_BODIES: BodyId[] = [
  'Sun',
  'Mercury',
  'Venus',
  'Earth',
  'Moon',
  'Mars',
  'Jupiter',
  'Saturn',
  'Uranus',
  'Neptune',
];

describe('BODY_PHYSICAL', () => {
  describe('all bodies have required properties', () => {
    for (const bodyId of ALL_BODIES) {
      it(`${bodyId} has valid physical properties`, () => {
        const props = BODY_PHYSICAL[bodyId];
        expect(props).toBeDefined();
        expect(props.id).toBe(bodyId);
        expect(props.radiusMeanKm).toBeGreaterThan(0);
        expect(props.radiusEquatorialKm).toBeGreaterThan(0);
        expect(props.massKg).toBeGreaterThan(0);
        expect(props.gmKm3s2).toBeGreaterThan(0);
        expect(props.densityGcm3).toBeGreaterThan(0);
        expect(typeof props.siderealRotationHours).toBe('number');
        expect(typeof props.obliquityDeg).toBe('number');
        expect(props.source).toBeDefined();
      });
    }
  });

  describe('physical sanity checks', () => {
    it('Sun is largest body', () => {
      const sunRadius = BODY_PHYSICAL.Sun.radiusMeanKm;
      for (const bodyId of ALL_BODIES) {
        if (bodyId !== 'Sun') {
          expect(BODY_PHYSICAL[bodyId].radiusMeanKm).toBeLessThan(sunRadius);
        }
      }
    });

    it('Sun is most massive body', () => {
      const sunMass = BODY_PHYSICAL.Sun.massKg;
      for (const bodyId of ALL_BODIES) {
        if (bodyId !== 'Sun') {
          expect(BODY_PHYSICAL[bodyId].massKg).toBeLessThan(sunMass);
        }
      }
    });

    it('Jupiter is largest planet', () => {
      const jupiterRadius = BODY_PHYSICAL.Jupiter.radiusMeanKm;
      const planets = ALL_BODIES.filter((b) => b !== 'Sun' && b !== 'Moon');
      for (const bodyId of planets) {
        if (bodyId !== 'Jupiter') {
          expect(BODY_PHYSICAL[bodyId].radiusMeanKm).toBeLessThan(jupiterRadius);
        }
      }
    });

    it('Moon is smaller than Earth', () => {
      expect(BODY_PHYSICAL.Moon.radiusMeanKm).toBeLessThan(
        BODY_PHYSICAL.Earth.radiusMeanKm
      );
    });

    it('equatorial radius >= polar radius for oblate bodies', () => {
      for (const bodyId of ALL_BODIES) {
        const props = BODY_PHYSICAL[bodyId];
        if (props.radiusPolarKm) {
          expect(props.radiusEquatorialKm).toBeGreaterThanOrEqual(props.radiusPolarKm);
        }
      }
    });

    it('Saturn has lowest density (less than water)', () => {
      expect(BODY_PHYSICAL.Saturn.densityGcm3).toBeLessThan(1.0);
    });

    it('Venus and Uranus have retrograde rotation (negative hours)', () => {
      expect(BODY_PHYSICAL.Venus.siderealRotationHours).toBeLessThan(0);
      expect(BODY_PHYSICAL.Uranus.siderealRotationHours).toBeLessThan(0);
    });

    it('Venus has extreme obliquity (nearly upside down)', () => {
      expect(BODY_PHYSICAL.Venus.obliquityDeg).toBeGreaterThan(170);
    });

    it('Uranus has extreme obliquity (nearly sideways)', () => {
      expect(BODY_PHYSICAL.Uranus.obliquityDeg).toBeGreaterThan(90);
    });
  });

  describe('known values', () => {
    it('Earth radius is about 6371 km', () => {
      expect(BODY_PHYSICAL.Earth.radiusMeanKm).toBeCloseTo(6371, 0);
    });

    it('Earth mass is about 5.97e24 kg', () => {
      expect(BODY_PHYSICAL.Earth.massKg).toBeCloseTo(5.97e24, -22);
    });

    it('Earth obliquity is about 23.4 degrees', () => {
      expect(BODY_PHYSICAL.Earth.obliquityDeg).toBeCloseTo(23.44, 1);
    });

    it('Sun radius is about 109 Earth radii', () => {
      const ratio = BODY_PHYSICAL.Sun.radiusMeanKm / BODY_PHYSICAL.Earth.radiusMeanKm;
      expect(ratio).toBeGreaterThan(100);
      expect(ratio).toBeLessThan(120);
    });
  });
});

describe('BODY_VISUAL', () => {
  for (const bodyId of ALL_BODIES) {
    it(`${bodyId} has valid visual properties`, () => {
      const props = BODY_VISUAL[bodyId];
      expect(props).toBeDefined();
      expect(props.id).toBe(bodyId);
      expect(props.color).toMatch(/^#[0-9a-fA-F]{6}$/);
    });
  }

  it('giant planets have rings', () => {
    expect(BODY_VISUAL.Jupiter.hasRings).toBe(true);
    expect(BODY_VISUAL.Saturn.hasRings).toBe(true);
    expect(BODY_VISUAL.Uranus.hasRings).toBe(true);
    expect(BODY_VISUAL.Neptune.hasRings).toBe(true);
  });
});

describe('ORBITAL_VELOCITY_KMS', () => {
  it('all bodies have orbital velocity', () => {
    for (const bodyId of ALL_BODIES) {
      expect(typeof ORBITAL_VELOCITY_KMS[bodyId]).toBe('number');
    }
  });

  it('Sun has zero orbital velocity (reference frame)', () => {
    expect(ORBITAL_VELOCITY_KMS.Sun).toBe(0);
  });

  it('inner planets are faster than outer planets', () => {
    expect(ORBITAL_VELOCITY_KMS.Mercury).toBeGreaterThan(ORBITAL_VELOCITY_KMS.Venus);
    expect(ORBITAL_VELOCITY_KMS.Venus).toBeGreaterThan(ORBITAL_VELOCITY_KMS.Earth);
    expect(ORBITAL_VELOCITY_KMS.Earth).toBeGreaterThan(ORBITAL_VELOCITY_KMS.Mars);
    expect(ORBITAL_VELOCITY_KMS.Mars).toBeGreaterThan(ORBITAL_VELOCITY_KMS.Jupiter);
  });

  it('Earth orbital velocity is about 30 km/s', () => {
    expect(ORBITAL_VELOCITY_KMS.Earth).toBeCloseTo(29.78, 1);
  });
});

describe('SEMI_MAJOR_AXIS_AU', () => {
  it('all bodies have semi-major axis', () => {
    for (const bodyId of ALL_BODIES) {
      expect(typeof SEMI_MAJOR_AXIS_AU[bodyId]).toBe('number');
    }
  });

  it('Earth is at 1 AU', () => {
    expect(SEMI_MAJOR_AXIS_AU.Earth).toBe(1.0);
  });

  it('planets are in correct order by distance', () => {
    const planets = [
      'Mercury',
      'Venus',
      'Earth',
      'Mars',
      'Jupiter',
      'Saturn',
      'Uranus',
      'Neptune',
    ] as const;
    for (let i = 1; i < planets.length; i++) {
      expect(SEMI_MAJOR_AXIS_AU[planets[i]]).toBeGreaterThan(
        SEMI_MAJOR_AXIS_AU[planets[i - 1]]
      );
    }
  });
});

describe('ORBITAL_INCLINATION_DEG', () => {
  it('Earth has zero inclination (reference plane)', () => {
    expect(ORBITAL_INCLINATION_DEG.Earth).toBe(0);
  });

  it('all inclinations are non-negative', () => {
    for (const bodyId of ALL_BODIES) {
      expect(ORBITAL_INCLINATION_DEG[bodyId]).toBeGreaterThanOrEqual(0);
    }
  });

  it('Mercury has highest inclination among planets', () => {
    const planets = [
      'Mercury',
      'Venus',
      'Mars',
      'Jupiter',
      'Saturn',
      'Uranus',
      'Neptune',
    ] as const;
    for (const planet of planets) {
      if (planet !== 'Mercury') {
        expect(ORBITAL_INCLINATION_DEG.Mercury).toBeGreaterThanOrEqual(
          ORBITAL_INCLINATION_DEG[planet]
        );
      }
    }
  });
});

describe('EQUATORIAL_ROTATION_KMH', () => {
  it('all bodies have rotation speed', () => {
    for (const bodyId of ALL_BODIES) {
      expect(typeof EQUATORIAL_ROTATION_KMH[bodyId]).toBe('number');
      expect(EQUATORIAL_ROTATION_KMH[bodyId]).toBeGreaterThan(0);
    }
  });

  it('Jupiter has fastest rotation', () => {
    for (const bodyId of ALL_BODIES) {
      if (bodyId !== 'Jupiter' && bodyId !== 'Sun') {
        expect(EQUATORIAL_ROTATION_KMH.Jupiter).toBeGreaterThan(
          EQUATORIAL_ROTATION_KMH[bodyId]
        );
      }
    }
  });

  it('Earth rotation is about 1674 km/h', () => {
    expect(EQUATORIAL_ROTATION_KMH.Earth).toBeCloseTo(1674, 0);
  });
});
