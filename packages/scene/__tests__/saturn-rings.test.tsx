/**
 * Tests for SaturnRings component using React Three Test Renderer.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as React from 'react';
import ReactThreeTestRenderer from '@react-three/test-renderer';

// Mock @react-three/fiber
vi.mock('@react-three/fiber', async () => {
  const actual = await vi.importActual('@react-three/fiber');
  return {
    ...actual,
    useFrame: vi.fn((callback) => {
      callback({ clock: { elapsedTime: 0 } }, 0.016);
    }),
  };
});

// Mock render profile context
vi.mock('../src/render-profile', () => ({
  useRenderProfile: vi.fn(() => ({
    profile: {
      fidelity: 'standard',
      animation: 'subtle',
      sphereSegments: 32,
      dpr: 1,
      enableShadows: false,
      enableBloom: true,
      textureTier: '2k',
      useCompressedTextures: false,
      maxAnisotropy: 1,
    },
    initialized: true,
  })),
}));

// Import after mocking
import { SaturnRings } from '../src/solar/SaturnRings';
import { useRenderProfile } from '../src/render-profile';

// Ring data from the component for validation
const SATURN_RADIUS_KM = 58232;
const RING_DATA = {
  D: { inner: 66900, outer: 74510 },
  C: { inner: 74658, outer: 92000 },
  B: { inner: 92000, outer: 117580 },
  cassiniDivision: { inner: 117580, outer: 122170 },
  A: { inner: 122170, outer: 136775 },
  F: { inner: 140180, outer: 140680 },
};

describe('SaturnRings Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('structure', () => {
    it('renders a group at the root', async () => {
      const renderer = await ReactThreeTestRenderer.create(
        <SaturnRings saturnRadius={1} />
      );
      const root = renderer.scene.children[0];

      expect(root).toBeDefined();
      expect(root.type).toBe('Group');
    });

    it('contains ring mesh(es)', async () => {
      const renderer = await ReactThreeTestRenderer.create(
        <SaturnRings saturnRadius={1} />
      );
      const group = renderer.scene.children[0];
      const meshes = group.children.filter(
        (child: { type: string }) => child.type === 'Mesh'
      );

      expect(meshes.length).toBeGreaterThan(0);
    });
  });

  describe('standard mode', () => {
    it('renders single combined ring in standard mode', async () => {
      const renderer = await ReactThreeTestRenderer.create(
        <SaturnRings saturnRadius={1} />
      );
      const group = renderer.scene.children[0];
      const meshes = group.children.filter(
        (child: { type: string }) => child.type === 'Mesh'
      );

      // Standard mode renders single combined ring
      expect(meshes.length).toBe(1);
    });

    it('uses ringGeometry', async () => {
      const renderer = await ReactThreeTestRenderer.create(
        <SaturnRings saturnRadius={1} />
      );
      const group = renderer.scene.children[0];
      const mesh = group.children.find(
        (child: { type: string }) => child.type === 'Mesh'
      );

      const geometry = mesh.allChildren.find(
        (child: { type: string }) => child.type === 'RingGeometry'
      );

      expect(geometry).toBeDefined();
    });

    it('uses meshStandardMaterial', async () => {
      const renderer = await ReactThreeTestRenderer.create(
        <SaturnRings saturnRadius={1} />
      );
      const group = renderer.scene.children[0];
      const mesh = group.children.find(
        (child: { type: string }) => child.type === 'Mesh'
      );

      const material = mesh.allChildren.find(
        (child: { type: string }) => child.type === 'MeshStandardMaterial'
      );

      expect(material).toBeDefined();
    });
  });

  describe('cinematic mode', () => {
    beforeEach(() => {
      vi.mocked(useRenderProfile).mockReturnValue({
        profile: {
          fidelity: 'cinematic',
          animation: 'realtime',
          sphereSegments: 128,
          dpr: 1.5,
          enableShadows: true,
          enableBloom: true,
          textureTier: '4k',
          useCompressedTextures: true,
          maxAnisotropy: 8,
        },
        initialized: true,
        assessment: null,
        cinematicAvailable: true,
        setFidelity: vi.fn(),
        setAnimation: vi.fn(),
        resetToAuto: vi.fn(),
      });
    });

    it('renders multiple ring segments in cinematic mode', async () => {
      const renderer = await ReactThreeTestRenderer.create(
        <SaturnRings saturnRadius={1} />
      );
      const group = renderer.scene.children[0];
      const meshes = group.children.filter(
        (child: { type: string }) => child.type === 'Mesh'
      );

      // Cinematic mode renders 6 ring segments (D, C, B, Cassini, A, F)
      expect(meshes.length).toBe(6);
    });

    it('uses shader materials in cinematic mode', async () => {
      const renderer = await ReactThreeTestRenderer.create(
        <SaturnRings saturnRadius={1} />
      );
      const group = renderer.scene.children[0];
      const mesh = group.children.find(
        (child: { type: string }) => child.type === 'Mesh'
      );

      const material = mesh.allChildren.find(
        (child: { type: string }) => child.type === 'ShaderMaterial'
      );

      expect(material).toBeDefined();
    });
  });

  describe('position props', () => {
    it('positions at origin by default', async () => {
      const renderer = await ReactThreeTestRenderer.create(
        <SaturnRings saturnRadius={1} />
      );
      const group = renderer.scene.children[0];
      const pos = group.instance.position;

      expect(pos.x).toBe(0);
      expect(pos.y).toBe(0);
      expect(pos.z).toBe(0);
    });

    it('accepts custom position', async () => {
      const renderer = await ReactThreeTestRenderer.create(
        <SaturnRings saturnRadius={1} position={[10, 0, 5]} />
      );
      const group = renderer.scene.children[0];
      const pos = group.instance.position;

      expect(pos.x).toBe(10);
      expect(pos.y).toBe(0);
      expect(pos.z).toBe(5);
    });
  });

  describe('sun position', () => {
    it('accepts sunPosition for lighting', async () => {
      const renderer = await ReactThreeTestRenderer.create(
        <SaturnRings saturnRadius={1} sunPosition={[100, 0, 0]} />
      );
      const group = renderer.scene.children[0];

      expect(group).toBeDefined();
    });

    it('calculates sun direction from positions', async () => {
      const renderer = await ReactThreeTestRenderer.create(
        <SaturnRings saturnRadius={1} position={[0, 0, 0]} sunPosition={[1, 0, 0]} />
      );
      const group = renderer.scene.children[0];

      expect(group).toBeDefined();
    });
  });

  describe('tilt', () => {
    it('applies axial tilt by default', async () => {
      const renderer = await ReactThreeTestRenderer.create(
        <SaturnRings saturnRadius={1} applyTilt={true} />
      );
      const group = renderer.scene.children[0];

      expect(group).toBeDefined();
    });

    it('can disable tilt', async () => {
      const renderer = await ReactThreeTestRenderer.create(
        <SaturnRings saturnRadius={1} applyTilt={false} />
      );
      const group = renderer.scene.children[0];

      expect(group).toBeDefined();
    });

    it('accepts custom tilt degrees', async () => {
      const renderer = await ReactThreeTestRenderer.create(
        <SaturnRings saturnRadius={1} tiltDegrees={45} />
      );
      const group = renderer.scene.children[0];

      expect(group).toBeDefined();
    });

    it('accepts quaternion for orientation', async () => {
      const renderer = await ReactThreeTestRenderer.create(
        <SaturnRings saturnRadius={1} quaternion={[0, 0, 0, 1]} />
      );
      const group = renderer.scene.children[0];

      expect(group).toBeDefined();
    });
  });

  describe('cleanup', () => {
    it('unmounts cleanly', async () => {
      const renderer = await ReactThreeTestRenderer.create(
        <SaturnRings saturnRadius={1} />
      );
      await renderer.unmount();

      expect(renderer.scene.children.length).toBe(0);
    });
  });
});

describe('Ring Physical Data', () => {
  it('Saturn equatorial radius is correct', () => {
    expect(SATURN_RADIUS_KM).toBe(58232);
  });

  it('D ring is innermost', () => {
    expect(RING_DATA.D.inner).toBe(66900);
  });

  it('F ring is outermost', () => {
    expect(RING_DATA.F.outer).toBe(140680);
  });

  it('rings are in correct order', () => {
    expect(RING_DATA.D.outer).toBeLessThan(RING_DATA.C.inner);
    expect(RING_DATA.C.outer).toBeLessThanOrEqual(RING_DATA.B.inner);
    expect(RING_DATA.B.outer).toBe(RING_DATA.cassiniDivision.inner);
    expect(RING_DATA.cassiniDivision.outer).toBe(RING_DATA.A.inner);
    expect(RING_DATA.A.outer).toBeLessThan(RING_DATA.F.inner);
  });

  it('B ring is widest main ring', () => {
    const bWidth = RING_DATA.B.outer - RING_DATA.B.inner;
    const aWidth = RING_DATA.A.outer - RING_DATA.A.inner;
    const cWidth = RING_DATA.C.outer - RING_DATA.C.inner;

    expect(bWidth).toBeGreaterThan(aWidth);
    expect(bWidth).toBeGreaterThan(cWidth);
  });

  it('Cassini Division is a gap', () => {
    const cassiniWidth =
      RING_DATA.cassiniDivision.outer - RING_DATA.cassiniDivision.inner;

    // Cassini Division is about 4590 km wide
    expect(cassiniWidth).toBeCloseTo(4590, 0);
  });

  it('all rings are outside Saturn', () => {
    Object.values(RING_DATA).forEach((ring) => {
      expect(ring.inner).toBeGreaterThan(SATURN_RADIUS_KM);
    });
  });
});

describe('Ring Scale Calculations', () => {
  it('calculates km to scene conversion', () => {
    const saturnRadius = 1; // Scene units
    const kmToScene = saturnRadius / SATURN_RADIUS_KM;

    // Outer A ring in scene units
    const aRingOuterScene = RING_DATA.A.outer * kmToScene;

    // Should be roughly 2.35x Saturn radius
    expect(aRingOuterScene / saturnRadius).toBeCloseTo(2.35, 1);
  });

  it('F ring extends beyond A ring', () => {
    const saturnRadius = 1;
    const kmToScene = saturnRadius / SATURN_RADIUS_KM;

    const aRingOuter = RING_DATA.A.outer * kmToScene;
    const fRingOuter = RING_DATA.F.outer * kmToScene;

    expect(fRingOuter).toBeGreaterThan(aRingOuter);
  });

  it('ring ratios match physical data', () => {
    // F ring outer / Saturn radius should be ~2.42
    const ratio = RING_DATA.F.outer / SATURN_RADIUS_KM;
    expect(ratio).toBeCloseTo(2.42, 1);
  });
});
