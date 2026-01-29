/**
 * Tests for asteroid and debris belt definitions.
 */

import { describe, it, expect } from 'vitest';
import {
  MAIN_ASTEROID_BELT,
  KUIPER_BELT,
  SCATTERED_DISC,
  JUPITER_TROJANS_L4,
  JUPITER_TROJANS_L5,
  ALL_BELTS,
  generateBeltPoints,
  generateTrojanPoints,
} from '../src/data/belts';
import { SEMI_MAJOR_AXIS_AU } from '../src/data/physical';

describe('belt definitions', () => {
  describe('MAIN_ASTEROID_BELT', () => {
    it('has valid properties', () => {
      expect(MAIN_ASTEROID_BELT.name).toBeDefined();
      expect(MAIN_ASTEROID_BELT.innerRadiusAu).toBeGreaterThan(0);
      expect(MAIN_ASTEROID_BELT.outerRadiusAu).toBeGreaterThan(
        MAIN_ASTEROID_BELT.innerRadiusAu
      );
      expect(MAIN_ASTEROID_BELT.thicknessAu).toBeGreaterThan(0);
      expect(MAIN_ASTEROID_BELT.inclinationSpreadDeg).toBeGreaterThan(0);
      expect(MAIN_ASTEROID_BELT.source).toBeDefined();
    });

    it('is between Mars and Jupiter', () => {
      expect(MAIN_ASTEROID_BELT.innerRadiusAu).toBeGreaterThan(SEMI_MAJOR_AXIS_AU.Mars);
      expect(MAIN_ASTEROID_BELT.outerRadiusAu).toBeLessThan(SEMI_MAJOR_AXIS_AU.Jupiter);
    });
  });

  describe('KUIPER_BELT', () => {
    it('has valid properties', () => {
      expect(KUIPER_BELT.innerRadiusAu).toBeGreaterThan(0);
      expect(KUIPER_BELT.outerRadiusAu).toBeGreaterThan(KUIPER_BELT.innerRadiusAu);
    });

    it('starts near Neptune orbit', () => {
      // Kuiper Belt inner edge is approximately at Neptune's orbit (30 AU)
      expect(KUIPER_BELT.innerRadiusAu).toBeCloseTo(SEMI_MAJOR_AXIS_AU.Neptune, 0);
    });

    it('extends to about 50 AU', () => {
      expect(KUIPER_BELT.outerRadiusAu).toBeGreaterThan(45);
      expect(KUIPER_BELT.outerRadiusAu).toBeLessThan(55);
    });
  });

  describe('SCATTERED_DISC', () => {
    it('extends further than Kuiper Belt', () => {
      expect(SCATTERED_DISC.outerRadiusAu).toBeGreaterThan(KUIPER_BELT.outerRadiusAu);
    });

    it('has larger vertical extent', () => {
      expect(SCATTERED_DISC.thicknessAu).toBeGreaterThan(KUIPER_BELT.thicknessAu);
    });
  });

  describe('JUPITER_TROJANS', () => {
    it('L4 and L5 have same orbital distance', () => {
      expect(JUPITER_TROJANS_L4.innerRadiusAu).toBe(JUPITER_TROJANS_L5.innerRadiusAu);
      expect(JUPITER_TROJANS_L4.outerRadiusAu).toBe(JUPITER_TROJANS_L5.outerRadiusAu);
    });

    it('are near Jupiter orbit', () => {
      const jupiterA = SEMI_MAJOR_AXIS_AU.Jupiter;
      expect(JUPITER_TROJANS_L4.innerRadiusAu).toBeCloseTo(jupiterA, 0);
      expect(JUPITER_TROJANS_L4.outerRadiusAu).toBeCloseTo(jupiterA, 0);
    });
  });

  describe('ALL_BELTS', () => {
    it('contains all belt definitions', () => {
      expect(ALL_BELTS).toContain(MAIN_ASTEROID_BELT);
      expect(ALL_BELTS).toContain(KUIPER_BELT);
      expect(ALL_BELTS).toContain(SCATTERED_DISC);
      expect(ALL_BELTS).toContain(JUPITER_TROJANS_L4);
      expect(ALL_BELTS).toContain(JUPITER_TROJANS_L5);
      expect(ALL_BELTS.length).toBe(5);
    });
  });
});

