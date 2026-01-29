/**
 * Tests for ring system data.
 */

import { describe, it, expect } from 'vitest';
import { RING_SYSTEMS, getMainVisibleRings, getRingExtent } from '../src/data/rings';
import { BODY_PHYSICAL } from '../src/data/physical';
import type { RingedBodyId } from '../src/types';

const RINGED_BODIES: RingedBodyId[] = ['Jupiter', 'Saturn', 'Uranus', 'Neptune'];

describe('RING_SYSTEMS', () => {
  describe('all ringed bodies have ring data', () => {
    for (const bodyId of RINGED_BODIES) {
      it(`${bodyId} has ring system`, () => {
        const system = RING_SYSTEMS[bodyId];
        expect(system).toBeDefined();
        expect(system.bodyId).toBe(bodyId);
        expect(system.components.length).toBeGreaterThan(0);
        expect(typeof system.inclination).toBe('number');
      });
    }
  });

  describe('ring component ordering', () => {
    for (const bodyId of RINGED_BODIES) {
      it(`${bodyId} rings have inner < outer for each component`, () => {
        const system = RING_SYSTEMS[bodyId];
        for (const component of system.components) {
          expect(component.innerRadiusKm).toBeLessThan(component.outerRadiusKm);
        }
      });
    }
  });

  describe('ring components have valid properties', () => {
    for (const bodyId of RINGED_BODIES) {
      it(`${bodyId} ring components are valid`, () => {
        const system = RING_SYSTEMS[bodyId];
        for (const component of system.components) {
          expect(component.name).toBeDefined();
          expect(component.innerRadiusKm).toBeGreaterThan(0);
          expect(component.outerRadiusKm).toBeGreaterThan(0);
          expect(component.opticalDepth).toBeGreaterThanOrEqual(0);
          expect(component.source).toBeDefined();
        }
      });
    }
  });

  describe('rings are outside planet surface', () => {
    for (const bodyId of RINGED_BODIES) {
      it(`${bodyId} innermost ring is outside planet`, () => {
        const system = RING_SYSTEMS[bodyId];
        const planetRadius = BODY_PHYSICAL[bodyId].radiusEquatorialKm;
        const innermostRing = Math.min(...system.components.map((c) => c.innerRadiusKm));
        expect(innermostRing).toBeGreaterThan(planetRadius);
      });
    }
  });

  describe('inclinations match body obliquity', () => {
    for (const bodyId of RINGED_BODIES) {
      it(`${bodyId} ring inclination matches obliquity`, () => {
        const system = RING_SYSTEMS[bodyId];
        const obliquity = BODY_PHYSICAL[bodyId].obliquityDeg;
        expect(system.inclination).toBeCloseTo(obliquity, 1);
      });
    }
  });
});

describe('Saturn rings specifically', () => {
  const saturn = RING_SYSTEMS.Saturn;

  it('has major ring components', () => {
    const names = saturn.components.map((c) => c.name);
    expect(names).toContain('B Ring');
    expect(names).toContain('A Ring');
    expect(names).toContain('Cassini Division');
  });

  it('Cassini Division is between B and A rings', () => {
    const bRing = saturn.components.find((c) => c.name === 'B Ring')!;
    const cassini = saturn.components.find((c) => c.name === 'Cassini Division')!;
    const aRing = saturn.components.find((c) => c.name === 'A Ring')!;

    expect(cassini.innerRadiusKm).toBeGreaterThanOrEqual(bRing.outerRadiusKm);
    expect(cassini.outerRadiusKm).toBeLessThanOrEqual(aRing.innerRadiusKm);
  });

  it('B ring is densest (highest optical depth)', () => {
    const bRing = saturn.components.find((c) => c.name === 'B Ring')!;
    for (const component of saturn.components) {
      expect(bRing.opticalDepth).toBeGreaterThanOrEqual(component.opticalDepth);
    }
  });

  it('E ring is largest (extends furthest)', () => {
    const eRing = saturn.components.find((c) => c.name === 'E Ring')!;
    for (const component of saturn.components) {
      expect(eRing.outerRadiusKm).toBeGreaterThanOrEqual(component.outerRadiusKm);
    }
  });
});

describe('getMainVisibleRings', () => {
  it('returns rings for Saturn', () => {
    const rings = getMainVisibleRings('Saturn');
    expect(rings.length).toBeGreaterThan(0);
    const names = rings.map((r) => r.name);
    expect(names).toContain('B Ring');
    expect(names).toContain('A Ring');
  });

  it('returns main ring for Jupiter', () => {
    const rings = getMainVisibleRings('Jupiter');
    expect(rings.length).toBeGreaterThan(0);
    expect(rings[0].name).toBe('Main Ring');
  });

  it('returns epsilon ring for Uranus', () => {
    const rings = getMainVisibleRings('Uranus');
    expect(rings.length).toBeGreaterThan(0);
    expect(rings[0].name).toBe('Epsilon Ring');
  });

  it('returns Adams ring for Neptune', () => {
    const rings = getMainVisibleRings('Neptune');
    expect(rings.length).toBeGreaterThan(0);
    expect(rings[0].name).toBe('Adams Ring');
  });
});

describe('getRingExtent', () => {
  for (const bodyId of RINGED_BODIES) {
    it(`${bodyId} extent inner < outer`, () => {
      const extent = getRingExtent(bodyId);
      expect(extent.inner).toBeGreaterThan(0);
      expect(extent.outer).toBeGreaterThan(extent.inner);
    });
  }

  it('Saturn has largest ring extent', () => {
    const saturnExtent = getRingExtent('Saturn');
    for (const bodyId of RINGED_BODIES) {
      if (bodyId !== 'Saturn') {
        const extent = getRingExtent(bodyId);
        expect(saturnExtent.outer).toBeGreaterThan(extent.outer);
      }
    }
  });
});
