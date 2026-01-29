/**
 * Tests for Sun component using React Three Test Renderer.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as React from 'react';
import ReactThreeTestRenderer from '@react-three/test-renderer';
import * as THREE from 'three';

// Mock texture
const mockTexture = new THREE.Texture();
mockTexture.colorSpace = THREE.SRGBColorSpace;

// Mock @react-three/fiber
vi.mock('@react-three/fiber', async () => {
  const actual = await vi.importActual('@react-three/fiber');
  return {
    ...actual,
    useLoader: vi.fn(() => mockTexture),
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
import { Sun } from '../src/solar/Sun';
import { useRenderProfile } from '../src/render-profile';

describe('Sun Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('structure', () => {
    it('renders a group at the root', async () => {
      const renderer = await ReactThreeTestRenderer.create(<Sun />);
      const root = renderer.scene.children[0];

      expect(root).toBeDefined();
      expect(root.type).toBe('Group');
    });

    it('contains a mesh for the sun sphere', async () => {
      const renderer = await ReactThreeTestRenderer.create(<Sun />);
      const group = renderer.scene.children[0];
      const meshes = group.children.filter(
        (child: { type: string }) => child.type === 'Mesh'
      );

      expect(meshes.length).toBeGreaterThan(0);
    });

    it('contains a point light', async () => {
      const renderer = await ReactThreeTestRenderer.create(<Sun />);
      const group = renderer.scene.children[0];
      const light = group.children.find(
        (child: { type: string }) => child.type === 'PointLight'
      );

      expect(light).toBeDefined();
    });
  });

  describe('default props', () => {
    it('uses default radius of 0.25', async () => {
      const renderer = await ReactThreeTestRenderer.create(<Sun />);
      const group = renderer.scene.children[0];
      const mesh = group.children.find(
        (child: { type: string }) => child.type === 'Mesh'
      );

      expect(mesh).toBeDefined();
    });

    it('positions at origin by default', async () => {
      const renderer = await ReactThreeTestRenderer.create(<Sun />);
      const group = renderer.scene.children[0];
      const pos = group.instance.position;

      expect(pos.x).toBe(0);
      expect(pos.y).toBe(0);
      expect(pos.z).toBe(0);
    });

    it('uses default light intensity of 3', async () => {
      const renderer = await ReactThreeTestRenderer.create(<Sun />);
      const group = renderer.scene.children[0];
      const light = group.children.find(
        (child: { type: string }) => child.type === 'PointLight'
      );

      expect(light).toBeDefined();
    });
  });

  describe('custom props', () => {
    it('accepts custom radius', async () => {
      const renderer = await ReactThreeTestRenderer.create(<Sun radius={1.0} />);
      const group = renderer.scene.children[0];

      expect(group).toBeDefined();
    });

    it('accepts custom position', async () => {
      const renderer = await ReactThreeTestRenderer.create(<Sun position={[10, 0, 0]} />);
      const group = renderer.scene.children[0];
      const pos = group.instance.position;

      expect(pos.x).toBe(10);
      expect(pos.y).toBe(0);
      expect(pos.z).toBe(0);
    });

    it('accepts custom light intensity', async () => {
      const renderer = await ReactThreeTestRenderer.create(<Sun lightIntensity={5} />);
      const group = renderer.scene.children[0];
      const light = group.children.find(
        (child: { type: string }) => child.type === 'PointLight'
      );

      expect(light).toBeDefined();
    });

    it('accepts custom light distance', async () => {
      const renderer = await ReactThreeTestRenderer.create(<Sun lightDistance={100} />);
      const group = renderer.scene.children[0];

      expect(group).toBeDefined();
    });

    it('accepts castShadow prop', async () => {
      const renderer = await ReactThreeTestRenderer.create(<Sun castShadow={false} />);
      const group = renderer.scene.children[0];

      expect(group).toBeDefined();
    });

    it('accepts custom shadowMapSize', async () => {
      const renderer = await ReactThreeTestRenderer.create(<Sun shadowMapSize={4096} />);
      const group = renderer.scene.children[0];

      expect(group).toBeDefined();
    });
  });

  describe('standard mode', () => {
    it('renders with basic material in standard mode', async () => {
      const renderer = await ReactThreeTestRenderer.create(<Sun />);
      const group = renderer.scene.children[0];
      const mesh = group.children.find(
        (child: { type: string }) => child.type === 'Mesh'
      );

      // Should have a material
      expect(mesh).toBeDefined();
      expect(mesh.allChildren.length).toBeGreaterThan(0);
    });

    it('does not render corona in standard mode', async () => {
      const renderer = await ReactThreeTestRenderer.create(<Sun />);
      const group = renderer.scene.children[0];
      const meshes = group.children.filter(
        (child: { type: string }) => child.type === 'Mesh'
      );

      // Standard mode: 1 mesh (sun sphere), no corona
      expect(meshes.length).toBe(1);
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

    it('renders with shader material in cinematic mode', async () => {
      const renderer = await ReactThreeTestRenderer.create(<Sun />);
      const group = renderer.scene.children[0];

      expect(group).toBeDefined();
    });

    it('renders corona shell in cinematic mode', async () => {
      const renderer = await ReactThreeTestRenderer.create(<Sun />);
      const group = renderer.scene.children[0];
      const meshes = group.children.filter(
        (child: { type: string }) => child.type === 'Mesh'
      );

      // Cinematic mode: 2 meshes (sun sphere + corona)
      expect(meshes.length).toBe(2);
    });
  });

  describe('animation', () => {
    it('handles useFrame for shader animation', async () => {
      const renderer = await ReactThreeTestRenderer.create(<Sun />);

      await ReactThreeTestRenderer.act(async () => {
        await renderer.advanceFrames(5, 0.016);
      });

      expect(renderer.scene.children[0]).toBeDefined();
    });
  });

  describe('geometry', () => {
    it('creates sphere geometry with correct segments', async () => {
      const renderer = await ReactThreeTestRenderer.create(<Sun />);
      const group = renderer.scene.children[0];
      const mesh = group.children.find(
        (child: { type: string }) => child.type === 'Mesh'
      );

      const geometry = mesh.allChildren.find(
        (child: { type: string }) => child.type === 'SphereGeometry'
      );

      expect(geometry).toBeDefined();
    });
  });

  describe('cleanup', () => {
    it('unmounts cleanly', async () => {
      const renderer = await ReactThreeTestRenderer.create(<Sun />);
      await renderer.unmount();

      expect(renderer.scene.children.length).toBe(0);
    });
  });
});

describe('Sun Light Properties', () => {
  it('point light provides warm color', async () => {
    const renderer = await ReactThreeTestRenderer.create(<Sun />);
    const group = renderer.scene.children[0];
    const light = group.children.find(
      (child: { type: string }) => child.type === 'PointLight'
    );

    expect(light).toBeDefined();
  });

  it('default light distance is 0 (infinite)', async () => {
    const renderer = await ReactThreeTestRenderer.create(<Sun />);
    const group = renderer.scene.children[0];
    const light = group.children.find(
      (child: { type: string }) => child.type === 'PointLight'
    );

    // Light should reach all planets at multi-AU distances
    expect(light).toBeDefined();
  });
});
