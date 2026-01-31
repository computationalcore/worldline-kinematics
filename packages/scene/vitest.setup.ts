/**
 * Vitest setup for @worldline-kinematics/scene.
 *
 * Configures jsdom matchers and mocks WebGL context for Three.js testing.
 */
import * as matchers from '@testing-library/jest-dom/matchers';
import { expect } from 'vitest';

expect.extend(matchers);

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// Mock WebGL context for Three.js
class WebGLRenderingContext {}
class WebGL2RenderingContext {}

Object.defineProperty(globalThis, 'WebGLRenderingContext', {
  value: WebGLRenderingContext,
});

Object.defineProperty(globalThis, 'WebGL2RenderingContext', {
  value: WebGL2RenderingContext,
});

// Mock ResizeObserver
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(globalThis, 'ResizeObserver', {
  value: ResizeObserver,
});

// Mock requestAnimationFrame
globalThis.requestAnimationFrame = (callback: FrameRequestCallback) => {
  return setTimeout(() => callback(Date.now()), 16) as unknown as number;
};

globalThis.cancelAnimationFrame = (id: number) => {
  clearTimeout(id);
};
