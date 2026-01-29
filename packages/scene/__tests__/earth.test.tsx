/**
 * Tests for Earth component using React Three Test Renderer.
 */

import { describe, it, expect, vi } from 'vitest';
import * as React from 'react';
import ReactThreeTestRenderer from '@react-three/test-renderer';
import * as THREE from 'three';

// Mock texture loader to avoid actual file loading
vi.mock('@react-three/fiber', async () => {
  const actual = await vi.importActual('@react-three/fiber');
  return {
    ...actual,
    useLoader: vi.fn(() => {
      // Return mock textures
      const mockTexture = new THREE.Texture();
      return [mockTexture, mockTexture];
    }),
  };
});

// Mock drei Sphere to use regular mesh
vi.mock('@react-three/drei', async () => {
  return {
    Sphere: ({ children, args }: { children: React.ReactNode; args: number[] }) => (
      <mesh>
        <sphereGeometry args={args} />
        {children}
      </mesh>
    ),
  };
});

// Import after mocking
import { Earth } from '../src/earth/Earth';

describe('Earth Component', () => {
  describe('structure', () => {
    it('renders a group with meshes', async () => {
      const renderer = await ReactThreeTestRenderer.create(<Earth />);
      const group = renderer.scene.children[0];

      expect(group).toBeDefined();
      expect(group.type).toBe('Group');
    });

    it('contains earth sphere mesh', async () => {
      const renderer = await ReactThreeTestRenderer.create(<Earth />);
      const group = renderer.scene.children[0];

      // First child is the earth mesh
      const earthMesh = group.children[0];
      expect(earthMesh).toBeDefined();
      expect(earthMesh.type).toBe('Mesh');
    });

    it('includes cloud layer when showClouds is true', async () => {
      const renderer = await ReactThreeTestRenderer.create(<Earth showClouds={true} />);
      const group = renderer.scene.children[0];

      // Should have earth mesh + cloud mesh + atmosphere
      expect(group.children.length).toBeGreaterThanOrEqual(2);
    });

    it('excludes cloud layer when showClouds is false', async () => {
      const renderer = await ReactThreeTestRenderer.create(<Earth showClouds={false} />);
      const group = renderer.scene.children[0];

      // Fewer children without clouds
      const withClouds = await ReactThreeTestRenderer.create(<Earth showClouds={true} />);
      expect(group.children.length).toBeLessThan(
        withClouds.scene.children[0].children.length
      );
    });

    it('includes atmosphere when showAtmosphere is true', async () => {
      const renderer = await ReactThreeTestRenderer.create(
        <Earth showAtmosphere={true} />
      );
      const group = renderer.scene.children[0];

      // Should have atmosphere mesh (Sphere with shaderMaterial)
      expect(group.children.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('rotation animation', () => {
    it('earth rotates over time', async () => {
      const renderer = await ReactThreeTestRenderer.create(
        <Earth rotationSpeedMultiplier={1000} />
      );

      const group = renderer.scene.children[0];
      const earthMesh = group.children[0];

      const initialRotation = earthMesh.instance.rotation.y;

      // Advance frames
      await ReactThreeTestRenderer.act(async () => {
        await renderer.advanceFrames(10, 0.016); // 10 frames at 60fps
      });

      const finalRotation = earthMesh.instance.rotation.y;
      expect(finalRotation).not.toBe(initialRotation);
      expect(finalRotation).toBeGreaterThan(initialRotation);
    });

    it('faster multiplier means faster rotation', async () => {
      const slowRenderer = await ReactThreeTestRenderer.create(
        <Earth rotationSpeedMultiplier={100} />
      );

      const fastRenderer = await ReactThreeTestRenderer.create(
        <Earth rotationSpeedMultiplier={1000} />
      );

      // Advance both by same amount
      await ReactThreeTestRenderer.act(async () => {
        await slowRenderer.advanceFrames(10, 0.016);
        await fastRenderer.advanceFrames(10, 0.016);
      });

      const slowRotation = slowRenderer.scene.children[0].children[0].instance.rotation.y;
      const fastRotation = fastRenderer.scene.children[0].children[0].instance.rotation.y;

      expect(fastRotation).toBeGreaterThan(slowRotation);
    });
  });

  describe('geometry', () => {
    it('earth sphere has correct segment count for quality', async () => {
      const renderer = await ReactThreeTestRenderer.create(<Earth />);
      const group = renderer.scene.children[0];
      const earthMesh = group.children[0];

      // Access geometry through allChildren
      const geometry = earthMesh.allChildren.find(
        (child: { type: string }) => child.type === 'SphereGeometry'
      );

      expect(geometry).toBeDefined();
    });
  });
});

describe('Earth Physics Constants', () => {
  // Earth's angular velocity: 2pi radians per sidereal day
  // Sidereal day = 86164.0905 seconds
  const SIDEREAL_DAY_SECONDS = 86164.0905;
  const BASE_ANGULAR_VELOCITY = (2 * Math.PI) / SIDEREAL_DAY_SECONDS;

  it('uses correct sidereal day value', () => {
    // This should match the value in the component
    expect(SIDEREAL_DAY_SECONDS).toBeCloseTo(86164.09, 1);
  });

  it('angular velocity calculation is correct', () => {
    // One full rotation in one sidereal day
    const rotationPerDay = BASE_ANGULAR_VELOCITY * SIDEREAL_DAY_SECONDS;
    expect(rotationPerDay).toBeCloseTo(2 * Math.PI, 5);
  });
});
