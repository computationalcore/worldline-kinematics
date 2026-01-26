/**
 * Camera system with semantic zoom preservation.
 *
 * Key design principle (C2 architecture):
 * - Zoom is defined in "planetary radii" units, not raw scene units
 * - Switching targets preserves zoomRadii = distance / targetRadius
 * - Smooth transitions that don't reset zoom
 */

'use client';

import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { ReferenceFrame } from '@worldline-kinematics/core';
import type { BodyId, Vec3, CameraSemanticState } from '@worldline-kinematics/astro';

// ---------------------------
// Types
// ---------------------------

/**
 * Focus target for camera.
 */
export interface FocusTarget {
  /** Body being focused on */
  bodyId: BodyId;
  /** Position in scene units */
  position: Vec3;
  /** Radius in scene units (for zoom calculation) */
  radiusScene: number;
  /** Minimum distance from target */
  minDistance?: number;
}

/**
 * Camera rig props.
 */
export interface CameraRigProps {
  /** Current focus target */
  target: FocusTarget;
  /** If true, fit target to view; if false, preserve zoom */
  fitToView?: boolean;
  /** Damping factor (higher = snappier transitions) */
  damping?: number;
  /** Initial zoom in planetary radii (only used on first render) */
  initialZoomRadii?: number;
  /** Callback when camera state changes */
  onStateChange?: (state: CameraSemanticState) => void;
}

/**
 * Camera transition state.
 */
export interface CameraTransitionState {
  /** Whether currently transitioning */
  isTransitioning: boolean;
  /** Progress from 0 to 1 */
  progress: number;
}

// ---------------------------
// Semantic Camera Rig
// ---------------------------

/**
 * Camera rig with semantic zoom preservation.
 *
 * When switching between targets:
 * - If fitToView is false (default): preserves zoomRadii (distance / targetRadius)
 * - If fitToView is true: frames the target at a comfortable viewing distance
 *
 * This makes zoom feel consistent across targets of different sizes.
 */
export function CameraRig({
  target,
  fitToView = false,
  damping = 8,
  initialZoomRadii = 8,
  onStateChange,
}: CameraRigProps): React.ReactElement {
  const { camera } = useThree();
  const controlsRef = useRef<React.ElementRef<typeof OrbitControls>>(null);

  // Desired camera state (what we're transitioning to)
  const desiredTarget = useMemo(() => new THREE.Vector3(), []);
  const desiredPos = useMemo(() => new THREE.Vector3(), []);
  const tmp = useMemo(() => new THREE.Vector3(), []);

  // Store previous target for comparison
  const prevTarget = useRef<FocusTarget | null>(null);
  // Store current zoom in radii
  const currentZoomRadii = useRef<number>(initialZoomRadii);

  // Handle target changes
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    // Get current camera state
    const currentTarget = controls.target as THREE.Vector3;
    const offset = tmp.copy(camera.position).sub(currentTarget);
    const currentDistance = offset.length();
    const offsetDir = offset.clone().normalize();

    // Calculate current zoom in radii (using previous target's radius if available)
    if (prevTarget.current) {
      currentZoomRadii.current = currentDistance / prevTarget.current.radiusScene;
    }

    // Set new target position
    desiredTarget.set(target.position.x, target.position.y, target.position.z);

    if (!fitToView) {
      // Preserve zoom: use same zoomRadii with new target's radius
      const newDistance = currentZoomRadii.current * target.radiusScene;
      desiredPos.copy(desiredTarget).add(offsetDir.multiplyScalar(newDistance));
    } else {
      // Fit to view: calculate comfortable viewing distance
      const perspCam = camera as THREE.PerspectiveCamera;
      const fov = perspCam.fov * (Math.PI / 180);
      // Distance to fit a sphere of radius r in view
      const fitDistance = (target.radiusScene / Math.sin(fov / 2)) * 1.5;
      desiredPos.copy(desiredTarget).add(offsetDir.multiplyScalar(fitDistance));
      currentZoomRadii.current = fitDistance / target.radiusScene;
    }

    // Store current target for next comparison
    prevTarget.current = target;
  }, [camera, target, fitToView, desiredTarget, desiredPos, tmp]);

  // Animate camera on each frame
  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;

    // Exponential damping for smooth transitions
    const t = 1 - Math.exp(-damping * delta);

    // Lerp target and camera position
    (controls.target as THREE.Vector3).lerp(desiredTarget, t);
    camera.position.lerp(desiredPos, t);

    // Enforce minimum distance
    if (target.minDistance !== undefined && target.minDistance !== null) {
      const d = camera.position.distanceTo(controls.target);
      if (d < target.minDistance) {
        const dir = camera.position.clone().sub(controls.target).normalize();
        camera.position.copy(controls.target).add(dir.multiplyScalar(target.minDistance));
      }
    }

    controls.update();

    // Report state changes
    if (onStateChange) {
      const distance = camera.position.distanceTo(controls.target);
      const zoomRadii = distance / target.radiusScene;

      // Calculate azimuth and polar angles
      const dir = camera.position.clone().sub(controls.target).normalize();
      const azimuth = Math.atan2(dir.x, dir.z);
      const polar = Math.acos(Math.max(-1, Math.min(1, dir.y)));

      onStateChange({
        targetId: target.bodyId,
        zoomRadii,
        azimuth,
        polar,
      });
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.08}
      minDistance={target.minDistance ?? target.radiusScene * 1.1}
      maxDistance={target.radiusScene * 100}
      makeDefault
    />
  );
}

