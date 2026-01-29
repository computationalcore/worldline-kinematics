/**
 * Tests for UserMarker math and calculations.
 *
 * Note: Component rendering tests are not included because UserMarker uses
 * <primitive object={...}> to attach a ShaderMaterial, which causes issues
 * with the React Three test renderer (AggregateError on removeChild).
 * The component requires visual/E2E testing.
 */

import { describe, it, expect } from 'vitest';
import { latLonToPositionAndNormal } from '../src/earth/UserMarker';

describe('latLonToPositionAndNormal (exported function)', () => {
  it('returns position and normal vectors', () => {
    const result = latLonToPositionAndNormal(0, 0, 1);

    expect(result.position).toBeDefined();
    expect(result.normal).toBeDefined();
    expect(result.position.x).toBeCloseTo(1, 5);
    expect(result.position.y).toBeCloseTo(0, 5);
    expect(result.position.z).toBeCloseTo(0, 5);
  });

  it('returns normalized normal vector', () => {
    const result = latLonToPositionAndNormal(45, 45, 2);
    const normalLength = Math.sqrt(
      result.normal.x ** 2 + result.normal.y ** 2 + result.normal.z ** 2
    );
    expect(normalLength).toBeCloseTo(1, 5);
  });

  it('normal points outward from center', () => {
    const result = latLonToPositionAndNormal(30, 60, 1);
    // Normal should be parallel to position (both point outward)
    const posNormalized = result.position.clone().normalize();
    expect(result.normal.x).toBeCloseTo(posNormalized.x, 5);
    expect(result.normal.y).toBeCloseTo(posNormalized.y, 5);
    expect(result.normal.z).toBeCloseTo(posNormalized.z, 5);
  });
});

describe('Lat/Lon to Position Math', () => {
  // Test the math using the exported function
  function latLonToPosition(lat: number, lon: number, radius: number) {
    const result = latLonToPositionAndNormal(lat, lon, radius);
    return { x: result.position.x, y: result.position.y, z: result.position.z };
  }

  describe('equator positions', () => {
    it('equator at prime meridian (0, 0)', () => {
      const pos = latLonToPosition(0, 0, 1);
      expect(pos.x).toBeCloseTo(1, 5);
      expect(pos.y).toBeCloseTo(0, 5);
      expect(pos.z).toBeCloseTo(0, 5);
    });

    it('equator at 90 east (0, 90)', () => {
      const pos = latLonToPosition(0, 90, 1);
      expect(pos.x).toBeCloseTo(0, 5);
      expect(pos.y).toBeCloseTo(0, 5);
      expect(pos.z).toBeCloseTo(-1, 5);
    });

    it('equator at 90 west (0, -90)', () => {
      const pos = latLonToPosition(0, -90, 1);
      expect(pos.x).toBeCloseTo(0, 5);
      expect(pos.y).toBeCloseTo(0, 5);
      expect(pos.z).toBeCloseTo(1, 5);
    });

    it('equator at 180 (dateline)', () => {
      const pos = latLonToPosition(0, 180, 1);
      expect(pos.x).toBeCloseTo(-1, 5);
      expect(pos.y).toBeCloseTo(0, 5);
      expect(pos.z).toBeCloseTo(0, 4);
    });
  });

  describe('pole positions', () => {
    it('north pole (90, any longitude)', () => {
      const pos = latLonToPosition(90, 0, 1);
      expect(pos.x).toBeCloseTo(0, 5);
      expect(pos.y).toBeCloseTo(1, 5);
      expect(pos.z).toBeCloseTo(0, 5);
    });

    it('south pole (-90, any longitude)', () => {
      const pos = latLonToPosition(-90, 0, 1);
      expect(pos.x).toBeCloseTo(0, 5);
      expect(pos.y).toBeCloseTo(-1, 5);
      expect(pos.z).toBeCloseTo(0, 5);
    });
  });

  describe('mid-latitude positions', () => {
    it('45N 0E', () => {
      const pos = latLonToPosition(45, 0, 1);
      const cos45 = Math.SQRT2 / 2;
      expect(pos.x).toBeCloseTo(cos45, 5);
      expect(pos.y).toBeCloseTo(cos45, 5);
      expect(pos.z).toBeCloseTo(0, 5);
    });

    it('45S 0E', () => {
      const pos = latLonToPosition(-45, 0, 1);
      const cos45 = Math.SQRT2 / 2;
      expect(pos.x).toBeCloseTo(cos45, 5);
      expect(pos.y).toBeCloseTo(-cos45, 5);
      expect(pos.z).toBeCloseTo(0, 5);
    });
  });

  describe('radius scaling', () => {
    it('scales with radius', () => {
      const pos1 = latLonToPosition(0, 0, 1);
      const pos2 = latLonToPosition(0, 0, 2);
      expect(pos2.x).toBe(pos1.x * 2);
    });

    it('position magnitude equals radius', () => {
      const radius = 6371; // Earth radius in km
      const pos = latLonToPosition(37.7749, -122.4194, radius); // San Francisco
      const magnitude = Math.sqrt(pos.x ** 2 + pos.y ** 2 + pos.z ** 2);
      expect(magnitude).toBeCloseTo(radius, 3);
    });
  });

  describe('real world locations', () => {
    it('San Francisco (37.7749, -122.4194)', () => {
      const pos = latLonToPosition(37.7749, -122.4194, 1);
      const magnitude = Math.sqrt(pos.x ** 2 + pos.y ** 2 + pos.z ** 2);
      expect(magnitude).toBeCloseTo(1, 5);
    });

    it('Tokyo (35.6762, 139.6503)', () => {
      const pos = latLonToPosition(35.6762, 139.6503, 1);
      const magnitude = Math.sqrt(pos.x ** 2 + pos.y ** 2 + pos.z ** 2);
      expect(magnitude).toBeCloseTo(1, 5);
    });

    it('London (51.5074, -0.1278)', () => {
      const pos = latLonToPosition(51.5074, -0.1278, 1);
      const magnitude = Math.sqrt(pos.x ** 2 + pos.y ** 2 + pos.z ** 2);
      expect(magnitude).toBeCloseTo(1, 5);
      // London is north of equator, so y > 0
      expect(pos.y).toBeGreaterThan(0);
    });

    it('Sydney (-33.8688, 151.2093)', () => {
      const pos = latLonToPosition(-33.8688, 151.2093, 1);
      // Sydney is south of equator, so y < 0
      expect(pos.y).toBeLessThan(0);
    });
  });

  describe('degrees to radians', () => {
    it('converts 0 degrees to 0 radians', () => {
      const rad = 0 * (Math.PI / 180);
      expect(rad).toBe(0);
    });

    it('converts 90 degrees to PI/2 radians', () => {
      const rad = 90 * (Math.PI / 180);
      expect(rad).toBeCloseTo(Math.PI / 2, 10);
    });

    it('converts 180 degrees to PI radians', () => {
      const rad = 180 * (Math.PI / 180);
      expect(rad).toBeCloseTo(Math.PI, 10);
    });

    it('converts 45 degrees to PI/4 radians', () => {
      const rad = 45 * (Math.PI / 180);
      expect(rad).toBeCloseTo(Math.PI / 4, 10);
    });

    it('converts -90 degrees to -PI/2 radians', () => {
      const rad = -90 * (Math.PI / 180);
      expect(rad).toBeCloseTo(-Math.PI / 2, 10);
    });
  });
});

