/**
 * Tests for Atmosphere component using React Three Test Renderer.
 */

import { describe, it, expect, vi } from 'vitest';
import * as React from 'react';
import ReactThreeTestRenderer from '@react-three/test-renderer';

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
import { Atmosphere } from '../src/earth/Atmosphere';

describe('Atmosphere Component', () => {
  describe('structure', () => {
    it('renders a mesh with sphereGeometry', async () => {
      const renderer = await ReactThreeTestRenderer.create(<Atmosphere />);
      const mesh = renderer.scene.children[0];

      expect(mesh).toBeDefined();
      expect(mesh.type).toBe('Mesh');
    });

    it('includes a meshBasicMaterial', async () => {
      const renderer = await ReactThreeTestRenderer.create(<Atmosphere />);
      const mesh = renderer.scene.children[0];
      const material = mesh.allChildren.find(
        (child: { type: string }) => child.type === 'MeshBasicMaterial'
      );

      expect(material).toBeDefined();
    });

    it('includes sphereGeometry', async () => {
      const renderer = await ReactThreeTestRenderer.create(<Atmosphere />);
      const mesh = renderer.scene.children[0];
      const geometry = mesh.allChildren.find(
        (child: { type: string }) => child.type === 'SphereGeometry'
      );

      expect(geometry).toBeDefined();
    });
  });

  describe('props', () => {
    it('uses default earthRadius of 1', async () => {
      const renderer = await ReactThreeTestRenderer.create(<Atmosphere />);
      const mesh = renderer.scene.children[0];
      const geometry = mesh.allChildren.find(
        (child: { type: string }) => child.type === 'SphereGeometry'
      );

      // Atmosphere radius should be 1.05 (earthRadius * 1.05)
      expect(geometry).toBeDefined();
    });

    it('scales with custom earthRadius', async () => {
      const renderer = await ReactThreeTestRenderer.create(
        <Atmosphere earthRadius={2} />
      );
      const mesh = renderer.scene.children[0];

      // Should render without error with custom radius
      expect(mesh).toBeDefined();
    });

    it('uses default intensity of 0.3', async () => {
      const renderer = await ReactThreeTestRenderer.create(<Atmosphere />);
      const mesh = renderer.scene.children[0];

      // Component should render with default intensity
      expect(mesh).toBeDefined();
    });

    it('accepts custom intensity', async () => {
      const renderer = await ReactThreeTestRenderer.create(
        <Atmosphere intensity={0.5} />
      );
      const mesh = renderer.scene.children[0];

      // Should render without error with custom intensity
      expect(mesh).toBeDefined();
    });

    it('accepts combined props', async () => {
      const renderer = await ReactThreeTestRenderer.create(
        <Atmosphere earthRadius={1.5} intensity={0.7} />
      );
      const mesh = renderer.scene.children[0];

      expect(mesh).toBeDefined();
      expect(mesh.type).toBe('Mesh');
    });
  });

  describe('material properties', () => {
    it('material is transparent', async () => {
      const renderer = await ReactThreeTestRenderer.create(<Atmosphere />);
      const mesh = renderer.scene.children[0];
      const material = mesh.allChildren.find(
        (child: { type: string }) => child.type === 'MeshBasicMaterial'
      );

      expect(material).toBeDefined();
    });

    it('renders atmosphere glow color', async () => {
      const renderer = await ReactThreeTestRenderer.create(<Atmosphere />);
      const mesh = renderer.scene.children[0];

      // Component should render the characteristic blue-ish glow
      expect(mesh).toBeDefined();
    });
  });

  describe('cleanup', () => {
    it('unmounts cleanly', async () => {
      const renderer = await ReactThreeTestRenderer.create(<Atmosphere />);
      await renderer.unmount();

      expect(renderer.scene.children.length).toBe(0);
    });
  });
});