// ---------------------------
// Transition Utilities
// ---------------------------

/**
 * Hook for tracking camera transition state.
 */
export function useCameraTransition(
  _mode: ReferenceFrame,
  _duration?: number
): CameraTransitionState {
  // TODO: Implement full transition tracking
  return {
    isTransitioning: false,
    progress: 1,
  };
}

// ---------------------------
// Animated Camera (Simple)
// ---------------------------

/**
 * Simple animated camera for direct position/lookAt control.
 * Used when full semantic zoom is not needed.
 */
export interface AnimatedCameraProps {
  targetPosition: [number, number, number];
  targetLookAt: [number, number, number];
  fov: number;
  speed?: number;
}

/**
 * Animated camera with smooth transitions.
 */
export function AnimatedCamera({
  targetPosition,
  targetLookAt,
  fov,
  speed = 2.5,
}: AnimatedCameraProps): null {
  const { camera } = useThree();
  const animationProgress = useRef(1);
  const startPosition = useRef(new THREE.Vector3());
  const startFov = useRef(fov);
  const prevTarget = useRef({ position: targetPosition, lookAt: targetLookAt });

  // Detect target changes
  if (
    prevTarget.current.position[0] !== targetPosition[0] ||
    prevTarget.current.position[1] !== targetPosition[1] ||
    prevTarget.current.position[2] !== targetPosition[2] ||
    prevTarget.current.lookAt[0] !== targetLookAt[0] ||
    prevTarget.current.lookAt[1] !== targetLookAt[1] ||
    prevTarget.current.lookAt[2] !== targetLookAt[2]
  ) {
    startPosition.current.copy(camera.position);
    if ('fov' in camera) {
      startFov.current = (camera as THREE.PerspectiveCamera).fov;
    }
    animationProgress.current = 0;
    prevTarget.current = { position: targetPosition, lookAt: targetLookAt };
  }

  useFrame((_, delta) => {
    if (animationProgress.current >= 1) return;

    animationProgress.current = Math.min(1, animationProgress.current + delta * speed);
    const t = animationProgress.current;

    // Quintic ease-in-out
    const eased = t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2;

    const targetPos = new THREE.Vector3(...targetPosition);

    camera.position.lerpVectors(startPosition.current, targetPos, eased);

    if ('fov' in camera) {
      const perspCam = camera as THREE.PerspectiveCamera;
      perspCam.fov = startFov.current + (fov - startFov.current) * eased;
      perspCam.updateProjectionMatrix();
    }

    if (animationProgress.current >= 1) {
      camera.position.copy(targetPos);
    }
  });

  return null;
}

// ---------------------------
// Legacy CameraRig (compatibility)
// ---------------------------

export interface LegacyCameraRigProps {
  mode: ReferenceFrame;
  transitionDuration?: number;
}

/**
 * Legacy camera rig for backward compatibility.
 */
export function LegacyCameraRig(_props: LegacyCameraRigProps): null {
  return null;
}