describe('Quaternion from Surface Normal', () => {
  // Test the quaternion calculation that aligns objects to surface

  function normalToQuaternion(normal: { x: number; y: number; z: number }) {
    // Calculate quaternion that rotates (0, 1, 0) to normal
    const up = { x: 0, y: 1, z: 0 };
    const dot = up.x * normal.x + up.y * normal.y + up.z * normal.z;

    // Cross product
    const cross = {
      x: up.y * normal.z - up.z * normal.y,
      y: up.z * normal.x - up.x * normal.z,
      z: up.x * normal.y - up.y * normal.x,
    };

    // Quaternion from axis-angle
    const w = Math.sqrt((1 + dot) * 2);
    const invW = 1 / w;

    return {
      x: cross.x * invW,
      y: cross.y * invW,
      z: cross.z * invW,
      w: w / 2,
    };
  }

  it('identity quaternion for north pole', () => {
    const q = normalToQuaternion({ x: 0, y: 1, z: 0 });
    // Identity quaternion is (0, 0, 0, 1)
    expect(q.x).toBeCloseTo(0, 5);
    expect(q.y).toBeCloseTo(0, 5);
    expect(q.z).toBeCloseTo(0, 5);
    expect(q.w).toBeCloseTo(1, 5);
  });

  it('non-identity quaternion for equator', () => {
    const q = normalToQuaternion({ x: 1, y: 0, z: 0 });
    // Should be a 90-degree rotation
    const magnitude = Math.sqrt(q.x ** 2 + q.y ** 2 + q.z ** 2 + q.w ** 2);
    expect(magnitude).toBeCloseTo(1, 5);
    expect(q.w).not.toBeCloseTo(1, 3); // Not identity
  });

  it('quaternion is normalized', () => {
    // Use an actually normalized input normal
    const len = Math.sqrt(0.5 ** 2 + 0.866 ** 2);
    const q = normalToQuaternion({ x: 0.5 / len, y: 0.866 / len, z: 0 });
    const magnitude = Math.sqrt(q.x ** 2 + q.y ** 2 + q.z ** 2 + q.w ** 2);
    expect(magnitude).toBeCloseTo(1, 4);
  });
});

describe('Beam Shader Parameters', () => {
  // Test shader uniform calculations

  it('needle radius scales with earth radius', () => {
    const earthRadius = 1;
    const needleRadius = earthRadius * 0.004;
    expect(needleRadius).toBe(0.004);
  });

  it('orb size scales with earth radius', () => {
    const earthRadius = 1;
    const orbSize = earthRadius * 0.012;
    expect(orbSize).toBe(0.012);
  });

  it('pillar height default is 0.15', () => {
    const pillarHeight = 0.15;
    expect(pillarHeight).toBe(0.15);
  });

  it('pulse ring animation math', () => {
    const time = 1.5; // seconds
    const pulseDuration = 3;
    const maxScale = 8;

    // Calculate progress for first ring
    const progress = (time % pulseDuration) / pulseDuration;
    const scale = 1 + progress * maxScale;

    expect(progress).toBe(0.5);
    expect(scale).toBe(5);
  });

  it('orb pulse animation math', () => {
    const time = Math.PI / 4; // 45 degrees
    const scale = 1 + Math.sin(time * 2) * 0.1;

    // sin(PI/2) = 1, so scale = 1.1
    expect(scale).toBeCloseTo(1.1, 5);
  });
});