describe('generateBeltPoints', () => {
  it('generates requested number of points', () => {
    const points = generateBeltPoints(MAIN_ASTEROID_BELT, 100);
    expect(points.length).toBe(100);
  });

  it('points are within belt bounds', () => {
    const points = generateBeltPoints(MAIN_ASTEROID_BELT, 1000);
    const rInner = MAIN_ASTEROID_BELT.innerRadiusAu;
    const rOuter = MAIN_ASTEROID_BELT.outerRadiusAu;

    for (const [x, , z] of points) {
      const r = Math.sqrt(x * x + z * z);
      expect(r).toBeGreaterThanOrEqual(rInner * 0.99);
      expect(r).toBeLessThanOrEqual(rOuter * 1.01);
    }
  });

  it('is deterministic with same seed', () => {
    const points1 = generateBeltPoints(MAIN_ASTEROID_BELT, 10, 42);
    const points2 = generateBeltPoints(MAIN_ASTEROID_BELT, 10, 42);

    for (let i = 0; i < 10; i++) {
      expect(points1[i][0]).toBe(points2[i][0]);
      expect(points1[i][1]).toBe(points2[i][1]);
      expect(points1[i][2]).toBe(points2[i][2]);
    }
  });

  it('different seeds produce different points', () => {
    const points1 = generateBeltPoints(MAIN_ASTEROID_BELT, 10, 42);
    const points2 = generateBeltPoints(MAIN_ASTEROID_BELT, 10, 43);

    let allSame = true;
    for (let i = 0; i < 10; i++) {
      if (points1[i][0] !== points2[i][0]) {
        allSame = false;
        break;
      }
    }
    expect(allSame).toBe(false);
  });

  it('points have vertical spread', () => {
    const points = generateBeltPoints(KUIPER_BELT, 1000);
    const yValues = points.map((p) => p[1]);
    const maxY = Math.max(...yValues);
    const minY = Math.min(...yValues);

    expect(maxY).toBeGreaterThan(0);
    expect(minY).toBeLessThan(0);
  });

  it('handles zero count', () => {
    const points = generateBeltPoints(MAIN_ASTEROID_BELT, 0);
    expect(points.length).toBe(0);
  });

  it('points are valid numbers (no NaN)', () => {
    const points = generateBeltPoints(MAIN_ASTEROID_BELT, 100);
    for (const [x, y, z] of points) {
      expect(Number.isFinite(x)).toBe(true);
      expect(Number.isFinite(y)).toBe(true);
      expect(Number.isFinite(z)).toBe(true);
    }
  });
});

describe('generateTrojanPoints', () => {
  it('generates requested number of points', () => {
    const points = generateTrojanPoints(0, 'L4', 100);
    expect(points.length).toBe(100);
  });

  it('L4 points are ahead of Jupiter (positive angle offset)', () => {
    const jupiterAngle = 0;
    const points = generateTrojanPoints(jupiterAngle, 'L4', 100);

    // L4 is 60 degrees ahead, so most points should have positive angle
    let aheadCount = 0;
    for (const [x, , z] of points) {
      const angle = Math.atan2(z, x);
      if (angle > 0 && angle < Math.PI) {
        aheadCount++;
      }
    }
    expect(aheadCount).toBeGreaterThan(50);
  });

  it('L5 points are behind Jupiter (negative angle offset)', () => {
    const jupiterAngle = 0;
    const points = generateTrojanPoints(jupiterAngle, 'L5', 100);

    // L5 is 60 degrees behind
    let behindCount = 0;
    for (const [x, , z] of points) {
      const angle = Math.atan2(z, x);
      if (angle < 0 || angle > Math.PI) {
        behindCount++;
      }
    }
    expect(behindCount).toBeGreaterThan(50);
  });

  it('points are near Jupiter orbital distance', () => {
    const points = generateTrojanPoints(0, 'L4', 100);
    const jupiterR = 5.2;

    for (const [x, , z] of points) {
      const r = Math.sqrt(x * x + z * z);
      expect(r).toBeGreaterThan(jupiterR - 1);
      expect(r).toBeLessThan(jupiterR + 1);
    }
  });

  it('is deterministic with same seed', () => {
    const points1 = generateTrojanPoints(0, 'L4', 10, 42);
    const points2 = generateTrojanPoints(0, 'L4', 10, 42);

    for (let i = 0; i < 10; i++) {
      expect(points1[i][0]).toBe(points2[i][0]);
      expect(points1[i][1]).toBe(points2[i][1]);
      expect(points1[i][2]).toBe(points2[i][2]);
    }
  });

  it('points move with Jupiter angle', () => {
    const points1 = generateTrojanPoints(0, 'L4', 100, 42);
    const points2 = generateTrojanPoints(Math.PI / 2, 'L4', 100, 42);

    // Points should be rotated by ~90 degrees
    const angle1 = Math.atan2(points1[0][2], points1[0][0]);
    const angle2 = Math.atan2(points2[0][2], points2[0][0]);
    const angleDiff = Math.abs(angle2 - angle1);

    expect(angleDiff).toBeGreaterThan(Math.PI / 3);
    expect(angleDiff).toBeLessThan((2 * Math.PI) / 3);
  });

  it('points are valid numbers (no NaN)', () => {
    const points = generateTrojanPoints(0, 'L4', 100);
    for (const [x, y, z] of points) {
      expect(Number.isFinite(x)).toBe(true);
      expect(Number.isFinite(y)).toBe(true);
      expect(Number.isFinite(z)).toBe(true);
    }
  });
});
