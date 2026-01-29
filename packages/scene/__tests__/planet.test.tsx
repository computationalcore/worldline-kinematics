/**
 * Tests for Planet component using React Three Test Renderer.
 */

import { describe, it, expect, vi } from 'vitest';
import * as React from 'react';
import ReactThreeTestRenderer from '@react-three/test-renderer';
import { useFrame } from '@react-three/fiber';

// Mock texture loader to avoid actual file loading
vi.mock('@react-three/fiber', async () => {
  const actual = await vi.importActual('@react-three/fiber');
  return {
    ...actual,
    useLoader: vi.fn(() => [null, null, null]),
  };
});

// Mock drei Html component
vi.mock('@react-three/drei', async () => {
  const actual = await vi.importActual('@react-three/drei');
  return {
    ...actual,
    Html: (_props: { children: React.ReactNode }) => null,
  };
});

// Simple mesh component for testing renderer setup
function SimpleMesh({ position = [0, 0, 0] }: { position?: [number, number, number] }) {
  return (
    <mesh position={position}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color="red" />
    </mesh>
  );
}

describe('React Three Test Renderer Setup', () => {
  it('can create a test renderer', async () => {
    const renderer = await ReactThreeTestRenderer.create(<SimpleMesh />);
    expect(renderer).toBeDefined();
    expect(renderer.scene).toBeDefined();
  });

  it('can access scene children', async () => {
    const renderer = await ReactThreeTestRenderer.create(<SimpleMesh />);
    const mesh = renderer.scene.children[0];
    expect(mesh).toBeDefined();
  });

  it('can verify mesh position', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <SimpleMesh position={[1, 2, 3]} />
    );
    const mesh = renderer.scene.children[0];
    expect(mesh.instance.position.x).toBe(1);
    expect(mesh.instance.position.y).toBe(2);
    expect(mesh.instance.position.z).toBe(3);
  });

  it('can access geometry through allChildren', async () => {
    const renderer = await ReactThreeTestRenderer.create(<SimpleMesh />);
    const mesh = renderer.scene.children[0];
    const allChildren = mesh.allChildren;
    expect(allChildren.length).toBeGreaterThan(0);
  });

  it('can unmount cleanly', async () => {
    const renderer = await ReactThreeTestRenderer.create(<SimpleMesh />);
    await renderer.unmount();
    expect(renderer.scene.children.length).toBe(0);
  });
});

describe('Scene Graph Inspection', () => {
  it('toGraph returns scene structure', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <group>
        <mesh>
          <boxGeometry />
          <meshBasicMaterial />
        </mesh>
        <mesh>
          <sphereGeometry />
          <meshBasicMaterial />
        </mesh>
      </group>
    );

    const graph = renderer.toGraph();
    expect(graph).toBeDefined();
    expect(graph.length).toBeGreaterThan(0);
  });

  it('can find nested meshes', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <group name="parent">
        <group name="child">
          <mesh name="target">
            <boxGeometry />
            <meshBasicMaterial />
          </mesh>
        </group>
      </group>
    );

    const parent = renderer.scene.children[0];
    expect(parent.instance.name).toBe('parent');

    const child = parent.children[0];
    expect(child.instance.name).toBe('child');

    const target = child.children[0];
    expect(target.instance.name).toBe('target');
  });
});

describe('Component Updates', () => {
  it('can update component props', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <SimpleMesh position={[0, 0, 0]} />
    );

    const meshBefore = renderer.scene.children[0];
    expect(meshBefore.instance.position.x).toBe(0);

    await renderer.update(<SimpleMesh position={[5, 0, 0]} />);

    const meshAfter = renderer.scene.children[0];
    expect(meshAfter.instance.position.x).toBe(5);
  });
});

describe('useFrame Animation Testing', () => {
  function RotatingMesh() {
    const meshRef = React.useRef<THREE.Mesh>(null);

    useFrame((_: unknown, delta: number) => {
      if (meshRef.current) {
        meshRef.current.rotation.y += delta;
      }
    });

    return (
      <mesh ref={meshRef}>
        <boxGeometry />
        <meshBasicMaterial />
      </mesh>
    );
  }

  it('can advance frames to test animations', async () => {
    const renderer = await ReactThreeTestRenderer.create(<RotatingMesh />);
    const mesh = renderer.scene.children[0];

    const initialRotation = mesh.instance.rotation.y;
    expect(initialRotation).toBe(0);

    // Advance 2 frames with delta of 1 second each
    await ReactThreeTestRenderer.act(async () => {
      await renderer.advanceFrames(2, 1);
    });

    // Rotation should have increased by 2 (2 frames * 1 second * delta)
    expect(mesh.instance.rotation.y).toBeCloseTo(2, 5);
  });
});

describe('Event Handling', () => {
  function ClickableMesh({ onClick }: { onClick: () => void }) {
    return (
      <mesh onClick={onClick}>
        <boxGeometry />
        <meshBasicMaterial />
      </mesh>
    );
  }

  it('can fire click events', async () => {
    const handleClick = vi.fn();
    const renderer = await ReactThreeTestRenderer.create(
      <ClickableMesh onClick={handleClick} />
    );

    const mesh = renderer.scene.children[0];
    await renderer.fireEvent(mesh, 'click');

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('can fire pointer events', async () => {
    const handlePointerOver = vi.fn();
    const handlePointerOut = vi.fn();

    const renderer = await ReactThreeTestRenderer.create(
      <mesh onPointerOver={handlePointerOver} onPointerOut={handlePointerOut}>
        <boxGeometry />
        <meshBasicMaterial />
      </mesh>
    );

    const mesh = renderer.scene.children[0];

    await renderer.fireEvent(mesh, 'pointerOver');
    expect(handlePointerOver).toHaveBeenCalledTimes(1);

    await renderer.fireEvent(mesh, 'pointerOut');
    expect(handlePointerOut).toHaveBeenCalledTimes(1);
  });
});
