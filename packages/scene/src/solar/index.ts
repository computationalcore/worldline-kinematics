/**
 * Solar system visualization components.
 *
 * Provides fidelity-aware rendering of the Sun, planets, and orbital elements.
 * Components adapt their visual quality based on the RenderProfile context.
 */

export { Sun } from './Sun';
export { Planet, type PlanetProps, computeBodyQuaternion } from './Planet';
export { SaturnRings, type SaturnRingsProps } from './SaturnRings';

// Future exports:
// export { OrbitPath } from './OrbitPath';
// export { AsteroidBelt } from './AsteroidBelt';
